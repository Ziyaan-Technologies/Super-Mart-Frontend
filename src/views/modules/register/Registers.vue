<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import { useRouter } from 'vue-router';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import ListToolbar from '@/components/shared/ListToolbar.vue';
import TableBottom from '@/components/shared/TableBottom.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import ActiveIcon from '@/components/shared/ActiveIcon.vue';
import RightDrawer from '@/components/shared/RightDrawer.vue';
import DeleteDialog from '@/components/shared/DeleteDialog.vue';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import BtnOutlined from '@/components/shared/BtnOutlined.vue';
import RegisterDialog from '@/views/modules/pos/RegisterDialog.vue';
import CounterHistory from '@/views/modules/register/CounterHistory.vue';
import { useListPage } from '@/composables/useListPage';
import { useAlerts } from '@/composables/useAlerts';
import { useAuthStore } from '@/stores/auth';
import { can } from '@/utils/permissions';
import { apiError, formatDateTime, formatMoney } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const router = useRouter();
const authStore = useAuthStore();
const alerts = useAlerts();
const drawerAlerts = useAlerts();
const canSell = can('pos_sell', 'POS');

const list = useListPage('pos/counters', {
  kpis: false,
  storeScoped: true,
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'ID', align: 'start', key: 'id' },
  { title: 'COUNTER', align: 'start', key: 'name' },
  { title: 'STATUS', align: 'start', key: 'status' },
  { title: 'CASH IN COUNTER', align: 'start', key: 'cash' },
  { title: 'TODAY', align: 'start', key: 'today' },
  { title: 'ACTIVE', align: 'start', key: 'is_active' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

const drawer = ref(false);
const drawerRef = ref<any>(null);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = ref<any>({});
const deleteOpen = ref(false);
const deleteId = ref<number | null>(null);

const closeId = ref(0);
const closeDialog = ref(false);
const historyCounter = ref<any>(null);
const historyDialog = ref(false);

const openTarget = ref<any>(null);
const openDialog = ref(false);
const openingCash = ref<number | string>('');
const openingError = ref('');
const opening = ref(false);

function openForm(item: any = null) {
  editingId.value = item?.id || null;
  form.value = {
    name: item?.name || '',
    description: item?.description || '',
    is_active: item?.is_active ?? true,
  };
  drawerAlerts.clear();
  drawer.value = true;
  drawerRef.value?.resetValidation();
}

async function save() {
  if (!(await drawerRef.value.validate())) return;
  saving.value = true;
  try {
    const payload = { ...form.value, name: form.value.name.trim(), description: form.value.description.trim() };
    if (editingId.value) {
      await axios.put(`pos/counters/${editingId.value}`, payload);
      alerts.success('Counter has been updated!');
    } else {
      await axios.post('pos/counters', { ...payload, clientstore_id: authStore.clientstoreId });
      alerts.success('Counter has been created!');
    }
    drawer.value = false;
    list.refresh();
  } catch (error) {
    drawerAlerts.fail(error);
  } finally {
    saving.value = false;
  }
}

function openDelete(item: any) {
  deleteId.value = item.id;
  deleteOpen.value = true;
}

async function remove() {
  try {
    const result = (await axios.delete(`pos/counters/${deleteId.value}`)).data;
    alerts.success(result.message || 'Counter has been deleted!');
    list.refresh();
  } catch (error) {
    alerts.fail(error);
  }
}

function askClose(item: any) {
  closeId.value = item.session.id;
  closeDialog.value = true;
}

function onClosed(closed: any) {
  closeDialog.value = false;
  alerts.success(`${closed.counter?.name || 'Counter'} closed. Expected ${formatMoney(closed.expected_cash)}, counted ${formatMoney(closed.closing_cash)}.`);
  list.refresh();
}

function showHistory(item: any) {
  historyCounter.value = item;
  historyDialog.value = true;
}

function askOpen(item: any) {
  openTarget.value = item;
  openingCash.value = '';
  openingError.value = '';
  openDialog.value = true;
}

async function openCounter() {
  if (openingCash.value === '' || Number(openingCash.value) < 0) {
    openingError.value = 'Enter the cash you are starting the counter with';
    return;
  }
  opening.value = true;
  try {
    await axios.post('pos/registers/open', {
      clientstore_id: authStore.clientstoreId,
      counter_id: openTarget.value.id,
      opening_cash: Number(openingCash.value),
    });
    openDialog.value = false;
    router.push('/pos');
  } catch (error) {
    openingError.value = apiError(error);
    list.refresh();
  } finally {
    opening.value = false;
  }
}
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Counters" icon="mdi-counter">
        <ListToolbar :total="list.totalItems.value" label="Counters" search-placeholder="Search counter..."
          add-label="Add New Counter" :can-add="true" @search="list.onSearch" @add="openForm()" />

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
            <div class="d-flex align-center ga-3 py-2">
              <v-avatar size="40" rounded="md" color="lightsuccess"><v-icon color="success" size="20">mdi-counter</v-icon></v-avatar>
              <div>
                <div class="text-subtitle-2">{{ item.name }}</div>
                <div v-if="item.assigned_to" class="text-caption text-primary"><v-icon size="13">mdi-account-lock-outline</v-icon> Cashier: {{ item.assigned_to.full_name }}</div>
                <div v-else-if="item.description" class="text-caption text-lightText">{{ item.description }}</div>
              </div>
            </div>
          </template>
          <template v-slot:item.status="{ item }">
            <div class="py-2">
              <StatusChip :status="item.status" />
              <div v-if="item.session" class="text-body-2 mt-1">{{ item.session.cashier?.full_name }} · since {{ formatDateTime(item.session.opened_at) }}</div>
            </div>
          </template>
          <template v-slot:item.cash="{ item }">
            <span v-if="item.session" class="font-weight-semibold">{{ formatMoney(item.session.expected_cash) }}</span>
            <span v-else>-</span>
          </template>
          <template v-slot:item.today="{ item }">{{ item.today.bills }} bills · {{ formatMoney(item.today.sales) }}</template>
          <template v-slot:item.is_active="{ item }"><ActiveIcon :active="item.is_active" /></template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center ga-2">
              <v-btn v-if="authStore.isOwner" variant="tonal" color="primary" size="small" prepend-icon="mdi-history" @click="showHistory(item)">History</v-btn>
              <v-btn v-if="item.session" icon="mdi-lock-outline" color="#FFEFEF" size="small" class="text-error" title="Close counter" @click="askClose(item)" />
              <v-btn v-else-if="item.is_active && canSell" icon="mdi-lock-open-variant-outline" color="#E8F5E9" size="small" class="text-success" title="Open counter" @click="askOpen(item)" />
              <v-btn icon="mdi-pencil-outline" color="#EFF0F1" size="small" title="Edit" @click="openForm(item)" />
              <v-btn icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" title="Delete" @click="openDelete(item)" />
            </div>
          </template>
          <template v-slot:no-data><p class="px-2 py-2">No counters yet</p></template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <RightDrawer ref="drawerRef" v-model="drawer" :title="editingId ? 'Edit Counter' : 'Add New Counter'" :submit-label="editingId ? 'Update Counter' : 'Create Counter'"
    :loading="saving" :show-error-alert="drawerAlerts.showErrorAlert.value" :error-text="drawerAlerts.errorText.value"
    @submit="save" @close-error="drawerAlerts.clear()">
    <v-row>
      <v-col cols="12" class="pt-4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Name</v-label>
        <v-text-field v-model="form.name" :rules="[(v: string) => !!v?.trim() || 'Name is required']" placeholder="e.g. Counter 2" hide-details="auto" />
      </v-col>
      <v-col cols="12">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Description</v-label>
        <v-text-field v-model="form.description" placeholder="e.g. Near the entrance" hide-details />
      </v-col>
      <v-col cols="12" class="pb-0 d-flex align-center justify-space-between">
        <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.is_active }">Active?</p>
        <v-switch color="primary" v-model="form.is_active" hide-details></v-switch>
      </v-col>
    </v-row>
  </RightDrawer>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this counter?"
    hint="A counter with old sessions is made inactive instead, so its history is kept." @confirm="remove" />

  <RegisterDialog v-if="closeId" v-model="closeDialog" :session-id="closeId" @closed="onClosed" />

  <CounterHistory v-if="historyCounter" :key="historyCounter.id" v-model="historyDialog" :counter="historyCounter" />

  <v-dialog v-model="openDialog" max-width="440" persistent>
    <v-card class="ui-modal">
      <div class="ui-modal__header">
        <span class="ui-modal__title">Open {{ openTarget?.name }}</span>
        <button class="ui-modal__close" type="button" aria-label="Close" @click="openDialog = false">
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>
      <div class="ui-modal__body">
        <v-alert v-if="openingError" :text="openingError" type="error" density="compact" class="mb-3 single-line-alert" />
        <v-label class="text-subtitle-1 pb-2">Opening cash</v-label>
        <v-text-field v-model="openingCash" type="number" min="0" autofocus hide-details @keyup.enter="openCounter" />
        <p class="text-caption text-lightText mt-2 mb-0">The counter opens under your name and takes you to the Sale Counter.</p>
      </div>
      <div class="ui-modal__footer">
        <BtnOutlined outline="Cancel" @click="openDialog = false" />
        <BtnFilled filled="Open Counter" :loading="opening" @click="openCounter" />
      </div>
    </v-card>
  </v-dialog>
</template>
