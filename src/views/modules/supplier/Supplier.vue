<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import ListToolbar from '@/components/shared/ListToolbar.vue';
import TableBottom from '@/components/shared/TableBottom.vue';
import RightDrawer from '@/components/shared/RightDrawer.vue';
import DeleteDialog from '@/components/shared/DeleteDialog.vue';
import ActiveIcon from '@/components/shared/ActiveIcon.vue';
import { useListPage } from '@/composables/useListPage';
import { useAlerts } from '@/composables/useAlerts';
import { useLookups } from '@/composables/useLookups';
import { can } from '@/utils/permissions';
import { formatMoney, rules } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const alerts = useAlerts();
const drawerAlerts = useAlerts();
const lookups = useLookups();
const status = ref<string | null>(null);

const list = useListPage('suppliers', {
  kpis: false,
  exportName: 'Suppliers',
  filters: () => ({ status: status.value || undefined }),
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'SUPPLIER', align: 'start', key: 'name' },
  { title: 'CONTACT', align: 'start', key: 'contact' },
  { title: 'CITY', align: 'start', key: 'city' },
  { title: 'TERMS', align: 'start', key: 'payment_terms_days' },
  { title: 'OPENING BALANCE', align: 'start', key: 'opening_balance' },
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

function openForm(item: any = null) {
  editingId.value = item?.id || null;
  form.value = {
    name: item?.name || '',
    contact_person: item?.contact_person || '',
    phone: item?.phone || '',
    email: item?.email || '',
    address: item?.address || '',
    city_id: item?.city_id || null,
    tax_number: item?.tax_number || '',
    payment_terms_days: item?.payment_terms_days ?? 0,
    opening_balance: item?.opening_balance ?? 0,
    note: item?.note || '',
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
    const payload = {
      ...form.value,
      name: form.value.name.trim(),
      email: form.value.email || undefined,
      city_id: form.value.city_id || null,
      payment_terms_days: Number(form.value.payment_terms_days) || 0,
      opening_balance: Number(form.value.opening_balance) || 0,
    };
    if (editingId.value) {
      await axios.put(`suppliers/${editingId.value}`, payload);
      alerts.success('Supplier has been updated!');
    } else {
      await axios.post('suppliers', payload);
      alerts.success('Supplier has been created!');
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
    await axios.delete(`suppliers/${deleteId.value}`);
    alerts.success('Supplier has been deleted!');
    list.refresh();
  } catch (error) {
    alerts.fail(error);
  }
}

onMounted(() => {
  lookups.loadCities().catch((error) => alerts.fail(error));
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Suppliers" icon="mdi-truck-outline">
        <ListToolbar :total="list.totalItems.value" label="Total Suppliers" search-placeholder="Search name, contact, phone..."
          add-label="Add New Supplier" :can-add="can('suppliers_create', 'Supplier')" exportable :exporting="list.exporting.value"
          @search="list.onSearch" @add="openForm()" @export="list.exportFile">
          <template #filters>
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
            <div class="text-subtitle-2">{{ item.name }}</div>
            <div v-if="item.tax_number" class="text-caption text-lightText">Tax {{ item.tax_number }}</div>
          </template>
          <template v-slot:item.contact="{ item }">
            <div>{{ item.contact_person || '-' }}</div>
            <div class="text-caption text-lightText">{{ [item.phone, item.email].filter(Boolean).join(' · ') }}</div>
          </template>
          <template v-slot:item.city="{ item }">{{ item.city?.name || '-' }}</template>
          <template v-slot:item.payment_terms_days="{ item }">{{ item.payment_terms_days ? `${item.payment_terms_days} days` : 'Cash' }}</template>
          <template v-slot:item.opening_balance="{ item }">{{ formatMoney(item.opening_balance) }}</template>
          <template v-slot:item.is_active="{ item }"><ActiveIcon :active="item.is_active" /></template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex">
              <v-btn v-if="$can('suppliers_edit', 'Supplier')" icon="mdi-pencil-outline" color="#EFF0F1" size="small" class="me-2" @click="openForm(item)"></v-btn>
              <v-btn v-if="$can('suppliers_delete', 'Supplier')" icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="openDelete(item)"></v-btn>
            </div>
          </template>
          <template v-slot:no-data>
            <p class="px-2 py-2">No data found</p>
            <v-btn color="primary" @click="list.fetchData()">Refresh</v-btn>
          </template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <RightDrawer ref="drawerRef" v-model="drawer" :title="editingId ? 'Edit Supplier' : 'Add New Supplier'" :submit-label="editingId ? 'Update Supplier' : 'Create Supplier'"
    max-width="600" :loading="saving" :show-error-alert="drawerAlerts.showErrorAlert.value" :error-text="drawerAlerts.errorText.value"
    @submit="save" @close-error="drawerAlerts.clear()">
    <v-row>
      <v-col cols="12" sm="6" class="pt-4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Company Name</v-label>
        <v-text-field v-model="form.name" :rules="[rules.required]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6" class="pt-sm-4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Contact Person</v-label>
        <v-text-field v-model="form.contact_person" hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Phone</v-label>
        <v-text-field v-model="form.phone" hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Email</v-label>
        <v-text-field v-model="form.email" type="email" :rules="[rules.email]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">City</v-label>
        <v-autocomplete v-model="form.city_id" :items="lookups.cities.value" item-title="name" item-value="id" clearable hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Tax Number</v-label>
        <v-text-field v-model="form.tax_number" hide-details />
      </v-col>
      <v-col cols="12">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Address</v-label>
        <v-text-field v-model="form.address" hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Payment Terms (days)</v-label>
        <v-text-field v-model="form.payment_terms_days" type="number" min="0" :rules="[rules.notNegative]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Opening Balance</v-label>
        <v-text-field v-model="form.opening_balance" type="number" hide-details />
      </v-col>
      <v-col cols="12">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Note</v-label>
        <v-textarea v-model="form.note" rows="2" auto-grow hide-details />
      </v-col>
      <v-col cols="12" class="pb-0 d-flex align-center justify-space-between">
        <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.is_active }">Active?</p>
        <v-switch color="primary" v-model="form.is_active" hide-details></v-switch>
      </v-col>
    </v-row>
  </RightDrawer>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this supplier?" @confirm="remove" />
</template>
