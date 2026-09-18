<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import axios from 'axios';
import DeskDialog from '@/components/shared/DeskDialog.vue';
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
    alerts.fail(null, 'Enter the cash counted in the drawer');
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

watch(() => props.modelValue, (open) => {
  if (open) load();
});
</script>

<template>
  <DeskDialog :model-value="modelValue" :title="isClosed || readonly ? 'Counter Summary' : 'Close Counter'" icon="mdi-lock-outline"
    :subtitle="session ? `${session.session_number} · ${session.cashier?.full_name || ''}` : ''" max-width="560"
    @update:model-value="emit('update:modelValue', $event)">
    <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-3 single-line-alert" />
    <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-3 single-line-alert" closable
      @click:close="alerts.clear()" />
    <v-skeleton-loader v-if="loading" type="list-item@6" />
    <template v-else-if="session">
      <v-row class="mt-1">
        <v-col cols="6"><div class="text-caption text-lightText">Branch</div><div class="font-weight-semibold">{{ session.clientstore?.store_name }}</div></v-col>
        <v-col cols="6"><div class="text-caption text-lightText">Status</div><div class="font-weight-semibold">{{ session.status }}</div></v-col>
        <v-col cols="6"><div class="text-caption text-lightText">Opened</div><div class="font-weight-semibold">{{ formatDateTime(session.opened_at) }}</div></v-col>
        <v-col cols="6"><div class="text-caption text-lightText">Closed</div><div class="font-weight-semibold">{{ formatDateTime(session.closed_at) }}</div></v-col>
      </v-row>

      <v-card elevation="0" class="border rounded-md mt-4">
        <v-table density="compact">
          <tbody>
            <tr><td>Bills</td><td class="text-right font-weight-semibold">{{ session.totals.bills }}</td></tr>
            <tr><td>Sales total</td><td class="text-right font-weight-semibold">{{ formatMoney(session.totals.sales_total) }}</td></tr>
            <tr><td>Discounts given</td><td class="text-right">{{ formatMoney(session.totals.discounts) }}</td></tr>
            <tr v-for="row in session.totals.payments.filter((payment: any) => payment.collected || payment.refunded)" :key="row.method">
              <td>{{ row.method }}</td>
              <td class="text-right">{{ formatMoney(row.collected) }}<span v-if="row.refunded" class="text-error"> (−{{ formatMoney(row.refunded) }} refunds)</span></td>
            </tr>
            <tr><td>Change given</td><td class="text-right">−{{ formatMoney(session.totals.change_given) }}</td></tr>
            <tr><td>Returns</td><td class="text-right">{{ session.totals.returns }} · {{ formatMoney(session.totals.refunds_total) }}</td></tr>
          </tbody>
        </v-table>
      </v-card>

      <div class="bg-grey100 rounded-md pa-4 mt-4">
        <div class="d-flex justify-space-between"><span>Opening cash</span><span>{{ formatMoney(session.opening_cash) }}</span></div>
        <div class="d-flex justify-space-between"><span>Net cash from sales</span><span>{{ formatMoney(session.totals.net_cash) }}</span></div>
        <div class="d-flex justify-space-between text-h6 font-weight-bold mt-2"><span>Expected in drawer</span><span>{{ formatMoney(session.expected_cash) }}</span></div>
        <template v-if="isClosed">
          <div class="d-flex justify-space-between mt-1"><span>Counted</span><span>{{ formatMoney(session.closing_cash) }}</span></div>
          <div class="d-flex justify-space-between font-weight-bold" :class="session.cash_difference < 0 ? 'text-error' : 'text-successdark'">
            <span>{{ session.cash_difference < 0 ? 'Short' : session.cash_difference > 0 ? 'Over' : 'Balanced' }}</span>
            <span>{{ formatMoney(session.cash_difference) }}</span>
          </div>
        </template>
      </div>

      <template v-if="!isClosed && !readonly">
        <v-label class="text-subtitle-1 pb-2 text-lightText mt-4">Cash counted in drawer</v-label>
        <v-text-field v-model="closingCash" type="number" min="0" hide-details autofocus />
        <p v-if="difference !== null" class="mt-2 font-weight-semibold" :class="difference < 0 ? 'text-error' : difference > 0 ? 'text-orange' : 'text-successdark'">
          {{ difference === 0 ? 'Drawer is balanced' : difference < 0 ? `Short by ${formatMoney(-difference)}` : `Over by ${formatMoney(difference)}` }}
        </p>
        <v-label class="text-subtitle-1 pb-2 text-lightText mt-4">Note</v-label>
        <v-textarea v-model="note" rows="2" hide-details placeholder="Reason for any difference" />
      </template>
    </template>
    <template #footer>
      <button type="button" class="desk-btn desk-btn--primary" :disabled="saving" @click="close">
        <v-progress-circular v-if="saving" indeterminate size="14" width="2" color="white" />
        {{ isClosed || readonly ? 'Done' : 'Close Counter' }}
      </button>
      <button type="button" class="desk-btn" @click="emit('update:modelValue', false)">Cancel</button>
    </template>
  </DeskDialog>
</template>
