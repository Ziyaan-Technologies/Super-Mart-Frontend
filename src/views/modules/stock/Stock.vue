<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import DashboardStatCard from '@/components/shared/DashboardStatCard.vue';
import ListToolbar from '@/components/shared/ListToolbar.vue';
import TableBottom from '@/components/shared/TableBottom.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import { useListPage } from '@/composables/useListPage';
import { useAlerts } from '@/composables/useAlerts';
import { useLookups } from '@/composables/useLookups';
import { can } from '@/utils/permissions';
import { formatDate, formatMoney, formatNumber } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const route = useRoute();
const router = useRouter();
const alerts = useAlerts();
const lookups = useLookups();
const tab = ref(route.query.tab === 'expiry' ? 'expiry' : 'stock');
const categoryId = ref<number | null>(null);
const brandId = ref<number | null>(null);
const stockStatus = ref<string | null>(null);
const sortBy = ref('Name');
const expiryDays = ref(60);

const statusOptions = [
  { title: 'In stock', value: 'in' },
  { title: 'Low stock', value: 'low' },
  { title: 'Out of stock', value: 'out' },
];
const sortOptions = ['Name', 'Quantity Low', 'Quantity High', 'Newest', 'Oldest'];

const list = useListPage('stock', {
  exportName: 'Stock',
  storeScoped: true,
  filters: () => ({
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

const headers = ref<Header[]>([
  { title: 'PRODUCT', align: 'start', key: 'product_name' },
  { title: 'SKU', align: 'start', key: 'sku' },
  { title: 'CATEGORY', align: 'start', key: 'category_name' },
  { title: 'ON HAND', align: 'start', key: 'quantity' },
  { title: 'REORDER AT', align: 'start', key: 'reorder_level' },
  { title: 'AVG COST', align: 'start', key: 'average_cost' },
  { title: 'SALE PRICE', align: 'start', key: 'sale_price' },
  { title: 'VALUE', align: 'start', key: 'stock_value' },
  { title: 'STATUS', align: 'start', key: 'stock_status' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

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
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Stock Value" :value="formatMoney(list.kpis.value.stockValue)" icon="mdi-cash-multiple"
        :comparison-label="`${list.kpis.value.skuCount ?? 0} SKUs at average cost`" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Low Stock" :value="list.kpis.value.lowStock ?? 0" icon="mdi-alert-outline"
        comparison-label="At or below reorder level" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Out of Stock" :value="list.kpis.value.outOfStock ?? 0" icon="mdi-close-octagon-outline"
        comparison-label="Nothing on hand" :show-info-icon="(list.kpis.value.outOfStock ?? 0) > 0" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Expiring in 30 days" :value="list.kpis.value.expiringSoon ?? 0" icon="mdi-calendar-alert"
        :comparison-label="`${list.kpis.value.expired ?? 0} batches expired`" :show-info-icon="(list.kpis.value.expired ?? 0) > 0" />
    </v-col>

    <v-col cols="12">
      <UiParentCard title="Stock" icon="mdi-warehouse">
        <template #action>
          <div class="d-flex gap-2">
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
              <template v-slot:item.reorder_level="{ item }">{{ formatNumber(item.reorder_level, 3) }}</template>
              <template v-slot:item.average_cost="{ item }">{{ formatMoney(item.average_cost) }}</template>
              <template v-slot:item.sale_price="{ item }">{{ formatMoney(item.sale_price) }}</template>
              <template v-slot:item.stock_value="{ item }">{{ formatMoney(item.stock_value) }}</template>
              <template v-slot:item.stock_status="{ item }"><StatusChip :status="item.stock_status" /></template>
              <template v-slot:item.actions="{ item }">
                <div class="d-flex">
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
