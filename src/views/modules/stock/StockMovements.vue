<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import ListToolbar from '@/components/shared/ListToolbar.vue';
import TableBottom from '@/components/shared/TableBottom.vue';
import DatePickerRange from '@/components/shared/DatePickerRange.vue';
import { useListPage } from '@/composables/useListPage';
import { useAlerts } from '@/composables/useAlerts';
import { formatDateTime, formatMoney, formatNumber } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const route = useRoute();
const router = useRouter();
const alerts = useAlerts();
const variantId = ref(route.query.product_variant_id ? Number(route.query.product_variant_id) : null);
const variantLabel = ref((route.query.label as string) || '');
const types = ref<string[]>([]);
const type = ref<string | null>(null);
const dates = ref<{ startDate?: string; endDate?: string }>({});

const list = useListPage('stock', {
  listPath: 'stock/v1/movements',
  kpis: false,
  storeScoped: true,
  filters: () => ({
    type: type.value || undefined,
    product_variant_id: variantId.value || undefined,
    startDate: dates.value.startDate,
    endDate: dates.value.endDate,
  }),
  onError: (error) => alerts.fail(error),
});

const inboundTypes = ['Opening', 'Purchase', 'Sale Return', 'Transfer In', 'Adjustment In'];
const referencePaths: Record<string, string> = {
  goods_receipt: '/goods-receipts',
  stock_transfer: '/stock-transfers',
  stock_adjustment: '/stock-adjustments',
  sale: '/sales',
};

const headers = ref<Header[]>([
  { title: 'DATE', align: 'start', key: 'created_at' },
  { title: 'PRODUCT', align: 'start', key: 'product' },
  { title: 'MOVEMENT', align: 'start', key: 'type' },
  { title: 'QTY', align: 'start', key: 'quantity' },
  { title: 'UNIT COST', align: 'start', key: 'unit_cost' },
  { title: 'BALANCE', align: 'start', key: 'balance_after' },
  { title: 'REFERENCE', align: 'start', key: 'reference' },
  { title: 'BY', align: 'start', key: 'created_by' },
]);

const title = computed(() => (variantLabel.value ? `Stock Ledger · ${variantLabel.value}` : 'Stock Ledger'));

function typeColor(value: string) {
  if (inboundTypes.includes(value)) return 'successdark';
  if (value === 'Wastage') return 'error';
  return 'orange';
}

function onDates(value: { startDate: string; endDate: string }) {
  dates.value = value.startDate && value.endDate ? value : {};
  if (!value.startDate || value.endDate) list.reload();
}

function clearVariant() {
  variantId.value = null;
  variantLabel.value = '';
  router.replace({ query: {} });
  list.reload();
}

onMounted(async () => {
  try {
    types.value = (await axios.get('stock/movement-types')).data;
  } catch (error) {
    alerts.fail(error);
  }
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard :title="title" icon="mdi-book-open-page-variant-outline">
        <template #action>
          <v-btn variant="outlined" color="primary" to="/stock" prepend-icon="mdi-arrow-left">Back to Stock</v-btn>
        </template>

        <v-chip v-if="variantId" class="mb-3" closable color="primary" variant="tonal" @click:close="clearVariant">
          Only {{ variantLabel || `variant #${variantId}` }}
        </v-chip>

        <ListToolbar :total="list.totalItems.value" label="Movements" search-placeholder="Search product, SKU or document..." @search="list.onSearch">
          <template #filters>
            <div>
              <v-select v-model="type" :items="types" placeholder="All movements" clearable hide-details @update:model-value="list.reload()" />
            </div>
            <div>
              <DatePickerRange @update:selectedDates="onDates" />
            </div>
          </template>
        </ListToolbar>

        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />

        <v-data-table :loading="list.loading.value" :items-per-page="list.itemsPerPage.value" :headers="headers" :items="list.items.value"
          item-value="id" hide-default-footer class="border rounded-md">
          <template v-slot:loading><v-skeleton-loader type="table-row@10"></v-skeleton-loader></template>
          <template v-slot:item.created_at="{ item }">{{ formatDateTime(item.created_at) }}</template>
          <template v-slot:item.product="{ item }">
            <div class="text-subtitle-2">{{ item.product_variant?.product?.name }}</div>
            <div class="text-caption text-lightText">{{ item.product_variant?.name }} · {{ item.product_variant?.sku }}</div>
          </template>
          <template v-slot:item.type="{ item }">
            <v-chip size="small" variant="tonal" :color="typeColor(item.type)" class="font-weight-semibold">{{ item.type }}</v-chip>
          </template>
          <template v-slot:item.quantity="{ item }">
            <strong :class="item.quantity < 0 ? 'text-error' : 'text-successdark'">{{ item.quantity > 0 ? '+' : '' }}{{ formatNumber(item.quantity, 3) }}</strong>
          </template>
          <template v-slot:item.unit_cost="{ item }">{{ formatMoney(item.unit_cost) }}</template>
          <template v-slot:item.balance_after="{ item }">{{ formatNumber(item.balance_after, 3) }}</template>
          <template v-slot:item.reference="{ item }">
            <router-link v-if="referencePaths[item.reference_type] && item.reference_id" :to="`${referencePaths[item.reference_type]}/${item.reference_id}`"
              class="text-primary text-decoration-none font-weight-semibold">{{ item.reference_number }}</router-link>
            <span v-else>{{ item.reference_number || '-' }}</span>
            <div v-if="item.stock_batch" class="text-caption text-lightText">Batch {{ item.stock_batch.batch_number || '-' }}</div>
          </template>
          <template v-slot:item.created_by="{ item }">{{ item.created_by?.full_name || 'System' }}</template>
          <template v-slot:no-data><p class="px-2 py-2">No stock movements yet</p></template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
