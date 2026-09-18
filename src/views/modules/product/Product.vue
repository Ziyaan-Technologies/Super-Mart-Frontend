<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import DashboardStatCard from '@/components/shared/DashboardStatCard.vue';
import ListToolbar from '@/components/shared/ListToolbar.vue';
import TableBottom from '@/components/shared/TableBottom.vue';
import RightDrawer from '@/components/shared/RightDrawer.vue';
import DeleteDialog from '@/components/shared/DeleteDialog.vue';
import ActiveIcon from '@/components/shared/ActiveIcon.vue';
import { useListPage } from '@/composables/useListPage';
import { useAlerts } from '@/composables/useAlerts';
import { useLookups } from '@/composables/useLookups';
import { can } from '@/utils/permissions';
import { formatDate, formatMoney, formatNumber } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const router = useRouter();
const alerts = useAlerts();
const lookups = useLookups();
const categoryId = ref<number | null>(null);
const brandId = ref<number | null>(null);
const status = ref<string | null>(null);

const list = useListPage('products', {
  exportName: 'Products',
  filters: () => ({
    category_id: categoryId.value || undefined,
    brand_id: brandId.value || undefined,
    status: status.value || undefined,
  }),
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'PRODUCT', align: 'start', key: 'name' },
  { title: 'CATEGORY', align: 'start', key: 'category' },
  { title: 'VARIANTS', align: 'start', key: 'variants' },
  { title: 'PRICE', align: 'start', key: 'price' },
  { title: 'FLAGS', align: 'start', key: 'flags' },
  { title: 'ACTIVE', align: 'start', key: 'is_active' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

const deleteOpen = ref(false);
const selected = ref<any>(null);
const stockOpen = ref(false);
const stockLoading = ref(false);
const stock = ref<any>({ stores: [], batches: [] });

function priceRange(variants: any[]) {
  if (!variants?.length) return '-';
  const prices = variants.map((variant) => variant.sale_price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? formatMoney(min) : `${formatMoney(min)} - ${formatNumber(max, 2)}`;
}

async function openStock(item: any) {
  selected.value = item;
  stockOpen.value = true;
  stockLoading.value = true;
  stock.value = { stores: [], batches: [] };
  try {
    const results = await Promise.all(item.variants.map((variant: any) => axios.get(`stock/variant/${variant.id}`)));
    stock.value = {
      stores: results.flatMap((result, index) => result.data.stores.map((row: any) => ({ ...row, variant: item.variants[index] }))),
      batches: results.flatMap((result, index) => result.data.batches.map((row: any) => ({ ...row, variant: item.variants[index] }))),
    };
  } catch (error) {
    alerts.fail(error);
  } finally {
    stockLoading.value = false;
  }
}

function openDelete(item: any) {
  selected.value = item;
  deleteOpen.value = true;
}

async function remove() {
  try {
    const response = await axios.delete(`products/${selected.value.id}`);
    alerts.success(response.data?.deactivated ? response.data.message : 'Product has been deleted!');
    list.refresh();
  } catch (error) {
    alerts.fail(error);
  }
}

onMounted(async () => {
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
      <DashboardStatCard title="Products" :value="list.kpis.value.totalProducts ?? 0" icon="mdi-package-variant-closed" comparison-label="In your catalog" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Active" :value="list.kpis.value.activeProducts ?? 0" icon="mdi-check-circle-outline" comparison-label="On sale" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Inactive" :value="list.kpis.value.inactiveProducts ?? 0" icon="mdi-pause-circle-outline" comparison-label="Hidden or discontinued" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Expiry Tracked" :value="list.kpis.value.expiryTracked ?? 0" icon="mdi-calendar-clock" comparison-label="Batch and expiry dates" :show-info-icon="false" />
    </v-col>

    <v-col cols="12">
      <UiParentCard title="Products" icon="mdi-package-variant-closed">
        <ListToolbar :total="list.totalItems.value" label="Total Products" search-placeholder="Search name, SKU, barcode..."
          add-label="Add New Product" :can-add="can('products_create', 'Product')" exportable :exporting="list.exporting.value"
          @search="list.onSearch" @add="router.push('/products/create')" @export="list.exportFile">
          <template #filters>
            <div>
              <v-autocomplete v-model="categoryId" :items="lookups.categories.value" item-title="path" item-value="id" placeholder="All categories" clearable hide-details @update:model-value="list.reload()" />
            </div>
            <div>
              <v-autocomplete v-model="brandId" :items="lookups.brands.value" item-title="name" item-value="id" placeholder="All brands" clearable hide-details @update:model-value="list.reload()" />
            </div>
            <div>
              <v-select v-model="status" :items="['Active', 'Inactive']" placeholder="All statuses" clearable hide-details @update:model-value="list.reload()" />
            </div>
          </template>
        </ListToolbar>

        <v-data-table :loading="list.loading.value" :items-per-page="list.itemsPerPage.value" :headers="headers" :items="list.items.value"
          item-value="id" hide-default-footer class="border rounded-md">
          <template v-slot:loading><v-skeleton-loader type="table-row@10"></v-skeleton-loader></template>
          <template v-slot:top>
            <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-4 single-line-alert" closable>
              <template v-slot:prepend><v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon></template>
            </v-alert>
            <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />
          </template>
          <template v-slot:item.name="{ item }">
            <div class="d-flex align-center py-2">
              <v-avatar size="36" rounded="md" color="grey100">
                <v-img v-if="item.image_url" :src="item.image_url" cover />
                <v-icon v-else size="18" color="primary">mdi-package-variant</v-icon>
              </v-avatar>
              <div class="ml-3">
                <div class="text-subtitle-2">{{ item.name }}</div>
                <div class="text-caption text-lightText">{{ item.brand?.name || 'No brand' }} · {{ item.unit?.short_name }}<span v-if="item.tax"> · {{ item.tax.name }}</span></div>
              </div>
            </div>
          </template>
          <template v-slot:item.category="{ item }">{{ item.category?.name }}</template>
          <template v-slot:item.variants="{ item }">
            <div v-for="variant in item.variants.slice(0, 3)" :key="variant.id" class="text-caption">{{ variant.name }} · {{ variant.sku }}</div>
            <div v-if="item.variants.length > 3" class="text-caption text-lightText">+{{ item.variants.length - 3 }} more</div>
          </template>
          <template v-slot:item.price="{ item }">{{ priceRange(item.variants) }}</template>
          <template v-slot:item.flags="{ item }">
            <v-chip v-if="item.is_weighted" size="x-small" variant="tonal" color="primary" class="mr-1">Weighed</v-chip>
            <v-chip v-if="item.track_expiry" size="x-small" variant="tonal" color="orange">Expiry</v-chip>
          </template>
          <template v-slot:item.is_active="{ item }"><ActiveIcon :active="item.is_active" /></template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center">
              <v-btn v-if="$can('stock_view', 'Stock')" icon="mdi-warehouse" color="#EFF0F1" size="small" class="me-2" title="Stock by branch" @click="openStock(item)"></v-btn>
              <v-btn v-if="$can('products_edit', 'Product')" icon="mdi-pencil-outline" color="#EFF0F1" size="small" class="me-2" @click="router.push(`/products/${item.id}/edit`)"></v-btn>
              <v-btn v-if="$can('products_delete', 'Product')" icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="openDelete(item)"></v-btn>
            </div>
          </template>
          <template v-slot:no-data>
            <p class="px-2 py-2">No products found</p>
            <v-btn color="primary" @click="list.fetchData()">Refresh</v-btn>
          </template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <RightDrawer v-model="stockOpen" :title="`Stock · ${selected?.name || ''}`" subtitle="On hand and open batches in every branch" max-width="700" hide-footer>
    <v-skeleton-loader v-if="stockLoading" type="table" />
    <template v-else>
      <h4 class="mb-2">By Branch</h4>
      <div class="border rounded-md overflow-x-auto mb-6">
        <v-table density="compact">
          <thead><tr><th>BRANCH</th><th>VARIANT</th><th class="text-right">ON HAND</th><th class="text-right">AVG COST</th><th class="text-right">REORDER AT</th></tr></thead>
          <tbody>
            <tr v-for="(row, index) in stock.stores" :key="index">
              <td>{{ row.clientstore?.store_name }}</td>
              <td>{{ row.variant.name }}</td>
              <td class="text-right"><strong :class="row.quantity <= row.variant.reorder_level ? 'text-error' : ''">{{ formatNumber(row.quantity, 3) }}</strong></td>
              <td class="text-right">{{ formatMoney(row.average_cost) }}</td>
              <td class="text-right">{{ formatNumber(row.variant.reorder_level, 3) }}</td>
            </tr>
            <tr v-if="!stock.stores.length"><td colspan="5" class="text-center text-lightText py-4">No stock recorded yet</td></tr>
          </tbody>
        </v-table>
      </div>
      <h4 class="mb-2">Open Batches</h4>
      <div class="border rounded-md overflow-x-auto">
        <v-table density="compact">
          <thead><tr><th>BRANCH</th><th>VARIANT</th><th>BATCH</th><th>EXPIRY</th><th class="text-right">QTY LEFT</th></tr></thead>
          <tbody>
            <tr v-for="(row, index) in stock.batches" :key="index">
              <td>{{ row.clientstore?.store_name }}</td>
              <td>{{ row.variant.name }}</td>
              <td>{{ row.batch_number || '-' }}</td>
              <td>{{ formatDate(row.expiry_date) }}</td>
              <td class="text-right">{{ formatNumber(row.quantity, 3) }}</td>
            </tr>
            <tr v-if="!stock.batches.length"><td colspan="5" class="text-center text-lightText py-4">No batches</td></tr>
          </tbody>
        </v-table>
      </div>
    </template>
  </RightDrawer>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this product?"
    hint="Products with stock history are deactivated instead of deleted." @confirm="remove" />
</template>
