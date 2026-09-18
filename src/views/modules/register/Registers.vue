<script setup lang="ts">
import { ref } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import ListToolbar from '@/components/shared/ListToolbar.vue';
import TableBottom from '@/components/shared/TableBottom.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import RegisterDialog from '@/views/modules/pos/RegisterDialog.vue';
import { useListPage } from '@/composables/useListPage';
import { useAlerts } from '@/composables/useAlerts';
import { formatDateTime, formatMoney } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const alerts = useAlerts();
const status = ref<string | null>(null);
const dialog = ref(false);
const selectedId = ref<number>(0);

const list = useListPage('pos/registers', {
  kpis: false,
  storeScoped: true,
  filters: () => ({ status: status.value || undefined }),
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'REGISTER', align: 'start', key: 'session_number' },
  { title: 'CASHIER', align: 'start', key: 'cashier' },
  { title: 'OPENED', align: 'start', key: 'opened_at' },
  { title: 'CLOSED', align: 'start', key: 'closed_at' },
  { title: 'BILLS', align: 'start', key: 'bills' },
  { title: 'SALES', align: 'start', key: 'sales' },
  { title: 'EXPECTED CASH', align: 'start', key: 'expected_cash' },
  { title: 'DIFFERENCE', align: 'start', key: 'cash_difference' },
  { title: 'STATUS', align: 'start', key: 'status' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

function open(item: any) {
  selectedId.value = item.id;
  dialog.value = true;
}
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Counters" icon="mdi-counter">
        <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-4 single-line-alert" closable />
        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />

        <ListToolbar :total="list.totalItems.value" label="Counter sessions" search-placeholder="Search counter or cashier..." @search="list.onSearch">
          <template #filters>
            <div>
              <v-select v-model="status" :items="['Open', 'Closed']" placeholder="All statuses" clearable hide-details density="comfortable" @update:model-value="list.reload()" />
            </div>
          </template>
        </ListToolbar>

        <v-data-table :loading="list.loading.value" :items-per-page="list.itemsPerPage.value" :headers="headers" :items="list.items.value"
          item-value="id" hide-default-footer class="border rounded-md">
          <template v-slot:loading><v-skeleton-loader type="table-row@10"></v-skeleton-loader></template>
          <template v-slot:item.session_number="{ item }"><span class="font-weight-semibold">{{ item.session_number }}</span></template>
          <template v-slot:item.cashier="{ item }">{{ item.cashier?.full_name }}</template>
          <template v-slot:item.opened_at="{ item }">{{ formatDateTime(item.opened_at) }}</template>
          <template v-slot:item.closed_at="{ item }">{{ formatDateTime(item.closed_at) }}</template>
          <template v-slot:item.bills="{ item }">{{ item.totals.bills }}</template>
          <template v-slot:item.sales="{ item }">{{ formatMoney(item.totals.sales_total) }}</template>
          <template v-slot:item.expected_cash="{ item }">{{ formatMoney(item.status === 'Closed' ? item.expected_cash : item.opening_cash + item.totals.net_cash) }}</template>
          <template v-slot:item.cash_difference="{ item }">
            <span v-if="item.status === 'Closed'" :class="item.cash_difference < 0 ? 'text-error font-weight-bold' : item.cash_difference > 0 ? 'text-orange font-weight-bold' : 'text-successdark'">{{ formatMoney(item.cash_difference) }}</span>
            <span v-else>-</span>
          </template>
          <template v-slot:item.status="{ item }"><StatusChip :status="item.status" /></template>
          <template v-slot:item.actions="{ item }">
            <v-btn :icon="item.status === 'Open' ? 'mdi-lock-outline' : 'mdi-eye-outline'" :color="item.status === 'Open' ? '#FFEFEF' : '#EFF0F1'" size="small"
              :class="item.status === 'Open' ? 'text-error' : ''" :title="item.status === 'Open' ? 'Close counter' : 'View summary'" @click="open(item)" />
          </template>
          <template v-slot:no-data><p class="px-2 py-2">No counter sessions yet</p></template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <RegisterDialog v-if="selectedId" v-model="dialog" :session-id="selectedId" @closed="alerts.success('Counter closed'); list.refresh()" />
</template>
