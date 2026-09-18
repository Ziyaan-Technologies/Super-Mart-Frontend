<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import DeskDialog from '@/components/shared/DeskDialog.vue';
import { formatMoney, formatNumber } from '@/utils/api';

export interface PaymentLine {
  method: string;
  amount: number;
  reference?: string;
  bank_id?: number;
  bank_name?: string;
}

const props = defineProps<{
  modelValue: boolean;
  total: number;
  saving: boolean;
  error: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'finish', payments: PaymentLine[]): void;
}>();

const methods = [
  { value: 'Cash', icon: 'mdi-cash-multiple', key: 'Alt+1' },
  { value: 'Card', icon: 'mdi-credit-card-outline', key: 'Alt+2' },
  { value: 'Online', icon: 'mdi-cellphone-nfc', key: 'Alt+3' },
];
const quickCash = [10, 50, 100, 500, 1000, 5000];
const keypad = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'C'];

const method = ref('Cash');
const amount = ref('');
const bankId = ref<number | null>(null);
const reference = ref('');
const payments = ref<PaymentLine[]>([]);
const banks = ref<any[]>([]);
const localError = ref('');
const amountInput = ref<any>(null);

const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const amountText = () => String(amount.value ?? '').trim();

const committed = computed(() => round(payments.value.reduce((sum, row) => sum + row.amount, 0)));
const committedNonCash = computed(() => round(payments.value.filter((row) => row.method !== 'Cash').reduce((sum, row) => sum + row.amount, 0)));
const pending = computed(() => round(Number(amountText()) || 0));
const due = computed(() => round(Math.max(props.total - committed.value, 0)));
const paid = computed(() => round(committed.value + pending.value));
const nonCash = computed(() => round(committedNonCash.value + (method.value === 'Cash' ? 0 : pending.value)));
const cashReceived = computed(() => round(paid.value - nonCash.value));
const cashCharged = computed(() => round(Math.min(cashReceived.value, Math.max(props.total - nonCash.value, 0))));
const balance = computed(() => round(Math.max(props.total - paid.value, 0)));
const cashBack = computed(() => round(Math.max(paid.value - props.total, 0)));
const errorText = computed(() => localError.value || props.error);

function focusAmount() {
  nextTick(() => {
    const element = amountInput.value?.$el?.querySelector('input');
    element?.focus();
    element?.select();
  });
}

async function loadBanks() {
  try {
    banks.value = (await axios.get('banks/list')).data;
  } catch (error) {
    banks.value = [];
  }
}

function selectMethod(value: string) {
  method.value = value;
  amount.value = '';
  reference.value = '';
  localError.value = '';
  if (value === 'Card' && !bankId.value && banks.value.length === 1) bankId.value = banks.value[0].id;
  focusAmount();
}

function press(key: string) {
  localError.value = '';
  if (key === 'C') amount.value = '';
  else if (key === '.' && amountText().includes('.')) return;
  else amount.value = `${amountText()}${key}`;
  focusAmount();
}

function addQuickCash(value: number) {
  if (method.value !== 'Cash') selectMethod('Cash');
  amount.value = String(round((Number(amount.value) || 0) + value));
  localError.value = '';
  focusAmount();
}

function commitPending() {
  localError.value = '';
  const value = amountText() === '' ? due.value : pending.value;
  if (!(value > 0)) {
    localError.value = 'Enter the amount';
    return false;
  }
  if (method.value !== 'Cash' && value > due.value) {
    localError.value = `${method.value} payment cannot be more than the balance of ${formatMoney(due.value)}. Only cash can have change.`;
    return false;
  }
  if (method.value === 'Card' && !bankId.value) {
    localError.value = 'Select the bank of the card';
    return false;
  }
  const bank = banks.value.find((row) => row.id === bankId.value);
  payments.value.push({
    method: method.value,
    amount: value,
    reference: method.value === 'Cash' ? undefined : reference.value.trim() || undefined,
    bank_id: method.value === 'Card' ? bank?.id : undefined,
    bank_name: method.value === 'Card' ? bank?.name : undefined,
  });
  amount.value = '';
  reference.value = '';
  if (due.value > 0 && method.value !== 'Cash') method.value = 'Cash';
  focusAmount();
  return true;
}

function onEnter() {
  if (props.saving) return;
  if (amountText() === '' && due.value === 0 && (payments.value.length || props.total === 0)) {
    finish();
    return;
  }
  if (commitPending() && due.value === 0) finish();
}

function removePayment(index: number) {
  payments.value.splice(index, 1);
  localError.value = '';
  focusAmount();
}

function finish() {
  if (props.saving) return;
  if (amountText() !== '' && !commitPending()) return;
  if (due.value > 0) {
    localError.value = `Balance of ${formatMoney(due.value)} is still due`;
    focusAmount();
    return;
  }
  localError.value = '';
  emit('finish', payments.value.length ? payments.value : [{ method: 'Cash', amount: 0 }]);
}

function close() {
  emit('update:modelValue', false);
}

function onKeydown(event: KeyboardEvent) {
  if (!props.modelValue) return;
  if (event.altKey && ['Digit1', 'Digit2', 'Digit3'].includes(event.code)) {
    event.preventDefault();
    selectMethod(methods[Number(event.code.slice(-1)) - 1].value);
  } else if (event.key === 'F10') {
    event.preventDefault();
    finish();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    close();
  }
}

watch(() => props.modelValue, (open) => {
  if (!open) return;
  method.value = 'Cash';
  amount.value = '';
  reference.value = '';
  payments.value = [];
  localError.value = '';
  loadBanks();
  focusAmount();
});

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <DeskDialog :model-value="modelValue" title="Cashier Window" icon="mdi-cash-register" max-width="960" @update:model-value="emit('update:modelValue', $event)">
    <div class="cashier">
      <div class="cashier__main">
        <div class="invoice-info">
          <div>
            <span class="big-label big-label--green">Net Total</span>
            <div class="big-box big-box--green">{{ formatNumber(total, 2) }}</div>
          </div>
          <div>
            <span class="big-label big-label--red">Invoice Balance</span>
            <div class="big-box big-box--red">{{ formatNumber(balance, 2) }}</div>
          </div>
        </div>

        <div class="desk-group">
          <span class="desk-group__legend">Cash Received / Cash Charge Info</span>
          <div class="charge-rows">
            <template v-if="method !== 'Cash'">
              <span class="big-label">{{ method }} Amount</span>
              <v-text-field ref="amountInput" v-model="amount" type="number" min="0" hide-details class="big-input"
                :placeholder="formatNumber(due, 2)" @keydown.enter.prevent="onEnter" />
              <span />
              <div class="method-extra">
                <v-select v-if="method === 'Card'" v-model="bankId" :items="banks" item-title="name" item-value="id" hide-details
                  placeholder="Select bank" :no-data-text="'No banks yet. The owner can add them under Setup > Banks.'" @update:model-value="focusAmount" />
                <v-text-field v-model="reference" hide-details :placeholder="method === 'Card' ? 'Approval / last 4 (optional)' : 'Txn ID'"
                  @keydown.enter.prevent="onEnter" />
              </div>
            </template>

            <span class="big-label big-label--red">Cash Received:</span>
            <v-text-field v-if="method === 'Cash'" ref="amountInput" v-model="amount" type="number" min="0" hide-details class="big-input big-input--red"
              :placeholder="formatNumber(due, 2)" @keydown.enter.prevent="onEnter" />
            <div v-else class="big-box big-box--red">{{ formatNumber(cashReceived, 2) }}</div>

            <span class="big-label big-label--green">Cash Charged:</span>
            <div class="big-box big-box--green">{{ formatNumber(cashCharged, 2) }}</div>

            <span class="big-label big-label--red">Cash Back:</span>
            <div class="big-box big-box--red big-box--back">{{ formatNumber(cashBack, 2) }}</div>
          </div>
          <p v-if="errorText" class="error-line">{{ errorText }}</p>
        </div>

        <div v-if="payments.length" class="desk-group payment-detail">
          <span class="desk-group__legend">Payment Detail</span>
          <div class="desk-grid-wrap">
            <v-table density="compact" class="pick-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Bank / Txn</th>
                  <th class="text-right">Amount</th>
                  <th style="width: 32px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in payments" :key="index">
                  <td class="font-weight-bold">{{ row.method }}</td>
                  <td>{{ [row.bank_name, row.reference].filter(Boolean).join(' · ') || '-' }}</td>
                  <td class="text-right font-weight-bold">{{ formatNumber(row.amount, 2) }}</td>
                  <td class="text-center">
                    <button type="button" class="remove-btn" title="Remove" @click="removePayment(index)"><v-icon size="16">mdi-close</v-icon></button>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </div>
      </div>

      <div class="cashier__side">
        <div class="desk-group">
          <span class="desk-group__legend">Quick Cash</span>
          <div class="pad-grid">
            <button v-for="value in quickCash" :key="value" type="button" class="pad-btn" @click="addQuickCash(value)">{{ value }}</button>
          </div>
        </div>
        <div class="desk-group">
          <span class="desk-group__legend">Numeric Key Pad</span>
          <div class="pad-grid">
            <button v-for="key in keypad" :key="key" type="button" class="pad-btn" :class="{ 'pad-btn--clear': key === 'C' }" @click="press(key)">{{ key }}</button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="short-keys">
        <button v-for="item in methods" :key="item.value" type="button" class="short-key" :class="{ 'short-key--active': method === item.value }"
          @click="selectMethod(item.value)">
          <small>{{ item.key }}</small>
          <span><v-icon size="14">{{ item.icon }}</v-icon>{{ item.value }}</span>
        </button>
        <span class="short-keys__spacer" />
        <button type="button" class="short-key" :disabled="saving" @click="close">
          <small>Esc</small>
          <span>Back</span>
        </button>
        <button type="button" class="short-key short-key--finish" :disabled="saving || balance > 0" @click="finish">
          <small>F10</small>
          <span>
            <v-progress-circular v-if="saving" indeterminate size="12" width="2" />
            <v-icon v-else size="14">mdi-check-bold</v-icon>Finish
          </span>
        </button>
      </div>
    </template>
  </DeskDialog>
</template>

<style scoped>
.cashier {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  gap: 12px;
}

.cashier__main,
.cashier__side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.invoice-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.big-label {
  font-size: 20px;
  font-weight: 800;
  color: #1f2630;
  white-space: nowrap;
}

.big-label--green {
  color: #1b7f3b;
}

.big-label--red {
  color: #c62828;
}

.big-box {
  padding: 4px 12px;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  font-size: 32px;
  font-weight: 800;
  line-height: 1.1;
  background: #fff;
  border: 2px solid #9faab8;
  font-variant-numeric: tabular-nums;
}

.big-box--green {
  color: #1b7f3b;
}

.big-box--red {
  color: #c62828;
}

.big-box--back {
  background: #fffde7;
  border-color: #c62828;
}

.charge-rows {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  align-items: center;
  gap: 8px 12px;
}

.method-extra {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.big-input :deep(.v-field) {
  --v-field-input-padding-top: 0;
  --v-field-input-padding-bottom: 0;
  min-height: 60px;
  border: 2px solid #1565c0;
}

.big-input :deep(.v-field input.v-field__input) {
  min-height: 56px;
  padding-right: 12px;
  font-size: 32px;
  font-weight: 800;
  line-height: 1.1;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.big-input--red :deep(.v-field input.v-field__input) {
  color: #c62828;
}

.big-input :deep(input[type="number"]::-webkit-inner-spin-button),
.big-input :deep(input[type="number"]::-webkit-outer-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

.error-line {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 700;
  color: #c62828;
}

.payment-detail .desk-grid-wrap {
  max-height: 120px;
  overflow-y: auto;
}

.remove-btn {
  width: 22px;
  height: 22px;
  border-radius: 2px;
  color: #c62828;
  background: #fdecea;
  border: 1px solid #e8a3a3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.pad-btn {
  height: 56px;
  font-size: 20px;
  font-weight: 700;
  color: #1f2630;
  border: 1px solid #8795a8;
  border-radius: 3px;
  background: linear-gradient(180deg, #fdfdfe 0%, #e3e8ef 100%);
  cursor: pointer;
}

.pad-btn:active {
  background: #d5dde8;
}

.pad-btn--clear {
  color: #c62828;
}

.short-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  width: 100%;
}

.short-keys__spacer {
  flex: 1;
}

.short-key {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 78px;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 700;
  color: #1f2630;
  border: 1px solid #8795a8;
  border-radius: 3px;
  background: linear-gradient(180deg, #fdfdfe 0%, #e3e8ef 100%);
  cursor: pointer;
}

.short-key small {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.7;
}

.short-key span {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.short-key--active {
  color: #fff;
  border-color: #0d4a94;
  background: linear-gradient(180deg, #2a7bd6 0%, #1256a8 100%);
}

.short-key--finish {
  color: #fff;
  border-color: #146c2e;
  background: linear-gradient(180deg, #2e9d4f 0%, #1b7f3b 100%);
}

.short-key:disabled {
  opacity: 0.5;
  cursor: default;
}

@media (max-width: 959px) {
  .cashier {
    grid-template-columns: 1fr;
  }

  .charge-rows {
    grid-template-columns: 1fr;
  }

  .method-extra {
    grid-template-columns: 1fr;
  }
}
</style>
