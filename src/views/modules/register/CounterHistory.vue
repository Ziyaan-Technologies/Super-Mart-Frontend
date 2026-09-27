<script setup lang="ts">
import { ref } from 'vue';
import TableBottom from '@/components/shared/TableBottom.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import RegisterDialog from '@/views/modules/pos/RegisterDialog.vue';
import { useListPage } from '@/composables/useListPage';
import { useAlerts } from '@/composables/useAlerts';
import { formatDateTime, formatMoney } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const props = defineProps<{
  modelValue: boolean;
  counter: any;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const alerts = useAlerts();
const summaryId = ref(0);
const summaryDialog = ref(false);

const list = useListPage('pos/registers', {
  kpis: false,
  listPath: `pos/counters/${props.counter.id}/history`,
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'SESSION', align: 'start', key: 'session_number' },
  { title: 'CASHIER', align: 'start', key: 'cashier' },
  { title: 'OPENED', align: 'start', key: 'opened_at' },
  { title: 'OPENING CASH', align: 'end', key: 'opening_cash' },
  { title: 'CLOSED', align: 'start', key: 'closed_at' },
  { title: 'CLOSING CASH', align: 'end', key: 'closing_cash' },
  { title: 'DIFFERENCE', align: 'end', key: 'cash_difference' },
  { title: 'STATUS', align: 'start', key: 'status' },
  { title: '', key: 'actions', sortable: false },
]);

function view(item: any) {
  summaryId.value = item.id;
  summaryDialog.value = true;
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="1100" scrollable @update:model-value="emit('update:modelValue', $event)">
    <v-card class="ui-modal">
      <div class="ui-modal__header">
        <div>
          <div class="ui-modal__title">{{ counter.name }} History</div>
          <div class="history-subtitle">Opening and closing cash of every session on this counter</div>
        </div>
        <button class="ui-modal__close" type="button" aria-label="Close" @click="emit('update:modelValue', false)">
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>
      <div class="ui-modal__body pb-6">
        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />
        <v-data-table :loading="list.loading.value" :items-per-page="list.itemsPerPage.value" :headers="headers" :items="list.items.value"
          item-value="id" hide-default-footer class="border rounded-md">
          <template v-slot:loading><v-skeleton-loader type="table-row@5"></v-skeleton-loader></template>
          <template v-slot:item.session_number="{ item }"><span class="font-weight-semibold">{{ item.session_number }}</span></template>
          <template v-slot:item.cashier="{ item }">{{ item.cashier?.full_name }}</template>
          <template v-slot:item.opened_at="{ item }">{{ formatDateTime(item.opened_at) }}</template>
          <template v-slot:item.opening_cash="{ item }"><span class="font-weight-semibold">{{ formatMoney(item.opening_cash) }}</span></template>
          <template v-slot:item.closed_at="{ item }">{{ item.closed_at ? formatDateTime(item.closed_at) : '-' }}</template>
          <template v-slot:item.closing_cash="{ item }">
            <span v-if="item.status === 'Closed'" class="font-weight-semibold">{{ formatMoney(item.closing_cash) }}</span>
            <span v-else>-</span>
          </template>
          <template v-slot:item.cash_difference="{ item }">
            <span v-if="item.status === 'Closed'" :class="item.cash_difference < 0 ? 'text-error font-weight-bold' : item.cash_difference > 0 ? 'text-orange font-weight-bold' : 'text-successdark'">{{ formatMoney(item.cash_difference) }}</span>
            <span v-else>-</span>
          </template>
          <template v-slot:item.status="{ item }"><StatusChip :status="item.status" /></template>
          <template v-slot:item.actions="{ item }">
            <v-btn icon="mdi-eye-outline" color="#EFF0F1" size="small" title="View summary" @click="view(item)" />
          </template>
          <template v-slot:no-data><p class="px-2 py-2">This counter has not been opened yet</p></template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </div>
    </v-card>
  </v-dialog>

  <RegisterDialog v-if="summaryId" v-model="summaryDialog" :session-id="summaryId" readonly />
</template>

<style scoped>
.history-subtitle {
  margin-top: 2px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}
</style>
