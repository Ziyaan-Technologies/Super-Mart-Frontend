<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import axios from 'axios';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import BtnOutlined from '@/components/shared/BtnOutlined.vue';
import { useAlerts } from '@/composables/useAlerts';
import { formatDateTime, formatMoney } from '@/utils/api';

const props = defineProps<{
  modelValue: boolean;
  sessionId: number;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'closed', session: any): void;
}>();

const alerts = useAlerts();
const session = ref<any>(null);
const loading = ref(false);
const saving = ref(false);
const closingCash = ref<number | string>('');
const note = ref('');

const isClosed = computed(() => session.value?.status === 'Closed');
const subtitle = computed(() => session.value
  ? [session.value.counter?.name, session.value.session_number, session.value.cashier?.full_name].filter(Boolean).join(' · ')
  : '');
const payment = (method: string) => session.value?.totals.payments.find((row: any) => row.method === method);
const netCollected = (method: string) => (payment(method)?.collected || 0) - (payment(method)?.refunded || 0);
const cashSales = computed(() => (payment('Cash')?.collected || 0) - (session.value?.totals.change_given || 0));
const cashRefunds = computed(() => payment('Cash')?.refunded || 0);
const difference = computed(() => {
  if (closingCash.value === '' || !session.value) return null;
  return Math.round((Number(closingCash.value) - session.value.expected_cash) * 100) / 100;
});

async function load() {
  loading.value = true;
  alerts.clear();
  try {
    session.value = (await axios.get(`pos/registers/${props.sessionId}`)).data;
    closingCash.value = '';
    note.value = '';
  } catch (error) {
    alerts.fail(error);
  } finally {
    loading.value = false;
  }
}

async function close() {
  if (props.readonly || isClosed.value) {
    emit('update:modelValue', false);
    return;
  }
  if (closingCash.value === '' || Number(closingCash.value) < 0) {
    alerts.fail(null, 'Enter the cash counted in the counter');
    return;
  }
  saving.value = true;
  try {
    session.value = (await axios.post(`pos/registers/${props.sessionId}/close`, { closing_cash: Number(closingCash.value), note: note.value || undefined })).data;
    alerts.success('Counter closed');
    emit('closed', session.value);
  } catch (error) {
    alerts.fail(error);
  } finally {
    saving.value = false;
  }
}

// Immediate: pages mount this dialog with v-if already open, so the first open never "changes".
watch(() => props.modelValue, (open) => {
  if (open) load();
}, { immediate: true });
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="560" persistent scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card class="ui-modal register-modal">
      <div class="ui-modal__header">
        <div>
          <div class="ui-modal__title">{{ isClosed || readonly ? 'Counter Summary' : 'Close Counter' }}</div>
          <div v-if="subtitle" class="register-modal__subtitle">{{ subtitle }}</div>
        </div>
        <button class="ui-modal__close" type="button" aria-label="Close" @click="emit('update:modelValue', false)">
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>

      <div class="ui-modal__body">
        <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-3 single-line-alert" />
        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-3 single-line-alert" closable
          @click:close="alerts.clear()" />
        <v-skeleton-loader v-if="loading" type="list-item@6" />
        <template v-else-if="session">
          <div class="register-modal__label">Cash in this counter</div>
          <div class="register-summary">
            <div class="register-summary__row"><span>Opened</span><span>{{ formatDateTime(session.opened_at) }}</span></div>
            <div v-if="isClosed" class="register-summary__row"><span>Closed</span><span>{{ formatDateTime(session.closed_at) }}</span></div>
            <div class="register-summary__row"><span>Opening cash</span><span>{{ formatMoney(session.opening_cash) }}</span></div>
            <div class="register-summary__row">
              <span>Cash sales ({{ session.totals.bills }} {{ session.totals.bills === 1 ? 'bill' : 'bills' }})</span>
              <span>+ {{ formatMoney(cashSales) }}</span>
            </div>
            <div class="register-summary__row">
              <span>Cash refunds ({{ session.totals.returns }} {{ session.totals.returns === 1 ? 'return' : 'returns' }})</span>
              <span>- {{ formatMoney(cashRefunds) }}</span>
            </div>
            <div class="register-summary__row register-summary__row--total">
              <span>Expected in counter</span><span>{{ formatMoney(session.expected_cash) }}</span>
            </div>
            <template v-if="isClosed">
              <div class="register-summary__row"><span>Counted</span><span>{{ formatMoney(session.closing_cash) }}</span></div>
              <div class="register-summary__row font-weight-semibold" :class="session.cash_difference < 0 ? 'text-error' : 'text-successdark'">
                <span>{{ session.cash_difference < 0 ? 'Short' : session.cash_difference > 0 ? 'Over' : 'Balanced' }}</span>
                <span>{{ formatMoney(session.cash_difference) }}</span>
              </div>
            </template>
            <div class="register-summary__row">
              <span>Card / Online (not in counter)</span>
              <span>{{ formatMoney(netCollected('Card')) }} / {{ formatMoney(netCollected('Online')) }}</span>
            </div>
          </div>

          <template v-if="!isClosed && !readonly">
            <v-label class="text-subtitle-1 pb-2 mt-5">Cash counted in counter</v-label>
            <v-text-field v-model="closingCash" type="number" min="0" hide-details autofocus />
            <p v-if="difference !== null" class="mt-2 mb-0 font-weight-semibold" :class="difference < 0 ? 'text-error' : difference > 0 ? 'text-orange' : 'text-successdark'">
              {{ difference === 0 ? 'Counter is balanced' : difference < 0 ? `Short by ${formatMoney(-difference)}` : `Over by ${formatMoney(difference)}` }}
            </p>
            <v-label class="text-subtitle-1 pb-2 mt-4">Note</v-label>
            <v-textarea v-model="note" rows="2" hide-details placeholder="Reason for any difference" />
          </template>
        </template>
      </div>

      <div class="ui-modal__footer">
        <BtnOutlined v-if="!isClosed && !readonly" outline="Cancel" @click="emit('update:modelValue', false)" />
        <BtnFilled :filled="isClosed || readonly ? 'Done' : 'Close Counter'" :loading="saving" @click="close" />
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.register-modal__subtitle {
  margin-top: 2px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.register-modal__label {
  margin-bottom: 8px;
  font-size: 13px;
  color: rgb(var(--v-theme-textPrimary));
}

.register-summary {
  border: 1px solid #e4e7ec;
  border-radius: 10px;
  overflow: hidden;
}

.register-summary__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  font-size: 14px;
}

.register-summary__row + .register-summary__row {
  border-top: 1px solid #e4e7ec;
}

.register-summary__row--total {
  background: rgba(var(--v-theme-primary), 0.08);
  color: rgb(var(--v-theme-primary));
  font-size: 15px;
  font-weight: 700;
}
</style>
