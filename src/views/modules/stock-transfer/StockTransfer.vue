<script setup lang="ts">
import { ref } from 'vue';
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
import { useAuthStore } from '@/stores/auth';
import { can } from '@/utils/permissions';
import { formatDate, formatMoney } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const router = useRouter();
const authStore = useAuthStore();
const alerts = useAlerts();
const status = ref<string | null>(null);
const direction = ref<string | null>(null);

const list = useListPage('stock-transfers', {
  exportName: 'Stock_Transfers',
  storeScoped: true,
  filters: () => ({ status: status.value || undefined, direction: direction.value || undefined }),
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'TRANSFER', align: 'start', key: 'transfer_number' },
  { title: 'DIRECTION', align: 'start', key: 'direction' },
  { title: 'FROM', align: 'start', key: 'from_clientstore' },
  { title: 'TO', align: 'start', key: 'to_clientstore' },
  { title: 'DATE', align: 'start', key: 'transfer_date' },
  { title: 'VALUE', align: 'start', key: 'total_value' },
  { title: 'STATUS', align: 'start', key: 'status' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

const deleteOpen = ref(false);
const deleteId = ref<number | null>(null);

function isIncoming(item: any) {
  return item.to_clientstore?.id === authStore.clientstoreId;
}

function openDelete(item: any) {
  deleteId.value = item.id;
  deleteOpen.value = true;
}

async function remove() {
  try {
    await axios.delete(`stock-transfers/${deleteId.value}`);
    alerts.success('Transfer has been deleted!');
    list.refresh();
  } catch (error) {
    alerts.fail(error);
  }
}
</script>

<template>
  <v-row>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Transfers" :value="list.kpis.value.totalTransfers ?? 0" icon="mdi-swap-horizontal" comparison-label="In and out of this branch" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Drafts" :value="list.kpis.value.draftTransfers ?? 0" icon="mdi-file-document-edit-outline" comparison-label="Not dispatched" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="In Transit" :value="list.kpis.value.inTransit ?? 0" icon="mdi-truck-fast-outline" comparison-label="Waiting to be received"
        :show-info-icon="(list.kpis.value.inTransit ?? 0) > 0" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Received" :value="list.kpis.value.receivedTransfers ?? 0" icon="mdi-check-all" comparison-label="Completed" :show-info-icon="false" />
    </v-col>

    <v-col cols="12">
      <UiParentCard title="Stock Transfers" icon="mdi-swap-horizontal-bold">
        <ListToolbar :total="list.totalItems.value" label="Total Transfers" search-placeholder="Search transfer number or branch..."
          add-label="New Transfer" :can-add="can('stock_transfers_create', 'Stock Transfer')" exportable :exporting="list.exporting.value"
          @search="list.onSearch" @add="router.push('/stock-transfers/create')" @export="list.exportFile">
          <template #filters>
            <div>
              <v-select v-model="direction" :items="[{ title: 'Incoming', value: 'incoming' }, { title: 'Outgoing', value: 'outgoing' }]"
                placeholder="In and out" clearable hide-details @update:model-value="list.reload()" />
            </div>
            <div>
              <v-select v-model="status" :items="['Draft', 'Dispatched', 'Received', 'Cancelled']" placeholder="All statuses" clearable hide-details @update:model-value="list.reload()" />
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
          <template v-slot:item.transfer_number="{ item }">
            <router-link :to="`/stock-transfers/${item.id}`" class="text-primary font-weight-semibold text-decoration-none">{{ item.transfer_number }}</router-link>
          </template>
          <template v-slot:item.direction="{ item }">
            <v-chip size="small" variant="tonal" :color="isIncoming(item) ? 'primary' : 'orange'" :prepend-icon="isIncoming(item) ? 'mdi-arrow-down' : 'mdi-arrow-up'">
              {{ isIncoming(item) ? 'Incoming' : 'Outgoing' }}
            </v-chip>
          </template>
          <template v-slot:item.from_clientstore="{ item }">{{ item.from_clientstore?.store_name }}</template>
          <template v-slot:item.to_clientstore="{ item }">{{ item.to_clientstore?.store_name }}</template>
          <template v-slot:item.transfer_date="{ item }">{{ formatDate(item.transfer_date) }}</template>
          <template v-slot:item.total_value="{ item }">{{ item.status === 'Draft' ? '-' : formatMoney(item.total_value) }}</template>
          <template v-slot:item.status="{ item }"><StatusChip :status="item.status" /></template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center">
              <v-btn icon="mdi-eye-outline" color="#EFF0F1" size="small" class="me-2" @click="router.push(`/stock-transfers/${item.id}`)"></v-btn>
              <v-btn v-if="item.status === 'Draft' && !isIncoming(item) && $can('stock_transfers_edit', 'Stock Transfer')" icon="mdi-pencil-outline" color="#EFF0F1"
                size="small" class="me-2" @click="router.push(`/stock-transfers/${item.id}/edit`)"></v-btn>
              <v-btn v-if="item.status === 'Dispatched' && isIncoming(item) && $can('stock_transfers_receive', 'Stock Transfer')" icon="mdi-package-down" color="#EFF0F1"
                size="small" class="me-2" title="Receive" @click="router.push(`/stock-transfers/${item.id}`)"></v-btn>
              <v-btn v-if="item.status === 'Draft' && !isIncoming(item) && $can('stock_transfers_delete', 'Stock Transfer')" icon="mdi-delete-outline" color="#FFEFEF"
                size="small" class="text-error" @click="openDelete(item)"></v-btn>
            </div>
          </template>
          <template v-slot:no-data>
            <p class="px-2 py-2">No transfers yet</p>
            <v-btn color="primary" @click="list.fetchData()">Refresh</v-btn>
          </template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this transfer?" @confirm="remove" />
</template>
