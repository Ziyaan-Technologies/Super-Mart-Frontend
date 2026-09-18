<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import DashboardStatCard from '@/components/shared/DashboardStatCard.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import { useAuthStore } from '@/stores/auth';
import { can } from '@/utils/permissions';
import { formatDate, formatDateTime, formatMoney, formatNumber, today } from '@/utils/api';

const router = useRouter();
const authStore = useAuthStore();
const loading = ref(true);
const sales = ref<any>({});
const stock = ref<any>({});
const orders = ref<any>({});
const transfers = ref<any>({});
const lowStock = ref<any[]>([]);
const expiring = ref<any[]>([]);
const recentBills = ref<any[]>([]);

const paymentTypes = ['Cash', 'Card', 'Online'];

const quickActions = computed(() => [
  { title: 'Sale Counter', icon: 'mdi-cash-register', to: '/pos', show: can('pos_sell', 'POS') },
  { title: 'Stock In', icon: 'mdi-truck-delivery-outline', to: '/goods-receipts/create', show: can('goods_receipts_create', 'Goods Receipt') },
  { title: 'New Product', icon: 'mdi-package-variant-plus', to: '/products/create', show: can('products_create', 'Product') },
  { title: 'Purchase Order', icon: 'mdi-clipboard-plus-outline', to: '/purchase-orders/create', show: can('purchase_orders_create', 'Purchase Order') },
  { title: 'Transfer Stock', icon: 'mdi-swap-horizontal-bold', to: '/stock-transfers/create', show: can('stock_transfers_create', 'Stock Transfer') },
  { title: 'Count Stock', icon: 'mdi-scale-balance', to: '/stock-adjustments/create', show: can('stock_adjustments_create', 'Stock Adjustment') },
  { title: 'Add User', icon: 'mdi-account-plus-outline', to: '/users', show: can('supervisor_create', 'Supervisor') },
].filter((action) => action.show));

const cards = computed(() => {
  const list: any[] = [];
  if (can('pos_sell', 'POS') || can('sales_view', 'Sales')) {
    list.push({ title: "Today's Sales", value: formatMoney(sales.value.netSales), icon: 'mdi-cash-multiple', comparisonLabel: `${sales.value.bills ?? 0} bills · avg ${formatMoney(sales.value.averageBill)}` });
  }
  if (can('sales_view', 'Sales')) {
    list.push({ title: 'Gross Profit Today', value: formatMoney(sales.value.grossProfit), icon: 'mdi-chart-line', comparisonLabel: `Refunds ${formatMoney(sales.value.refunds)} · Discounts ${formatMoney(sales.value.discounts)}` });
  }
  if (can('stock_view', 'Stock')) {
    list.push({ title: 'Stock Value', value: formatMoney(stock.value.stockValue), icon: 'mdi-warehouse', comparisonLabel: `${stock.value.skuCount ?? 0} items in stock` });
    list.push({ title: 'Low / Out of Stock', value: `${stock.value.lowStock ?? 0} / ${stock.value.outOfStock ?? 0}`, icon: 'mdi-alert-outline', comparisonLabel: 'Need reordering', showInfoIcon: (stock.value.outOfStock ?? 0) > 0 });
    list.push({ title: 'Expiring in 30 Days', value: stock.value.expiringSoon ?? 0, icon: 'mdi-calendar-alert', comparisonLabel: `${stock.value.expired ?? 0} batches already expired`, showInfoIcon: (stock.value.expired ?? 0) > 0 });
  }
  if (can('purchase_orders_view', 'Purchase Order')) {
    list.push({ title: 'Open Purchase Orders', value: orders.value.openOrders ?? 0, icon: 'mdi-truck-delivery-outline', comparisonLabel: `${formatMoney(orders.value.openAmount)} to receive` });
  }
  if (can('stock_transfers_view', 'Stock Transfer')) {
    list.push({ title: 'Transfers in Transit', value: transfers.value.inTransit ?? 0, icon: 'mdi-truck-fast-outline', comparisonLabel: 'Dispatched, not received' });
  }
  return list;
});

const paymentSplit = computed(() => paymentTypes.map((method) => ({
  method,
  amount: (sales.value.payments || []).find((row: any) => row.method === method)?.amount || 0,
})));

const paymentTotal = computed(() => paymentSplit.value.reduce((sum, row) => sum + row.amount, 0));

function paidBy(bill: any) {
  return (bill.payments || []).map((payment: any) => payment.method).join(' + ') || '-';
}

async function safe<T>(enabled: boolean, request: () => Promise<T>, fallback: T): Promise<T> {
  if (!enabled) return fallback;
  try {
    return await request();
  } catch (error) {
    return fallback;
  }
}

async function load() {
  if (!authStore.clientstoreId) {
    loading.value = false;
    return;
  }
  loading.value = true;
  const scope = { clientstore_id: authStore.clientstoreId };
  const day = today();
  const canSales = can('pos_sell', 'POS') || can('sales_view', 'Sales');
  const canStock = can('stock_view', 'Stock');
  [sales.value, stock.value, orders.value, transfers.value, lowStock.value, expiring.value, recentBills.value] = await Promise.all([
    safe(canSales, async () => (await axios.post('pos/sales/v1/kpis', { ...scope, startDate: day, endDate: day })).data, {}),
    safe(canStock, async () => (await axios.post('stock/v1/kpis', scope)).data, {}),
    safe(can('purchase_orders_view', 'Purchase Order'), async () => (await axios.post('purchase-orders/v1/kpis', scope)).data, {}),
    safe(can('stock_transfers_view', 'Stock Transfer'), async () => (await axios.post('stock-transfers/v1/kpis', scope)).data, {}),
    safe(canStock, async () => (await axios.post('stock/v1/list', { ...scope, stock_status: 'low', take: 8, sortBy: 'Quantity Low' })).data.data, []),
    safe(canStock, async () => (await axios.post('stock/v1/expiry', { ...scope, days: 30, take: 8 })).data.data, []),
    safe(canSales, async () => (await axios.post('pos/sales/v1/list', { ...scope, take: 8 })).data.data, []),
  ]);
  loading.value = false;
}

watch(() => authStore.clientstoreId, load);
onMounted(load);
</script>

<template>
  <div v-if="!authStore.clientstoreId">
    <UiParentCard title="Welcome" icon="mdi-store-plus-outline">
      <div class="text-center py-10">
        <v-icon size="56" color="primary">mdi-store-plus-outline</v-icon>
        <h4 class="text-h5 mt-3">No branch selected</h4>
        <p class="text-lightText mt-1 mb-4">Add your first branch to start selling and managing stock.</p>
        <v-btn color="primary" variant="flat" rounded="lg" @click="router.push('/store')">Go to Branches</v-btn>
      </div>
    </UiParentCard>
  </div>

  <template v-else>
    <v-row>
      <v-col v-for="card in cards" :key="card.title" cols="12" sm="6" md="4" lg="3">
        <v-skeleton-loader v-if="loading" type="list-item-two-line" class="border rounded-lg" />
        <DashboardStatCard v-else v-bind="card" />
      </v-col>
    </v-row>

    <div class="mt-5">
      <UiParentCard :title="`Summary · ${authStore.storeName || authStore.client?.vendor?.business_name || ''}`" icon="mdi-view-dashboard-outline">
        <template #action>
          <span class="text-caption text-lightText">{{ formatDate(new Date()) }}</span>
          <v-btn variant="outlined" rounded="lg" size="small" :loading="loading" prepend-icon="mdi-refresh" @click="load">Refresh</v-btn>
        </template>
        <div class="d-flex flex-wrap ga-2">
          <v-btn v-for="action in quickActions" :key="action.to" variant="outlined" color="primary" rounded="lg"
            :prepend-icon="action.icon" class="quick-action" @click="router.push(action.to)">{{ action.title }}</v-btn>
        </div>
      </UiParentCard>
    </div>

    <v-row class="mt-1">
      <v-col v-if="can('pos_sell', 'POS') || can('sales_view', 'Sales')" cols="12">
        <UiParentCard title="Recent Bills" icon="mdi-receipt-text-outline">
          <template #action>
            <v-btn variant="text" color="primary" size="small" @click="router.push(can('sales_view', 'Sales') ? '/sales' : '/pos')">View all</v-btn>
          </template>
          <v-table>
            <thead>
              <tr><th>Bill No</th><th>Time</th><th>Cashier</th><th>Paid By</th><th class="text-right">Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr v-for="bill in recentBills" :key="bill.id" class="cursor-pointer" @click="router.push(`/sales/${bill.id}`)">
                <td class="font-weight-bold text-primary">{{ bill.bill_number }}</td>
                <td>{{ formatDateTime(bill.created_at) }}</td>
                <td>{{ bill.cashier?.full_name }}</td>
                <td>{{ paidBy(bill) }}</td>
                <td class="text-right font-weight-bold">{{ formatMoney(bill.total_amount) }}</td>
                <td><StatusChip :status="bill.status" /></td>
              </tr>
              <tr v-if="!recentBills.length"><td colspan="6" class="text-center text-lightText py-6">No bills yet</td></tr>
            </tbody>
          </v-table>
        </UiParentCard>
      </v-col>

      <v-col v-if="can('sales_view', 'Sales')" cols="12" lg="6">
        <UiParentCard title="Today's Payments" icon="mdi-cash-multiple">
          <v-table>
            <thead><tr><th>Payment Type</th><th class="text-right">Amount</th><th class="text-right">Share</th></tr></thead>
            <tbody>
              <tr v-for="row in paymentSplit" :key="row.method">
                <td class="font-weight-bold">{{ row.method }}</td>
                <td class="text-right">{{ formatMoney(row.amount) }}</td>
                <td class="text-right">{{ paymentTotal ? formatNumber(row.amount * 100 / paymentTotal, 1) : 0 }}%</td>
              </tr>
              <tr>
                <td class="font-weight-bold">Total</td>
                <td class="text-right font-weight-bold">{{ formatMoney(paymentTotal) }}</td>
                <td></td>
              </tr>
            </tbody>
          </v-table>
        </UiParentCard>
      </v-col>

      <v-col v-if="can('stock_view', 'Stock')" cols="12" lg="6">
        <UiParentCard title="Running Low" icon="mdi-alert-outline">
          <template #action>
            <v-btn variant="text" color="primary" size="small" @click="router.push('/stock')">View stock</v-btn>
          </template>
          <v-table>
            <thead><tr><th>Item</th><th class="text-right">On Hand</th><th class="text-right">Reorder At</th></tr></thead>
            <tbody>
              <tr v-for="row in lowStock" :key="row.product_variant_id">
                <td><span class="font-weight-bold">{{ row.product_name }}</span> <span class="text-lightText">{{ row.variant_name }}</span></td>
                <td class="text-right text-error font-weight-bold">{{ formatNumber(row.quantity, 3) }} {{ row.stock_unit }}</td>
                <td class="text-right">{{ formatNumber(row.reorder_level, 3) }}</td>
              </tr>
              <tr v-if="!lowStock.length"><td colspan="3" class="text-center text-lightText py-6">Nothing is running low</td></tr>
            </tbody>
          </v-table>
        </UiParentCard>
      </v-col>

      <v-col v-if="can('stock_view', 'Stock')" cols="12">
        <UiParentCard title="Expiring Soon" icon="mdi-calendar-alert">
          <template #action>
            <v-btn variant="text" color="primary" size="small" @click="router.push('/stock?tab=expiry')">View batches</v-btn>
          </template>
          <v-table>
            <thead><tr><th>Item</th><th>Batch</th><th>Expiry</th><th class="text-right">Qty</th></tr></thead>
            <tbody>
              <tr v-for="batch in expiring" :key="batch.id">
                <td><span class="font-weight-bold">{{ batch.product_variant?.product?.name }}</span> <span class="text-lightText">{{ batch.product_variant?.name }}</span></td>
                <td>{{ batch.batch_number || '-' }}</td>
                <td :class="batch.days_left < 0 ? 'text-error font-weight-bold' : batch.days_left <= 7 ? 'text-orange font-weight-bold' : ''">
                  {{ formatDate(batch.expiry_date) }} ({{ batch.days_left < 0 ? 'expired' : `${batch.days_left}d` }})
                </td>
                <td class="text-right">{{ formatNumber(batch.quantity, 3) }}</td>
              </tr>
              <tr v-if="!expiring.length"><td colspan="4" class="text-center text-lightText py-6">No batches expire in the next 30 days</td></tr>
            </tbody>
          </v-table>
        </UiParentCard>
      </v-col>
    </v-row>
  </template>
</template>

<style scoped>
.quick-action {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
}
</style>
