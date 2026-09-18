<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import axios from 'axios';
import DeskDialog from '@/components/shared/DeskDialog.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import { useAlerts } from '@/composables/useAlerts';
import { formatDateTime, formatMoney, formatNumber } from '@/utils/api';

const props = defineProps<{
  modelValue: boolean;
  saleId?: number | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'returned', result: any): void;
}>();

const alerts = useAlerts();
const billNumber = ref('');
const sale = ref<any>(null);
const quantities = ref<Record<number, number | string>>({});
const refundMethod = ref('Cash');
const reason = ref('');
const loading = ref(false);
const saving = ref(false);

const returnable = (item: any) => Math.round((item.quantity - item.returned_quantity) * 1000) / 1000;

const refund = computed(() => {
  if (!sale.value) return 0;
  return Math.round(sale.value.items.reduce((sum: number, item: any) => {
    const qty = Number(quantities.value[item.id]) || 0;
    return sum + (qty > 0 ? item.line_total * qty / item.quantity : 0);
  }, 0) * 100) / 100;
});

async function findSale() {
  if (!billNumber.value.trim()) return;
  loading.value = true;
  alerts.clear();
  try {
    setSale((await axios.get(`pos/sales/lookup/${encodeURIComponent(billNumber.value.trim())}`)).data);
  } catch (error) {
    sale.value = null;
    alerts.fail(error);
  } finally {
    loading.value = false;
  }
}

function setSale(data: any) {
  sale.value = data;
  billNumber.value = data.bill_number;
  quantities.value = Object.fromEntries(data.items.map((item: any) => [item.id, '']));
  refundMethod.value = data.payments?.[0]?.method || 'Cash';
}

async function submit() {
  if (!sale.value) {
    findSale();
    return;
  }
  const items = sale.value.items
    .map((item: any) => ({ sale_item_id: item.id, quantity: Number(quantities.value[item.id]) || 0, item }))
    .filter((row: any) => row.quantity > 0);
  if (!items.length) {
    alerts.fail(null, 'Enter the quantity being returned');
    return;
  }
  const over = items.find((row: any) => row.quantity > returnable(row.item));
  if (over) {
    alerts.fail(null, `${over.item.product_name}: only ${returnable(over.item)} can be returned`);
    return;
  }
  if (!reason.value.trim()) {
    alerts.fail(null, 'Enter the reason for the return');
    return;
  }
  saving.value = true;
  try {
    const result = (await axios.post(`pos/sales/${sale.value.id}/return`, {
      items: items.map((row: any) => ({ sale_item_id: row.sale_item_id, quantity: row.quantity })),
      refund_method: refundMethod.value,
      reason: reason.value.trim(),
    })).data;
    emit('returned', result);
    emit('update:modelValue', false);
  } catch (error) {
    alerts.fail(error);
  } finally {
    saving.value = false;
  }
}

watch(() => props.modelValue, async (open) => {
  if (!open) return;
  alerts.clear();
  sale.value = null;
  billNumber.value = '';
  reason.value = '';
  if (props.saleId) {
    loading.value = true;
    try {
      setSale((await axios.get(`pos/sales/${props.saleId}`)).data);
    } catch (error) {
      alerts.fail(error);
    } finally {
      loading.value = false;
    }
  }
});
</script>

<template>
  <DeskDialog :model-value="modelValue" title="Return Items" icon="mdi-keyboard-return"
    subtitle="Stock goes back to the shelf and the refund is recorded on your counter" max-width="620"
    @update:model-value="emit('update:modelValue', $event)">
    <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-3 single-line-alert" />
    <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-3 single-line-alert" closable
      @click:close="alerts.clear()" />
    <v-label class="text-subtitle-1 pb-2 text-lightText mt-2">Bill Number</v-label>
    <v-text-field v-model="billNumber" placeholder="e.g. MAIN-2609-00001" hide-details append-inner-icon="mdi-magnify"
      :readonly="!!saleId" @click:append-inner="findSale" @keydown.enter.prevent="findSale" />

    <template v-if="sale">
      <div class="d-flex align-center justify-space-between mt-4">
        <div>
          <div class="font-weight-semibold">{{ sale.bill_number }} · {{ formatMoney(sale.total_amount) }}</div>
          <div class="text-caption text-lightText">{{ formatDateTime(sale.created_at) }} · {{ sale.cashier?.full_name }}<span v-if="sale.customer_name"> · {{ sale.customer_name }}</span></div>
        </div>
        <StatusChip :status="sale.status" />
      </div>

      <v-card elevation="0" class="border rounded-md mt-4">
        <v-table density="compact">
          <thead>
            <tr>
              <th>Item</th>
              <th class="text-center">Sold</th>
              <th class="text-center">Can return</th>
              <th style="width: 110px">Return qty</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in sale.items" :key="item.id">
              <td>
                <div class="font-weight-semibold">{{ item.product_name }}</div>
                <div class="text-caption text-lightText">{{ item.variant_name }} · {{ formatMoney(item.line_total) }}</div>
              </td>
              <td class="text-center">{{ formatNumber(item.quantity, 3) }}</td>
              <td class="text-center">{{ formatNumber(returnable(item), 3) }}</td>
              <td>
                <v-text-field v-model="quantities[item.id]" type="number" min="0" :max="returnable(item)" density="compact" hide-details
                  :disabled="returnable(item) <= 0" />
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <v-row class="mt-2">
        <v-col cols="12" sm="6">
          <v-label class="text-subtitle-1 pb-2 text-lightText">Refund Method</v-label>
          <v-select v-model="refundMethod" :items="['Cash', 'Card', 'Online']" hide-details />
        </v-col>
        <v-col cols="12" sm="6">
          <v-label class="text-subtitle-1 pb-2 text-lightText">Reason</v-label>
          <v-text-field v-model="reason" placeholder="Damaged, expired, wrong item..." hide-details />
        </v-col>
      </v-row>

      <div v-if="sale.returns?.length" class="mt-4">
        <h4 class="text-subtitle-1 font-weight-semibold mb-2">Earlier returns</h4>
        <div v-for="row in sale.returns" :key="row.id" class="text-caption text-lightText">
          {{ row.return_number }} · {{ formatDateTime(row.created_at) }} · {{ formatMoney(row.refund_amount) }} by {{ row.processed_by?.full_name }} ({{ row.reason }})
        </div>
      </div>
    </template>
    <template #footer>
      <button type="button" class="desk-btn desk-btn--primary" :disabled="saving || loading" @click="submit">
        <v-progress-circular v-if="saving || loading" indeterminate size="14" width="2" color="white" />
        {{ sale ? `Refund ${formatMoney(refund)}` : 'Find Bill' }}
      </button>
      <button type="button" class="desk-btn" @click="emit('update:modelValue', false)">Cancel</button>
    </template>
  </DeskDialog>
</template>
