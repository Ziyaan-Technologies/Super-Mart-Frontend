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
import { formatDate, formatNumber, rules } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const alerts = useAlerts();
const drawerAlerts = useAlerts();
const lookups = useLookups();
const status = ref<string | null>(null);

const list = useListPage('users', {
  kpis: false,
  exportName: 'Customers',
  filters: () => ({ status: status.value || undefined }),
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'NAME', align: 'start', key: 'full_name' },
  { title: 'PHONE', align: 'start', key: 'phone' },
  { title: 'EMAIL', align: 'start', key: 'email' },
  { title: 'CITY', align: 'start', key: 'city' },
  { title: 'LOYALTY POINTS', align: 'start', key: 'loyalty_points' },
  { title: 'JOINED', align: 'start', key: 'created_at' },
  { title: 'ACTIVE', align: 'start', key: 'is_active' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

const genders = ['Male', 'Female', 'Other'];
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
    full_name: item?.full_name || '',
    phone: item?.phone || '',
    email: item?.email || '',
    password: '',
    gender: item?.gender || null,
    birthday: item?.birthday || '',
    address: item?.address || '',
    city_id: item?.city_id || null,
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
    const { password, ...fields } = form.value;
    const payload = {
      ...fields,
      ...(password ? { password } : {}),
      full_name: fields.full_name.trim(),
      phone: fields.phone.trim(),
      email: fields.email || undefined,
      birthday: fields.birthday || undefined,
      gender: fields.gender || undefined,
      city_id: fields.city_id || null,
    };
    if (editingId.value) {
      await axios.put(`users/${editingId.value}`, payload);
      alerts.success('Customer has been updated!');
    } else {
      await axios.post('users', payload);
      alerts.success('Customer has been created!');
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
    await axios.delete(`users/${deleteId.value}`);
    alerts.success('Customer has been deleted!');
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
      <UiParentCard title="Customers" icon="mdi-account-group-outline">
        <ListToolbar :total="list.totalItems.value" label="Total Customers" search-placeholder="Search name, phone, email..."
          add-label="Add New Customer" :can-add="can('customers_create', 'Customers')" exportable :exporting="list.exporting.value"
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
          <template v-slot:item.full_name="{ item }"><span class="text-subtitle-2">{{ item.full_name }}</span></template>
          <template v-slot:item.email="{ item }">{{ item.email || '-' }}</template>
          <template v-slot:item.city="{ item }">{{ item.city?.name || '-' }}</template>
          <template v-slot:item.loyalty_points="{ item }">{{ formatNumber(item.loyalty_points, 0) }}</template>
          <template v-slot:item.created_at="{ item }">{{ formatDate(item.created_at) }}</template>
          <template v-slot:item.is_active="{ item }"><ActiveIcon :active="item.is_active" /></template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex">
              <v-btn v-if="$can('customers_edit', 'Customers')" icon="mdi-pencil-outline" color="#EFF0F1" size="small" class="me-2" @click="openForm(item)"></v-btn>
              <v-btn v-if="$can('customers_delete', 'Customers')" icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="openDelete(item)"></v-btn>
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

  <RightDrawer ref="drawerRef" v-model="drawer" :title="editingId ? 'Edit Customer' : 'Add New Customer'" :submit-label="editingId ? 'Update Customer' : 'Create Customer'"
    max-width="600" :loading="saving" :show-error-alert="drawerAlerts.showErrorAlert.value" :error-text="drawerAlerts.errorText.value"
    @submit="save" @close-error="drawerAlerts.clear()">
    <v-row>
      <v-col cols="12" sm="6" class="pt-4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Full Name</v-label>
        <v-text-field v-model="form.full_name" :rules="[rules.required]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6" class="pt-sm-4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Phone</v-label>
        <v-text-field v-model="form.phone" :rules="[rules.required]" placeholder="03XXXXXXXXX" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Email</v-label>
        <v-text-field v-model="form.email" type="email" :rules="[rules.email]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">{{ editingId ? 'New Password (optional)' : 'Password (optional)' }}</v-label>
        <v-text-field v-model="form.password" type="password" autocomplete="new-password" :rules="[rules.minLength(6)]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Gender</v-label>
        <v-select v-model="form.gender" :items="genders" clearable hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Birthday</v-label>
        <v-text-field v-model="form.birthday" type="date" hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">City</v-label>
        <v-autocomplete v-model="form.city_id" :items="lookups.cities.value" item-title="name" item-value="id" clearable hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Address</v-label>
        <v-text-field v-model="form.address" hide-details />
      </v-col>
      <v-col cols="12" class="pb-0 d-flex align-center justify-space-between">
        <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.is_active }">Active?</p>
        <v-switch color="primary" v-model="form.is_active" hide-details></v-switch>
      </v-col>
    </v-row>
  </RightDrawer>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this customer?" @confirm="remove" />
</template>
