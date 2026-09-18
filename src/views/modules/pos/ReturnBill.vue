<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import DeskDialog from '@/components/shared/DeskDialog.vue';
import DeleteDialog from '@/components/shared/DeleteDialog.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import { useAuthStore } from '@/stores/auth';
import { useAlerts } from '@/composables/useAlerts';
import { formatDateTime, formatMoney, formatNumber } from '@/utils/api';

const props = defineProps<{
  saleId: number;
  active: boolean;
}>();

const emit = defineEmits<{
  (e: 'saved', result: any): void;
  (e: 'cancel'): void;
}>();

const refundMethods = [
  { value: 'Cash', icon: 'mdi-cash-multiple' },
  { value: 'Card', icon: 'mdi-credit-card-outline' },
  { value: 'Online', icon: 'mdi-cellphone-nfc' },
];

const authStore = useAuthStore();
const alerts = useAlerts();

const sale = ref<any>(null);
const loading = ref(false);
const saving = ref(false);
const quantities = ref<Record<number, number>>({});
const refundMethod = ref('Cash');
const reason = ref('');
const reasonInput = ref<any>(null);

const barcode = ref('');
const barcodeInput = ref<any>(null);
const scanning = ref(false);
const tableWrap = ref<HTMLElement | null>(null);
const selectedIndex = ref(-1);

const target = ref<any>(null);
const confirmDialog = ref(false);
const quantityDialog = ref(false);
const quantityValue = ref<number | string>('');
const quantityError = ref('');
const cancelDialog = ref(false);

const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const roundQuantity = (value: number) => Math.round((Number(value) || 0) * 1000) / 1000;

const items = computed<any[]>(() => sale.value?.items || []);
const dialogOpen = computed(() => confirmDialog.value || quantityDialog.value || cancelDialog.value);

const isWhole = (item: any) => Number.isInteger(Number(item.quantity));
const pending = (item: any) => quantities.value[item.id] || 0;
const returnable = (item: any) => roundQuantity(item.quantity - item.returned_quantity);
const remaining = (item: any) => roundQuantity(returnable(item) - pending(item));
const share = (item: any, value: number) => round(item.line_total * value / item.quantity);

const totals = computed(() => {
  const lines = items.value.filter((item) => pending(item) > 0);
  const refund = round(lines.reduce((sum, item) => sum + share(item, pending(item)), 0));
  const tax = round(lines.reduce((sum, item) => sum + item.tax_amount * pending(item) / item.quantity, 0));
  return {
    lines: lines.length,
    quantity: roundQuantity(lines.reduce((sum, item) => sum + pending(item), 0)),
    refund,
    tax,
    excludingTax: round(refund - tax),
  };
});

const selectedItem = computed(() => items.value[selectedIndex.value]);

const functionKeys = computed(() => [
  { key: 'F2', label: 'Barcode', icon: 'mdi-barcode-scan', action: focusScanner, disabled: false, tone: '' },
  { key: 'Del', label: 'Undo Line', icon: 'mdi-undo', action: () => undoLine(selectedItem.value), disabled: !selectedItem.value || !pending(selectedItem.value), tone: '' },
  { key: 'F9', label: 'Save Return', icon: 'mdi-content-save-outline', action: startSave, disabled: !totals.value.lines, tone: '' },
  { key: 'Esc', label: 'Cancel Return', icon: 'mdi-close-circle-outline', action: askCancel, disabled: false, tone: 'desk-fn--red' },
]);

function focusScanner() {
  nextTick(() => barcodeInput.value?.focus());
}

function selectItem(item: any) {
  selectedIndex.value = items.value.indexOf(item);
  nextTick(() => tableWrap.value?.querySelectorAll('tbody tr')[selectedIndex.value]?.scrollIntoView({ block: 'nearest' }));
}

async function load() {
  loading.value = true;
  alerts.clear();
  try {
    const data = (await axios.get(`pos/sales/${props.saleId}`)).data;
    sale.value = data;
    quantities.value = {};
    reason.value = '';
    refundMethod.value = data.payments?.[0]?.method || 'Cash';
    selectedIndex.value = -1;
    if (data.status === 'Returned') alerts.fail(null, `Everything on bill ${data.bill_number} has already been returned`);
    focusScanner();
  } catch (error) {
    alerts.fail(error);
  } finally {
    loading.value = false;
  }
}

async function findLine(code: string) {
  const text = code.toLowerCase();
  const bySku = items.value.filter((item) => (item.sku || '').toLowerCase() === text);
  if (bySku.length) return { lines: bySku, weight: null };
  try {
    const { data } = await axios.get(`pos/scan/${encodeURIComponent(code)}`, { params: { clientstore_id: sale.value.clientstore_id } });
    const lines = items.value.filter((item) => item.product_variant_id === data.variant.id);
    if (!lines.length) {
      alerts.fail(null, `${data.variant.product_name} ${data.variant.name} is not on bill ${sale.value.bill_number}`);
      return null;
    }
    return { lines, weight: data.variant.is_weighted && data.quantity ? Number(data.quantity) : null };
  } catch (error: any) {
    if (error?.response?.status !== 404) {
      alerts.fail(error);
      return null;
    }
  }
  const byName = items.value.filter((item) => `${item.product_name} ${item.variant_name}`.toLowerCase().includes(text));
  if (!byName.length) {
    alerts.fail(null, `"${code}" is not on bill ${sale.value.bill_number}`);
    return null;
  }
  if (new Set(byName.map((item) => item.product_variant_id)).size > 1) {
    alerts.fail(null, `Several items on this bill match "${code}". Scan the barcode or click the line.`);
    return null;
  }
  return { lines: byName, weight: null };
}

async function scan() {
  const code = barcode.value.trim();
  if (!code || !sale.value) return;
  barcode.value = '';
  scanning.value = true;
  try {
    const found = await findLine(code);
    if (!found) return;
    const item = found.lines.find((line) => remaining(line) > 0);
    if (!item) {
      selectItem(found.lines[0]);
      alerts.fail(null, `${found.lines[0].product_name}: nothing left to return on this bill`);
      return;
    }
    askReturn(item, found.weight);
  } finally {
    scanning.value = false;
    if (!dialogOpen.value) focusScanner();
  }
}

function askReturn(item: any, suggested: number | null = null) {
  const left = remaining(item);
  if (left <= 0) return;
  alerts.clear();
  selectItem(item);
  target.value = item;
  if (isWhole(item) && left === 1) {
    confirmDialog.value = true;
    return;
  }
  quantityValue.value = suggested && suggested <= left ? suggested : isWhole(item) ? 1 : left;
  quantityError.value = '';
  quantityDialog.value = true;
}

function addReturn(quantity: number) {
  const item = target.value;
  quantities.value[item.id] = roundQuantity(pending(item) + quantity);
  confirmDialog.value = false;
  quantityDialog.value = false;
  focusScanner();
}

function confirmQuantity() {
  const item = target.value;
  const quantity = roundQuantity(Number(quantityValue.value));
  const left = remaining(item);
  if (quantity <= 0 || (isWhole(item) && !Number.isInteger(quantity))) {
    quantityError.value = 'Enter a valid quantity';
    return;
  }
  if (quantity > left) {
    quantityError.value = `Only ${formatNumber(left, 3)} can be returned`;
    return;
  }
  addReturn(quantity);
}

function undoLine(item: any) {
  if (!item || !pending(item)) return;
  delete quantities.value[item.id];
  focusScanner();
}

function startSave() {
  if (!totals.value.lines) {
    alerts.fail(null, 'Scan the items the customer is returning');
    focusScanner();
    return;
  }
  const element = reasonInput.value?.$el?.querySelector('input');
  if (element && document.activeElement === element) {
    save();
    return;
  }
  element?.focus();
}

async function save() {
  if (!totals.value.lines || saving.value) return;
  saving.value = true;
  const method = refundMethod.value;
  try {
    const result = (await axios.post(`pos/sales/${sale.value.id}/return`, {
      items: items.value.filter((item) => pending(item) > 0).map((item) => ({ sale_item_id: item.id, quantity: pending(item) })),
      refund_method: method,
      reason: reason.value.trim() || 'Customer return',
    })).data;
    emit('saved', { ...result, refund_method: method });
  } catch (error) {
    alerts.fail(error);
    focusScanner();
  } finally {
    saving.value = false;
  }
}

function askCancel() {
  if (totals.value.lines) cancelDialog.value = true;
  else emit('cancel');
}

function onScanKeydown(event: KeyboardEvent) {
  const empty = !barcode.value.trim();
  if (event.key === 'Enter') {
    event.preventDefault();
    if (empty) startSave();
    else scan();
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    if (!items.value.length) return;
    const step = event.key === 'ArrowUp' ? -1 : 1;
    const next = Math.min(Math.max((selectedIndex.value < 0 ? items.value.length : selectedIndex.value) + step, 0), items.value.length - 1);
    selectItem(items.value[next]);
  } else if (empty && event.key === 'Delete') {
    event.preventDefault();
    undoLine(selectedItem.value);
  }
}

function onKeydown(event: KeyboardEvent) {
  if (!props.active || dialogOpen.value || !sale.value) return;
  const actions: Record<string, () => void> = {
    F2: focusScanner,
    F9: startSave,
    Escape: askCancel,
  };
  const action = actions[event.key];
  if (action) {
    event.preventDefault();
    action();
  }
}

watch(() => props.saleId, load);
watch(() => props.active, (value) => value && focusScanner());

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  load();
});

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="return-detail">
    <div class="return-left">
      <div v-if="alerts.showErrorAlert.value">
        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="single-line-alert" closable />
      </div>

      <div class="desk-group return-group">
        <span class="desk-group__legend return-legend">Return Against Bill</span>
        <v-progress-linear v-if="loading" indeterminate color="error" height="2" />
        <div v-if="sale" class="header-info">
          <div style="width: 170px">
            <label class="desk-field-label">Bill No</label>
            <div class="desk-value field-box">{{ sale.bill_number }}</div>
          </div>
          <div style="width: 190px">
            <label class="desk-field-label">Sold On</label>
            <div class="desk-value field-box">{{ formatDateTime(sale.created_at) }}</div>
          </div>
          <div style="width: 120px">
            <label class="desk-field-label">Bill Total</label>
            <div class="desk-value field-box">{{ formatNumber(sale.total_amount, 2) }}</div>
          </div>
          <div class="flex-grow-1" style="min-width: 140px">
            <label class="desk-field-label">Sold By</label>
            <div class="desk-value field-box text-uppercase">{{ sale.cashier?.full_name || '-' }}</div>
          </div>
          <div>
            <label class="desk-field-label">Status</label>
            <div class="field-box"><StatusChip :status="sale.status" /></div>
          </div>
        </div>
      </div>

      <div class="scan-bar">
        <label class="scan-bar__label"><v-icon size="22">mdi-keyboard-return</v-icon>Return Item</label>
        <v-text-field ref="barcodeInput" v-model="barcode" hide-details autofocus :loading="scanning" class="scan-input"
          :disabled="!sale || sale.status === 'Returned'" placeholder="Scan or type the barcode of the item being returned, then Enter"
          @keydown="onScanKeydown" />
      </div>

      <div ref="tableWrap" class="desk-grid-wrap return-grid">
        <v-table fixed-header height="100%" class="return-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 40px">No</th>
              <th style="width: 130px">SKU</th>
              <th>Item Name</th>
              <th class="text-center" style="width: 70px">Sold</th>
              <th class="text-center" style="width: 84px">Returned</th>
              <th class="text-center" style="width: 90px">Return Now</th>
              <th class="text-right" style="width: 92px">Sale Price</th>
              <th class="text-right" style="width: 100px">Refund</th>
              <th style="width: 32px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in items" :key="item.id" class="cursor-pointer"
              :class="{ 'selected-row': index === selectedIndex, 'returning-row': pending(item) > 0, 'done-row': returnable(item) <= 0 }"
              @click="selectItem(item)" @dblclick="askReturn(item)">
              <td class="row-number">{{ index + 1 }}</td>
              <td>{{ item.sku }}</td>
              <td class="font-weight-bold text-truncate text-uppercase">{{ item.product_name }} {{ item.variant_name }}</td>
              <td class="text-center">{{ formatNumber(item.quantity, 3) }}</td>
              <td class="text-center">{{ formatNumber(item.returned_quantity, 3) }}</td>
              <td class="text-center font-weight-bold">{{ pending(item) ? formatNumber(pending(item), 3) : '' }}</td>
              <td class="text-right">{{ formatNumber(item.unit_price, 2) }}</td>
              <td class="text-right font-weight-bold">{{ pending(item) ? formatNumber(share(item, pending(item)), 2) : '' }}</td>
              <td class="text-center">
                <button v-if="pending(item)" type="button" class="line-btn" title="Undo" @click.stop="undoLine(item)"><v-icon size="16">mdi-undo</v-icon></button>
                <button v-else-if="remaining(item) > 0" type="button" class="line-btn line-btn--return" title="Return this item" @click.stop="askReturn(item)">
                  <v-icon size="16">mdi-keyboard-return</v-icon>
                </button>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>

      <div class="desk-group">
        <span class="desk-group__legend">Footer Info</span>
        <div class="footer-info">
          <div><label class="desk-field-label">Lines Returning</label><div class="desk-value">{{ totals.lines }}</div></div>
          <div><label class="desk-field-label">Qty Returning</label><div class="desk-value">{{ formatNumber(totals.quantity, 3) }}</div></div>
          <div><label class="desk-field-label">Refund Excl. Tax</label><div class="desk-value">{{ formatNumber(totals.excludingTax, 2) }}</div></div>
          <div><label class="desk-field-label">G.S.T Value</label><div class="desk-value">{{ formatNumber(totals.tax, 2) }}</div></div>
          <div><label class="desk-field-label">Refund Incl. Tax</label><div class="desk-value">{{ formatNumber(totals.refund, 2) }}</div></div>
        </div>
      </div>
    </div>

    <div class="desk-group total-panel">
      <span class="desk-group__legend return-legend">Refund</span>
      <div class="total-panel__scroll">
        <template v-if="sale">
          <div class="total-row"><span class="desk-label">Bill Total</span><div class="desk-value">{{ formatNumber(sale.total_amount, 2) }}</div></div>
          <div class="total-row"><span class="desk-label">Refunded Before</span><div class="desk-value">{{ formatNumber(sale.refunded_amount, 2) }}</div></div>
          <div class="total-row"><span class="desk-label">G.S.T (incl.)</span><div class="desk-value">{{ formatNumber(totals.tax, 2) }}</div></div>
        </template>

        <div class="refund-value">
          <span class="desk-label">Give Back</span>
          <div class="refund-value__amount">{{ formatMoney(totals.refund) }}</div>
        </div>

        <span class="desk-label d-block mt-2 mb-1">Refund By</span>
        <div class="pay-types">
          <button v-for="method in refundMethods" :key="method.value" type="button" class="pay-type"
            :class="{ 'pay-type--active': refundMethod === method.value }" @click="refundMethod = method.value">
            <v-icon size="22">{{ method.icon }}</v-icon>
            <span>{{ method.value }}</span>
          </button>
        </div>

        <label class="desk-field-label mt-2">Reason (F9)</label>
        <v-text-field ref="reasonInput" v-model="reason" hide-details placeholder="Customer return" @keydown.enter.prevent="save" />
        <p class="text-caption text-lightText mt-1 mb-2">Returned items go back into stock at {{ authStore.storeName }}.</p>

        <button type="button" class="desk-btn desk-btn--danger save-btn" :disabled="!totals.lines || saving" @click="save">
          <v-progress-circular v-if="saving" indeterminate size="16" width="2" color="white" />
          <v-icon v-else size="20">mdi-cash-refund</v-icon>Save Return (F9)
        </button>

        <div v-if="sale?.returns?.length" class="earlier-returns">
          <span class="text-caption font-weight-bold">Earlier returns</span>
          <div v-for="row in sale.returns" :key="row.id" class="text-caption">
            {{ row.return_number }} · {{ formatMoney(row.refund_amount) }} · {{ row.refund_method }}
          </div>
        </div>
      </div>
    </div>

    <div class="function-bar">
      <div class="function-bar__title">Functions</div>
      <button v-for="item in functionKeys" :key="item.label" type="button" class="desk-fn" :class="item.tone" :disabled="item.disabled"
        @click="item.action">
        <v-icon size="22">{{ item.icon }}</v-icon>
        <span class="desk-fn__label">{{ item.label }}</span>
        <span v-if="item.key" class="desk-fn__key">{{ item.key }}</span>
      </button>
    </div>
  </div>

  <DeleteDialog v-model="confirmDialog" message="Return this item?" tone="primary" icon="mdi-keyboard-return" confirm-label="Yes, Return"
    :hint="target ? `${target.product_name} ${target.variant_name} · 1 × ${formatMoney(share(target, 1))}` : ''"
    @confirm="addReturn(1)" @update:model-value="(open: boolean) => !open && focusScanner()" />

  <DeskDialog v-model="quantityDialog" :title="target?.product_name || 'Return Quantity'" icon="mdi-keyboard-return" max-width="400">
    <p class="mb-2">
      {{ target?.variant_name }} · sold {{ formatNumber(target?.quantity, 3) }}, {{ target ? formatNumber(remaining(target), 3) : '' }} can be returned.
      How many is the customer returning?
    </p>
    <v-text-field v-model="quantityValue" type="number" min="0" :step="target && isWhole(target) ? 1 : 0.001" autofocus hide-details
      class="big-input" @keyup.enter="confirmQuantity" />
    <p v-if="quantityError" class="text-caption text-error font-weight-bold mt-1 mb-0">{{ quantityError }}</p>
    <div v-if="target" class="total-row mt-2">
      <span class="desk-label">Refund</span>
      <div class="desk-value">{{ formatMoney(share(target, Number(quantityValue) || 0)) }}</div>
    </div>
    <template #footer>
      <button type="button" class="desk-btn desk-btn--primary" @click="confirmQuantity">Return</button>
      <button type="button" class="desk-btn" @click="quantityDialog = false; focusScanner()">Cancel</button>
    </template>
  </DeskDialog>

  <DeleteDialog v-model="cancelDialog" message="Cancel this return?" hint="The items you scanned will not be returned." confirm-label="Yes, Cancel"
    @confirm="emit('cancel')" />
</template>

<style scoped>
.return-detail {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px 86px;
  gap: 8px;
  padding: 10px 8px 8px;
}

.return-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.return-group {
  border-color: #c62828;
}

.return-legend {
  color: #c62828;
}

.header-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-box {
  min-height: 34px;
  display: flex;
  align-items: center;
}

.scan-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #fdecea;
  border: 1px solid #e8a3a3;
}

.scan-bar__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  color: #9b1c1c;
  white-space: nowrap;
}

.scan-input {
  flex: 1;
}

.scan-input :deep(input),
.big-input :deep(input) {
  font-size: 18px;
  font-weight: 700;
}

.return-grid {
  flex: 1;
  min-height: 220px;
  overflow: hidden;
}

.return-table :deep(td) {
  vertical-align: middle;
}

.row-number {
  width: 40px;
  text-align: center;
  font-weight: 700;
  color: #fff !important;
  background: #4a5566 !important;
}

.return-table tbody tr.returning-row > td {
  background: #fdecea;
  color: #9b1c1c;
}

.return-table tbody tr.done-row > td {
  color: #9aa4b1;
}

.return-table tbody tr.selected-row > td {
  background: #2d3a4b !important;
  color: #fff !important;
}

.return-table tbody tr.selected-row > td.row-number {
  background: #1565c0 !important;
}

.line-btn {
  width: 22px;
  height: 22px;
  border-radius: 2px;
  color: #37474f;
  background: #eceff1;
  border: 1px solid #b0bec5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.line-btn--return {
  color: #c62828;
  background: #fdecea;
  border-color: #e8a3a3;
}

.footer-info {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.total-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-right: 2px;
}

.total-panel__scroll {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.total-panel__scroll > * {
  flex: none;
}

.total-row {
  display: grid;
  grid-template-columns: 96px 1fr;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}

.refund-value {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #9faab8;
}

.refund-value__amount {
  margin-top: 2px;
  padding: 6px 8px;
  text-align: right;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.1;
  color: #c62828;
  background: #fff5f5;
  border: 2px solid #c62828;
  font-variant-numeric: tabular-nums;
}

.pay-types {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.pay-type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 2px;
  font-size: 12px;
  font-weight: 700;
  color: #1f2630;
  border: 1px solid #8795a8;
  border-radius: 3px;
  background: linear-gradient(180deg, #fdfdfe 0%, #e3e8ef 100%);
  cursor: pointer;
}

.pay-type .v-icon {
  color: #1565c0;
}

.pay-type--active {
  color: #fff;
  border-color: #0d4a94;
  background: linear-gradient(180deg, #2a7bd6 0%, #1256a8 100%);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.pay-type--active .v-icon {
  color: #fff;
}

.save-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  margin-top: 2px;
}

.earlier-returns {
  margin-top: 8px;
  padding: 6px 8px;
  background: #fff;
  border: 1px solid #c3ccd8;
}

.function-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  min-height: 0;
}

.function-bar__title {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #0f3460;
}

@media (max-width: 1279px) {
  .return-detail {
    grid-template-columns: minmax(0, 1fr) 280px;
  }

  .return-grid {
    min-height: 360px;
  }

  .function-bar {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  }

  .function-bar__title {
    display: none;
  }
}

@media (max-width: 959px) {
  .return-detail {
    grid-template-columns: 1fr;
  }

  .footer-info {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
