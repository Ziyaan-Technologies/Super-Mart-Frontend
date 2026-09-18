<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import DashboardStatCard from '@/components/shared/DashboardStatCard.vue';
import DatePickerRange from '@/components/shared/DatePickerRange.vue';
import ListToolbar from '@/components/shared/ListToolbar.vue';
import TableBottom from '@/components/shared/TableBottom.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import ReceiptButtons from '@/components/shared/ReceiptButtons.vue';
import ReturnDialog from '@/views/modules/pos/ReturnDialog.vue';
import { useListPage } from '@/composables/useListPage';
import { useAlerts } from '@/composables/useAlerts';
import { can } from '@/utils/permissions';
import { formatDateTime, formatMoney, formatNumber } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const router = useRouter();
const alerts = useAlerts();
const status = ref<string | null>(null);
const dates = ref({ startDate: '', endDate: '' });
const returnDialog = ref(false);
const returnSaleId = ref<number | null>(null);

const list = useListPage('pos/sales', {
  storeScoped: true,
  exportName: 'Sales',
  filters: () => ({
    status: status.value || undefined,
    startDate: dates.value.startDate || undefined,
    endDate: dates.value.endDate || dates.value.startDate || undefined,
  }),
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'BILL NO', align: 'start', key: 'bill_number' },
  { title: 'DATE', align: 'start', key: 'created_at' },
  { title: 'CASHIER', align: 'start', key: 'cashier' },
  { title: 'CUSTOMER', align: 'start', key: 'customer_name' },
  { title: 'ITEMS', align: 'start', key: 'item_count' },
  { title: 'TOTAL', align: 'start', key: 'total_amount' },
  { title: 'REFUNDED', align: 'start', key: 'refunded_amount' },
  { title: 'STATUS', align: 'start', key: 'status' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

const cards = computed(() => [
  { title: 'Net Sales', value: formatMoney(list.kpis.value.netSales), icon: 'mdi-cash-multiple', showInfoIcon: false, comparisonLabel: `${list.kpis.value.bills ?? 0} bills` },
  { title: 'Average Bill', value: formatMoney(list.kpis.value.averageBill), icon: 'mdi-receipt-text-outline', showInfoIcon: false, comparisonLabel: `${formatNumber(list.kpis.value.itemsSold, 2)} units sold` },
  { title: 'Refunds', value: formatMoney(list.kpis.value.refunds), icon: 'mdi-cash-refund', showInfoIcon: false, comparisonLabel: `Discounts ${formatMoney(list.kpis.value.discounts)}` },
  { title: 'Gross Profit', value: list.kpis.value.grossProfit === null ? 'Hidden' : formatMoney(list.kpis.value.grossProfit), icon: 'mdi-chart-line', showInfoIcon: false, comparisonLabel: `Tax ${formatMoney(list.kpis.value.tax)}` },
]);

function onDates(value: { startDate: string; endDate: string }) {
  dates.value = value;
  if (!value.startDate || value.endDate) list.reload();
}

function openReturn(id: number) {
  returnSaleId.value = id;
  returnDialog.value = true;
}
</script>

<template>
  <v-row>
    <v-col v-for="card in cards" :key="card.title" cols="12" sm="6" lg="3">
      <DashboardStatCard v-bind="card" />
    </v-col>
    <v-col cols="12">
      <UiParentCard title="Sales List" icon="mdi-receipt-text-outline">
        <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-4 single-line-alert" closable />
        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />

        <ListToolbar :total="list.totalItems.value" label="Total bills" search-placeholder="Search bill no, customer name or phone..."
          exportable :exporting="list.exporting.value" @search="list.onSearch" @export="list.exportFile">
          <template #filters>
            <div>
              <v-select v-model="status" :items="['Completed', 'Partially Returned', 'Returned']" placeholder="All statuses" clearable hide-details density="comfortable" @update:model-value="list.reload()" />
            </div>
            <div>
              <DatePickerRange @update:selectedDates="onDates" />
            </div>
          </template>
        </ListToolbar>

        <v-data-table :loading="list.loading.value" :items-per-page="list.itemsPerPage.value" :headers="headers" :items="list.items.value"
          item-value="id" hide-default-footer class="border rounded-md">
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@10"></v-skeleton-loader>
          </template>
          <template v-slot:item.bill_number="{ item }">
            <router-link :to="`/sales/${item.id}`" class="text-primary font-weight-semibold text-decoration-none">{{ item.bill_number }}</router-link>
          </template>
          <template v-slot:item.created_at="{ item }">{{ formatDateTime(item.created_at) }}</template>
          <template v-slot:item.cashier="{ item }">{{ item.cashier?.full_name }}</template>
          <template v-slot:item.customer_name="{ item }">
            <div>{{ item.customer_name || 'Walk-in' }}</div>
            <div class="text-caption text-lightText">{{ item.customer_phone }}</div>
          </template>
          <template v-slot:item.item_count="{ item }">{{ formatNumber(item.item_count, 3) }}</template>
          <template v-slot:item.total_amount="{ item }"><span class="font-weight-semibold">{{ formatMoney(item.total_amount) }}</span></template>
          <template v-slot:item.refunded_amount="{ item }"><span :class="item.refunded_amount > 0 ? 'text-error' : ''">{{ item.refunded_amount > 0 ? formatMoney(item.refunded_amount) : '-' }}</span></template>
          <template v-slot:item.status="{ item }"><StatusChip :status="item.status" /></template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center ga-1">
              <v-btn icon="mdi-eye-outline" color="#EFF0F1" size="small" @click="router.push(`/sales/${item.id}`)" />
              <ReceiptButtons :sale-id="item.id" :bill-number="item.bill_number" @error="(error: any) => alerts.fail(error)" />
              <v-btn v-if="can('pos_return', 'POS') && item.status !== 'Returned'" icon="mdi-keyboard-return" color="#FFEFEF" size="small" class="text-error" title="Return" @click="openReturn(item.id)" />
            </div>
          </template>
          <template v-slot:no-data>
            <p class="px-2 py-2">No bills found</p>
          </template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <ReturnDialog v-model="returnDialog" :sale-id="returnSaleId" @returned="alerts.success('Return processed'); list.refresh()" />
</template>
