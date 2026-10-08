<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import DashboardStatCard from '@/components/shared/DashboardStatCard.vue';
import ListToolbar from '@/components/shared/ListToolbar.vue';
import TableBottom from '@/components/shared/TableBottom.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import { useListPage } from '@/composables/useListPage';
import { useAlerts } from '@/composables/useAlerts';
import { useLookups } from '@/composables/useLookups';
import { useLocations } from '@/composables/useLocations';
import { useAuthStore } from '@/stores/auth';
import axios from 'axios';
import { can } from '@/utils/permissions';
import { formatDate, formatDateTime, formatMoney, formatNumber } from '@/utils/api';
import { escapeHtml, printDocument } from '@/utils/print';
import type { Header } from '@/models/type-interfaces';

const route = useRoute();
const router = useRouter();
const alerts = useAlerts();
const lookups = useLookups();
const locations = useLocations();
const authStore = useAuthStore();
const hasWarehouse = locations.hasWarehouse;
const tab = ref(route.query.tab === 'expiry' ? 'expiry' : 'stock');
const categoryId = ref<number | null>(null);
const brandId = ref<number | null>(null);
const stockStatus = ref<string | null>(null);
const sortBy = ref('Name');
const expiryDays = ref(60);

const statusOptions = [
  { title: 'In stock', value: 'in' },
  { title: 'Low stock (Mart / Warehouse)', value: 'needs_stock' },
  { title: 'Low stock (total only)', value: 'low' },
  { title: 'Out of stock', value: 'out' },
  { title: 'Refill Mart', value: 'refill' },
];
const sortOptions = ['Name', 'Quantity Low', 'Quantity High', 'Newest', 'Oldest'];

const list = useListPage('stock', {
  exportName: 'Stock',
  storeScoped: true,
  immediate: false,
  filters: () => ({
    // With a warehouse, show every location side by side instead of only the selected branch.
    ...(hasWarehouse.value ? { clientstore_id: undefined } : {}),
    category_id: categoryId.value || undefined,
    brand_id: brandId.value || undefined,
    stock_status: stockStatus.value || undefined,
    sortBy: sortBy.value,
  }),
  onError: (error) => alerts.fail(error),
});

const expiry = useListPage('stock', {
  listPath: 'stock/v1/expiry',
  kpis: false,
  immediate: false,
  storeScoped: true,
  filters: () => ({ days: expiryDays.value }),
  onError: (error) => alerts.fail(error),
});

const headers = computed<Header[]>(() => [
  { title: 'PRODUCT', align: 'start', key: 'product_name' },
  { title: 'SKU', align: 'start', key: 'sku' },
  { title: 'CATEGORY', align: 'start', key: 'category_name' },
  ...(hasWarehouse.value
    ? [
      { title: (locations.warehouse.value?.store_name || 'Warehouse').toUpperCase(), align: 'start', key: 'warehouse_quantity' },
      { title: (locations.mart.value?.store_name || 'Mart').toUpperCase(), align: 'start', key: 'mart_quantity' },
      { title: 'TOTAL', align: 'start', key: 'quantity' },
      { title: 'MART MIN', align: 'start', key: 'mart_min_level' },
    ] as Header[]
    : [{ title: 'ON HAND', align: 'start', key: 'quantity' }] as Header[]),
  { title: 'REORDER AT', align: 'start', key: 'reorder_level' },
  { title: 'AVG COST', align: 'start', key: 'average_cost' },
  { title: 'SALE PRICE', align: 'start', key: 'sale_price' },
  { title: 'VALUE', align: 'start', key: 'stock_value' },
  { title: 'STATUS', align: 'start', key: 'stock_status' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

const lowOnly = computed(() => stockStatus.value === 'needs_stock');

function toggleLowOnly() {
  stockStatus.value = lowOnly.value ? null : 'needs_stock';
  list.reload();
}

const printing = ref(false);

// What has to happen for a row: buy more, move stock from the warehouse to the Mart, or both.
function stockAction(item: any) {
  const actions: string[] = [];
  if (item.quantity <= item.reorder_level) actions.push(item.quantity <= 0 ? 'Out - Buy' : 'Buy');
  if (hasWarehouse.value && item.mart_min_level > 0 && item.mart_quantity <= item.mart_min_level) {
    actions.push(item.warehouse_quantity > 0 ? `Move ${formatNumber(item.refill_quantity, 3)} to Mart` : 'Mart low');
  }
  return actions.join(', ') || 'OK';
}

function stockReportDocument(rows: any[], title: string) {
  const warehouseName = locations.warehouse.value?.store_name || 'Warehouse';
  const martName = locations.mart.value?.store_name || 'Mart';
  const columns = hasWarehouse.value
    ? ['#', 'Product', 'SKU', warehouseName, martName, 'Total', 'Reorder At', 'Mart Min', 'Action', 'Order Qty']
    : ['#', 'Product', 'SKU', 'On Hand', 'Reorder At', 'Action', 'Order Qty'];
  const qty = (value: number, low = false) => `<td class="num${low ? ' low' : ''}">${formatNumber(value, 3)}</td>`;
  const body = rows.map((item, index) => {
    const variant = item.variant_name && item.variant_name.toLowerCase() !== 'standard' ? `<div class="sub">${escapeHtml(item.variant_name)}</div>` : '';
    const totalLow = item.quantity <= item.reorder_level;
    const martLow = item.mart_min_level > 0 && item.mart_quantity <= item.mart_min_level;
    const cells = hasWarehouse.value
      ? [qty(item.warehouse_quantity), qty(item.mart_quantity, martLow), qty(item.quantity, totalLow), qty(item.reorder_level), `<td class="num">${item.mart_min_level ? formatNumber(item.mart_min_level, 3) : '-'}</td>`]
      : [qty(item.quantity, totalLow), qty(item.reorder_level)];
    return `<tr>
      <td class="num">${index + 1}</td>
      <td>${escapeHtml(item.product_name || '')}${variant}</td>
      <td>${escapeHtml(item.sku || '')}</td>
      ${cells.join('')}
      <td>${escapeHtml(stockAction(item))}</td>
      <td class="blank"></td>
    </tr>`;
  }).join('');
  const business = authStore.client?.vendor?.business_name || '';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page { size: A4 portrait; margin: 12mm 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 2mm; margin-bottom: 3mm; }
    h1 { font-size: 14pt; margin: 0; }
    .meta { font-size: 8pt; text-align: right; }
    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border: 1px solid #999; padding: 1.2mm 1.5mm; text-align: left; vertical-align: top; }
    th { background: #eee; font-size: 8pt; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .num { text-align: right; white-space: nowrap; }
    .low { font-weight: 700; }
    .sub { font-size: 7.5pt; color: #444; }
    .blank { width: 18mm; }
    .empty { text-align: center; padding: 6mm; }
  </style></head><body>
    <header>
      <div><h1>${escapeHtml(title)}</h1>${business ? `<div>${escapeHtml(business)}</div>` : ''}</div>
      <div class="meta">${formatDateTime(new Date())}<br>${rows.length} ${rows.length === 1 ? 'item' : 'items'}</div>
    </header>
    <table>
      <thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead>
      <tbody>${body || `<tr><td class="empty" colspan="${columns.length}">Nothing to show</td></tr>`}</tbody>
    </table>
  </body></html>`;
}

// Prints on A4 every row matching the filters (not just the visible page). lowStock forces the low stock filter.
async function printStock(lowStock: boolean) {
  printing.value = true;
  try {
    const status = lowStock ? 'needs_stock' : stockStatus.value;
    const response = await axios.post('stock/v1/list', { ...list.payload(), stock_status: status || undefined, page: 1, take: 10000 });
    const title = status === 'needs_stock' ? 'Low Stock Report' : `Stock Report${status ? ` - ${statusOptions.find((option) => option.value === status)?.title}` : ''}`;
    printDocument(stockReportDocument(response.data.data, title));
  } catch (error) {
    alerts.fail(error);
  } finally {
    printing.value = false;
  }
}

function refillMart(item: any = null) {
  router.push({ path: '/stock-transfers/create', query: { refill: item ? item.product_variant_id : '' } });
}

const expiryHeaders = ref<Header[]>([
  { title: 'PRODUCT', align: 'start', key: 'product' },
  { title: 'BATCH', align: 'start', key: 'batch_number' },
  { title: 'EXPIRY', align: 'start', key: 'expiry_date' },
  { title: 'DAYS LEFT', align: 'start', key: 'days_left' },
  { title: 'QTY', align: 'start', key: 'quantity' },
  { title: 'VALUE', align: 'start', key: 'stock_value' },
]);

function onSearch(key: string) {
  list.onSearch(key);
  expiry.onSearch(key);
}

function openLedger(item: any) {
  router.push({ path: '/stock/movements', query: { product_variant_id: item.product_variant_id, label: `${item.product_name} - ${item.variant_name}` } });
}

watch(tab, (value) => {
  if (value === 'expiry') expiry.fetchData();
});

onMounted(async () => {
  locations.loadLocations().then(list.refresh);
  if (tab.value === 'expiry') expiry.fetchData();
  try {
    await Promise.all([lookups.loadCategories(), lookups.loadBrands()]);
  } catch (error) {
    alerts.fail(error);
  }
});
</script>

<template>
  <v-row>
    <v-col cols="12" sm="6" :lg="hasWarehouse ? true : 3">
      <DashboardStatCard title="Stock Value" :value="formatMoney(list.kpis.value.stockValue)" icon="mdi-cash-multiple"
        :comparison-label="`${list.kpis.value.skuCount ?? 0} SKUs at average cost`" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" :lg="hasWarehouse ? true : 3">
      <DashboardStatCard title="Low Stock" :value="list.kpis.value.lowStock ?? 0" icon="mdi-alert-outline"
        comparison-label="At or below reorder level" :show-info-icon="false" />
    </v-col>
    <v-col v-if="hasWarehouse" cols="12" sm="6" :lg="true">
      <DashboardStatCard title="Refill Mart" :value="list.kpis.value.refillMart ?? 0" icon="mdi-cart-arrow-right"
        comparison-label="Mart at or below its minimum" :show-info-icon="(list.kpis.value.refillMart ?? 0) > 0" />
    </v-col>
    <v-col cols="12" sm="6" :lg="hasWarehouse ? true : 3">
      <DashboardStatCard title="Out of Stock" :value="list.kpis.value.outOfStock ?? 0" icon="mdi-close-octagon-outline"
        comparison-label="Nothing on hand" :show-info-icon="(list.kpis.value.outOfStock ?? 0) > 0" />
    </v-col>
    <v-col cols="12" sm="6" :lg="hasWarehouse ? true : 3">
      <DashboardStatCard title="Expiring in 30 days" :value="list.kpis.value.expiringSoon ?? 0" icon="mdi-calendar-alert"
        :comparison-label="`${list.kpis.value.expired ?? 0} batches expired`" :show-info-icon="(list.kpis.value.expired ?? 0) > 0" />
    </v-col>

    <v-col cols="12">
      <UiParentCard title="Stock" icon="mdi-warehouse">
        <template #action>
          <div class="d-flex gap-2">
            <v-btn v-if="hasWarehouse && can('stock_transfers_create', 'Stock Transfer')" color="warning" variant="tonal" prepend-icon="mdi-cart-arrow-right"
              :disabled="!(list.kpis.value.refillMart > 0)" @click="refillMart()">Refill Mart ({{ list.kpis.value.refillMart ?? 0 }})</v-btn>
            <v-menu>
              <template #activator="{ props: menuProps }">
                <v-btn v-bind="menuProps" variant="outlined" color="primary" prepend-icon="mdi-printer" append-icon="mdi-chevron-down" :loading="printing">Print A4</v-btn>
              </template>
              <v-list density="compact">
                <v-list-item prepend-icon="mdi-alert-outline" title="Low stock (Mart / Warehouse)" @click="printStock(true)" />
                <v-list-item prepend-icon="mdi-format-list-bulleted" title="Current list (with filters)" @click="printStock(false)" />
              </v-list>
            </v-menu>
            <v-btn variant="outlined" color="primary" to="/stock/movements" prepend-icon="mdi-history">Stock Ledger</v-btn>
            <v-btn v-if="can('stock_opening', 'Stock')" color="primary" to="/stock/opening" prepend-icon="mdi-database-plus-outline">Opening Stock</v-btn>
          </div>
        </template>

        <v-tabs v-model="tab" color="primary" class="mb-4">
          <v-tab value="stock" class="text-capitalize">Stock on Hand</v-tab>
          <v-tab value="expiry" class="text-capitalize">Expiring Batches</v-tab>
        </v-tabs>

        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />

        <v-window v-model="tab">
          <v-window-item value="stock">
            <ListToolbar :total="list.totalItems.value" label="Total SKUs" search-placeholder="Search product, SKU, barcode..."
              exportable :exporting="list.exporting.value" @search="onSearch" @export="list.exportFile">
              <template #filters>
                <div>
                  <v-btn :variant="lowOnly ? 'flat' : 'outlined'" :color="lowOnly ? 'warning' : 'primary'" height="40" prepend-icon="mdi-alert-outline" @click="toggleLowOnly">Low stock only</v-btn>
                </div>
                <div>
                  <v-autocomplete v-model="categoryId" :items="lookups.categories.value" item-title="path" item-value="id" placeholder="All categories" clearable hide-details @update:model-value="list.reload()" />
                </div>
                <div>
                  <v-autocomplete v-model="brandId" :items="lookups.brands.value" item-title="name" item-value="id" placeholder="All brands" clearable hide-details @update:model-value="list.reload()" />
                </div>
                <div>
                  <v-select v-model="stockStatus" :items="statusOptions" placeholder="Any stock" clearable hide-details @update:model-value="list.reload()" />
                </div>
                <div>
                  <v-select v-model="sortBy" :items="sortOptions" hide-details @update:model-value="list.reload()" />
                </div>
              </template>
            </ListToolbar>

            <v-data-table :loading="list.loading.value" :items-per-page="list.itemsPerPage.value" :headers="headers" :items="list.items.value"
              item-value="product_variant_id" hide-default-footer class="border rounded-md">
              <template v-slot:loading><v-skeleton-loader type="table-row@10"></v-skeleton-loader></template>
              <template v-slot:item.product_name="{ item }">
                <div class="d-flex align-center py-2">
                  <v-avatar size="32" rounded="md" color="grey100">
                    <v-img v-if="item.image_url" :src="item.image_url" cover />
                    <v-icon v-else size="18" color="primary">mdi-package-variant</v-icon>
                  </v-avatar>
                  <div class="ml-3">
                    <div class="text-subtitle-2">{{ item.product_name }}</div>
                    <div class="text-caption text-lightText">{{ item.variant_name }}<span v-if="item.brand_name"> · {{ item.brand_name }}</span></div>
                  </div>
                </div>
              </template>
              <template v-slot:item.category_name="{ item }">{{ item.category_name || '-' }}</template>
              <template v-slot:item.quantity="{ item }"><strong>{{ formatNumber(item.quantity, 3) }}</strong> {{ item.stock_unit }}</template>
              <template v-slot:item.warehouse_quantity="{ item }">{{ formatNumber(item.warehouse_quantity, 3) }}</template>
              <template v-slot:item.mart_quantity="{ item }">
                <span :class="item.needs_refill ? 'text-warning font-weight-bold' : ''">{{ formatNumber(item.mart_quantity, 3) }}</span>
              </template>
              <template v-slot:item.mart_min_level="{ item }">{{ item.mart_min_level ? formatNumber(item.mart_min_level, 3) : '-' }}</template>
              <template v-slot:item.reorder_level="{ item }">{{ formatNumber(item.reorder_level, 3) }}</template>
              <template v-slot:item.average_cost="{ item }">{{ formatMoney(item.average_cost) }}</template>
              <template v-slot:item.sale_price="{ item }">{{ formatMoney(item.sale_price) }}</template>
              <template v-slot:item.stock_value="{ item }">{{ formatMoney(item.stock_value) }}</template>
              <template v-slot:item.stock_status="{ item }">
                <div class="d-flex flex-column align-start ga-1 py-1">
                  <StatusChip :status="item.stock_status" />
                  <v-chip v-if="hasWarehouse && item.needs_refill" size="small" color="warning" variant="tonal">Refill Mart</v-chip>
                </div>
              </template>
              <template v-slot:item.actions="{ item }">
                <div class="d-flex">
                  <v-btn v-if="hasWarehouse && item.needs_refill && $can('stock_transfers_create', 'Stock Transfer')" icon="mdi-cart-arrow-right" color="#FFF4E5" size="small"
                    class="me-2 text-warning" :title="`Move ${formatNumber(item.refill_quantity, 3)} to the Mart`" @click="refillMart(item)"></v-btn>
                  <v-btn icon="mdi-history" color="#EFF0F1" size="small" class="me-2" title="View ledger" @click="openLedger(item)"></v-btn>
                  <v-btn v-if="$can('stock_adjustments_create', 'Stock Adjustment')" icon="mdi-tune-vertical" color="#EFF0F1" size="small" title="Adjust stock"
                    @click="router.push('/stock-adjustments/create')"></v-btn>
                </div>
              </template>
              <template v-slot:no-data>
                <p class="px-2 py-2">No stock found</p>
                <v-btn color="primary" @click="list.fetchData()">Refresh</v-btn>
              </template>
              <template v-slot:bottom>
                <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
              </template>
            </v-data-table>
          </v-window-item>

          <v-window-item value="expiry">
            <ListToolbar :total="expiry.totalItems.value" label="Batches expiring" search-placeholder="Search product, SKU..." @search="onSearch">
              <template #filters>
                <div>
                  <v-select v-model="expiryDays" :items="[{ title: 'Next 7 days', value: 7 }, { title: 'Next 30 days', value: 30 }, { title: 'Next 60 days', value: 60 }, { title: 'Next 90 days', value: 90 }]"
                    hide-details @update:model-value="expiry.reload()" />
                </div>
              </template>
            </ListToolbar>

            <v-data-table :loading="expiry.loading.value" :items-per-page="expiry.itemsPerPage.value" :headers="expiryHeaders" :items="expiry.items.value"
              item-value="id" hide-default-footer class="border rounded-md">
              <template v-slot:loading><v-skeleton-loader type="table-row@10"></v-skeleton-loader></template>
              <template v-slot:item.product="{ item }">
                <div class="text-subtitle-2">{{ item.product_variant?.product?.name }}</div>
                <div class="text-caption text-lightText">{{ item.product_variant?.name }} · {{ item.product_variant?.sku }}</div>
              </template>
              <template v-slot:item.batch_number="{ item }">{{ item.batch_number || '-' }}</template>
              <template v-slot:item.expiry_date="{ item }">{{ formatDate(item.expiry_date) }}</template>
              <template v-slot:item.days_left="{ item }">
                <v-chip size="small" variant="tonal" :color="item.days_left < 0 ? 'error' : item.days_left <= 7 ? 'orange' : 'grey'">
                  {{ item.days_left < 0 ? `Expired ${-item.days_left}d ago` : `${item.days_left} days` }}
                </v-chip>
              </template>
              <template v-slot:item.quantity="{ item }">{{ formatNumber(item.quantity, 3) }}</template>
              <template v-slot:item.stock_value="{ item }">{{ formatMoney(item.stock_value) }}</template>
              <template v-slot:no-data><p class="px-2 py-2">No batches expire in this period</p></template>
              <template v-slot:bottom>
                <TableBottom v-model:page="expiry.currentPage.value" :page-count="expiry.pageCount.value" v-model:per-page="expiry.itemsPerPageInput.value" :total="expiry.totalItems.value" />
              </template>
            </v-data-table>
          </v-window-item>
        </v-window>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
