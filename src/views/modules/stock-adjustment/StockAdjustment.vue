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
import { can } from '@/utils/permissions';
import { formatDate, formatMoney } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const router = useRouter();
const alerts = useAlerts();
const status = ref<string | null>(null);
const reason = ref<string | null>(null);
const reasons = ref<string[]>([]);

const list = useListPage('stock-adjustments', {
  exportName: 'Stock_Adjustments',
  storeScoped: true,
  filters: () => ({ status: status.value || undefined, reason: reason.value || undefined }),
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'NUMBER', align: 'start', key: 'adjustment_number' },
  { title: 'DATE', align: 'start', key: 'adjustment_date' },
  { title: 'REASON', align: 'start', key: 'reason' },
  { title: 'NET VALUE', align: 'start', key: 'total_value' },
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
    await axios.delete(`stock-adjustments/${deleteId.value}`);
    alerts.success('Adjustment has been deleted!');
    list.refresh();
  } catch (error) {
    alerts.fail(error);
  }
}

onMounted(async () => {
  try {
    reasons.value = (await axios.get('stock-adjustments/reasons')).data;
  } catch (error) {
    alerts.fail(error);
  }
});
</script>

<template>
  <v-row>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Adjustments" :value="list.kpis.value.totalAdjustments ?? 0" icon="mdi-tune-vertical" comparison-label="For this branch" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Drafts" :value="list.kpis.value.draftAdjustments ?? 0" icon="mdi-file-document-edit-outline" comparison-label="Waiting to be posted"
        :show-info-icon="(list.kpis.value.draftAdjustments ?? 0) > 0" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Posted" :value="list.kpis.value.postedAdjustments ?? 0" icon="mdi-check-all" comparison-label="Applied to stock" :show-info-icon="false" />
    </v-col>
    <v-col cols="12" sm="6" lg="3">
      <DashboardStatCard title="Net Impact" :value="formatMoney(list.kpis.value.netValue)" icon="mdi-scale-unbalanced" comparison-label="Gains minus losses at cost"
        :show-info-icon="(list.kpis.value.netValue ?? 0) < 0" />
    </v-col>

    <v-col cols="12">
      <UiParentCard title="Stock Adjustments" icon="mdi-scale-balance">
        <ListToolbar :total="list.totalItems.value" label="Total Adjustments" search-placeholder="Search number or note..."
          add-label="New Adjustment" :can-add="can('stock_adjustments_create', 'Stock Adjustment')" exportable :exporting="list.exporting.value"
          @search="list.onSearch" @add="router.push('/stock-adjustments/create')" @export="list.exportFile">
          <template #filters>
            <div>
              <v-select v-model="reason" :items="reasons" placeholder="All reasons" clearable hide-details @update:model-value="list.reload()" />
            </div>
            <div>
              <v-select v-model="status" :items="['Draft', 'Posted']" placeholder="All statuses" clearable hide-details @update:model-value="list.reload()" />
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
          <template v-slot:item.adjustment_number="{ item }">
            <router-link :to="`/stock-adjustments/${item.id}`" class="text-primary font-weight-semibold text-decoration-none">{{ item.adjustment_number }}</router-link>
          </template>
          <template v-slot:item.adjustment_date="{ item }">{{ formatDate(item.adjustment_date) }}</template>
          <template v-slot:item.total_value="{ item }">
            <span v-if="item.status === 'Draft'" class="text-lightText">-</span>
            <span v-else :class="item.total_value < 0 ? 'text-error' : 'text-successdark'">{{ formatMoney(item.total_value) }}</span>
          </template>
          <template v-slot:item.status="{ item }"><StatusChip :status="item.status" /></template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center">
              <v-btn icon="mdi-eye-outline" color="#EFF0F1" size="small" class="me-2" @click="router.push(`/stock-adjustments/${item.id}`)"></v-btn>
              <v-btn v-if="item.status === 'Draft' && $can('stock_adjustments_edit', 'Stock Adjustment')" icon="mdi-pencil-outline" color="#EFF0F1" size="small" class="me-2"
                @click="router.push(`/stock-adjustments/${item.id}/edit`)"></v-btn>
              <v-btn v-if="item.status === 'Draft' && $can('stock_adjustments_delete', 'Stock Adjustment')" icon="mdi-delete-outline" color="#FFEFEF" size="small"
                class="text-error" @click="openDelete(item)"></v-btn>
            </div>
          </template>
          <template v-slot:no-data>
            <p class="px-2 py-2">No adjustments yet</p>
            <v-btn color="primary" @click="list.fetchData()">Refresh</v-btn>
          </template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this adjustment?" @confirm="remove" />
</template>
