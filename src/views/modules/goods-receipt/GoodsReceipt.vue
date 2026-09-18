<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import DashboardStatCard from '@/components/shared/DashboardStatCard.vue';
import ListToolbar from '@/components/shared/ListToolbar.vue';
import TableBottom from '@/components/shared/TableBottom.vue';
import DeleteDialog from '@/components/shared/DeleteDialog.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import { useListPage } from '@/composables/useListPage';
import { useAlerts } from '@/composables/useAlerts';
import { useLookups } from '@/composables/useLookups';
import { can } from '@/utils/permissions';
import { formatDate, formatMoney } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const router = useRouter();
const alerts = useAlerts();
const lookups = useLookups();
const status = ref<string | null>(null);
const supplierId = ref<number | null>(null);

const list = useListPage('goods-receipts', {
  exportName: 'Goods_Receipts',
  storeScoped: true,
  filters: () => ({ status: status.value || undefined, supplier_id: supplierId.value || undefined }),
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'GRN', align: 'start', key: 'grn_number' },
  { title: 'SUPPLIER', align: 'start', key: 'supplier' },
  { title: 'RECEIVED', align: 'start', key: 'received_date' },
  { title: 'PO', align: 'start', key: 'purchase_order' },
  { title: 'INVOICE', align: 'start', key: 'supplier_invoice_number' },
  { title: 'TOTAL', align: 'start', key: 'total_amount' },
  { title: 'STATUS', align: 'start', key: 'status' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

const deleteOpen = ref(false);
const deleteId = ref<number | null>(null);

function openDelete(item: any) {
  deleteId.value = item.id;
  deleteOpen.value = true;
}

async function remove() {
  try {
    await axios.delete(`goods-receipts/${deleteId.value}`);
    alerts.success('Goods receipt has been deleted!');
    list.refresh();
  } catch (error) {
    alerts.fail(error);
  }
}

onMounted(() => {
  lookups.loadSuppliers().catch((error) => alerts.fail(error));
});
</script>

<template>
  <v-row>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Goods Receipts" :value="list.kpis.value.totalReceipts ?? 0" icon="mdi-package-down" comparison-label="For this branch" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Drafts" :value="list.kpis.value.draftReceipts ?? 0" icon="mdi-file-document-edit-outline" comparison-label="Not in stock yet"
        :show-info-icon="(list.kpis.value.draftReceipts ?? 0) > 0" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Posted" :value="list.kpis.value.postedReceipts ?? 0" icon="mdi-check-all" comparison-label="Added to stock" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Posted Value" :value="formatMoney(list.kpis.value.postedAmount)" icon="mdi-cash-multiple" comparison-label="Purchases received" :show-info-icon="false" />
    </v-col>

    <v-col cols="12">
      <UiParentCard title="Stock In (Goods Receipts)" icon="mdi-truck-delivery-outline">
        <ListToolbar :total="list.totalItems.value" label="Total Receipts" search-placeholder="Search GRN, invoice or supplier..."
          add-label="Receive Goods" :can-add="can('goods_receipts_create', 'Goods Receipt')" exportable :exporting="list.exporting.value"
          @search="list.onSearch" @add="router.push('/goods-receipts/create')" @export="list.exportFile">
          <template #filters>
            <div>
              <v-select v-model="status" :items="['Draft', 'Posted']" placeholder="All statuses" clearable hide-details @update:model-value="list.reload()" />
            </div>
            <div>
              <v-autocomplete v-model="supplierId" :items="lookups.suppliers.value" item-title="name" item-value="id" placeholder="All suppliers" clearable hide-details @update:model-value="list.reload()" />
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
          <template v-slot:item.grn_number="{ item }">
            <router-link :to="`/goods-receipts/${item.id}`" class="text-primary font-weight-semibold text-decoration-none">{{ item.grn_number }}</router-link>
          </template>
          <template v-slot:item.supplier="{ item }">{{ item.supplier?.name }}</template>
          <template v-slot:item.received_date="{ item }">{{ formatDate(item.received_date) }}</template>
          <template v-slot:item.purchase_order="{ item }">{{ item.purchase_order?.po_number || 'Direct' }}</template>
          <template v-slot:item.supplier_invoice_number="{ item }">{{ item.supplier_invoice_number || '-' }}</template>
          <template v-slot:item.total_amount="{ item }"><span class="font-weight-semibold">{{ formatMoney(item.total_amount) }}</span></template>
          <template v-slot:item.status="{ item }"><StatusChip :status="item.status" /></template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center">
              <v-btn icon="mdi-eye-outline" color="#EFF0F1" size="small" class="me-2" @click="router.push(`/goods-receipts/${item.id}`)"></v-btn>
              <v-btn v-if="item.status === 'Draft' && $can('goods_receipts_edit', 'Goods Receipt')" icon="mdi-pencil-outline" color="#EFF0F1" size="small" class="me-2"
                @click="router.push(`/goods-receipts/${item.id}/edit`)"></v-btn>
              <v-btn v-if="item.status === 'Draft' && $can('goods_receipts_delete', 'Goods Receipt')" icon="mdi-delete-outline" color="#FFEFEF" size="small"
                class="text-error" @click="openDelete(item)"></v-btn>
            </div>
          </template>
          <template v-slot:no-data>
            <p class="px-2 py-2">No goods receipts yet</p>
            <v-btn color="primary" @click="list.fetchData()">Refresh</v-btn>
          </template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this goods receipt?" @confirm="remove" />
</template>
