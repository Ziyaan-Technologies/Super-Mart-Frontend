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
const statuses = ['Draft', 'Approved', 'Partially Received', 'Received', 'Cancelled'];

const list = useListPage('purchase-orders', {
  exportName: 'Purchase_Orders',
  storeScoped: true,
  filters: () => ({ status: status.value || undefined, supplier_id: supplierId.value || undefined }),
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'PO NUMBER', align: 'start', key: 'po_number' },
  { title: 'SUPPLIER', align: 'start', key: 'supplier' },
  { title: 'ORDER DATE', align: 'start', key: 'order_date' },
  { title: 'EXPECTED', align: 'start', key: 'expected_date' },
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
    await axios.delete(`purchase-orders/${deleteId.value}`);
    alerts.success('Purchase order has been deleted!');
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
      <DashboardStatCard title="Purchase Orders" :value="list.kpis.value.totalOrders ?? 0" icon="mdi-clipboard-list-outline" comparison-label="For this branch" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Drafts" :value="list.kpis.value.draftOrders ?? 0" icon="mdi-file-document-edit-outline" comparison-label="Waiting for approval" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Open Orders" :value="list.kpis.value.openOrders ?? 0" icon="mdi-truck-delivery-outline"
        :comparison-label="`${formatMoney(list.kpis.value.openAmount)} to receive`" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Received" :value="list.kpis.value.receivedOrders ?? 0" icon="mdi-check-all" comparison-label="Fully delivered" :show-info-icon="false" />
    </v-col>

    <v-col cols="12">
      <UiParentCard title="Purchase Orders" icon="mdi-clipboard-text-outline">
        <ListToolbar :total="list.totalItems.value" label="Total Orders" search-placeholder="Search PO number or supplier..."
          add-label="New Purchase Order" :can-add="can('purchase_orders_create', 'Purchase Order')" exportable :exporting="list.exporting.value"
          @search="list.onSearch" @add="router.push('/purchase-orders/create')" @export="list.exportFile">
          <template #filters>
            <div>
              <v-select v-model="status" :items="statuses" placeholder="All statuses" clearable hide-details @update:model-value="list.reload()" />
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
          <template v-slot:item.po_number="{ item }">
            <router-link :to="`/purchase-orders/${item.id}`" class="text-primary font-weight-semibold text-decoration-none">{{ item.po_number }}</router-link>
          </template>
          <template v-slot:item.supplier="{ item }">{{ item.supplier?.name }}</template>
          <template v-slot:item.order_date="{ item }">{{ formatDate(item.order_date) }}</template>
          <template v-slot:item.expected_date="{ item }">{{ formatDate(item.expected_date) }}</template>
          <template v-slot:item.total_amount="{ item }"><span class="font-weight-semibold">{{ formatMoney(item.total_amount) }}</span></template>
          <template v-slot:item.status="{ item }"><StatusChip :status="item.status" /></template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center">
              <v-btn icon="mdi-eye-outline" color="#EFF0F1" size="small" class="me-2" @click="router.push(`/purchase-orders/${item.id}`)"></v-btn>
              <v-btn v-if="item.status === 'Draft' && $can('purchase_orders_edit', 'Purchase Order')" icon="mdi-pencil-outline" color="#EFF0F1" size="small" class="me-2"
                @click="router.push(`/purchase-orders/${item.id}/edit`)"></v-btn>
              <v-btn v-if="['Approved', 'Partially Received'].includes(item.status) && $can('goods_receipts_create', 'Goods Receipt')" icon="mdi-package-down"
                color="#EFF0F1" size="small" class="me-2" title="Receive goods"
                @click="router.push({ path: '/goods-receipts/create', query: { purchase_order_id: item.id } })"></v-btn>
              <v-btn v-if="item.status === 'Draft' && $can('purchase_orders_delete', 'Purchase Order')" icon="mdi-delete-outline" color="#FFEFEF" size="small"
                class="text-error" @click="openDelete(item)"></v-btn>
            </div>
          </template>
          <template v-slot:no-data>
            <p class="px-2 py-2">No purchase orders yet</p>
            <v-btn color="primary" @click="list.fetchData()">Refresh</v-btn>
          </template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this purchase order?" @confirm="remove" />
</template>
