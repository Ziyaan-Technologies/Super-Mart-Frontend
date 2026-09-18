<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import ListToolbar from '@/components/shared/ListToolbar.vue';
import TableBottom from '@/components/shared/TableBottom.vue';
import RightDrawer from '@/components/shared/RightDrawer.vue';
import DeleteDialog from '@/components/shared/DeleteDialog.vue';
import ActiveIcon from '@/components/shared/ActiveIcon.vue';
import ImageField from '@/components/shared/ImageField.vue';
import { useListPage } from '@/composables/useListPage';
import { useAlerts } from '@/composables/useAlerts';
import { useLookups } from '@/composables/useLookups';
import { useAuthStore } from '@/stores/auth';
import { can } from '@/utils/permissions';
import { rules, uploadImage } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const authStore = useAuthStore();
const alerts = useAlerts();
const drawerAlerts = useAlerts();
const lookups = useLookups();
const stores = ref<any[]>([]);
const storeFilter = ref<number | null>(null);
const roleFilter = ref<number | null>(null);

const list = useListPage('clients', {
  kpis: false,
  exportName: 'Users',
  filters: () => ({ clientstore_id: storeFilter.value || undefined, role_id: roleFilter.value || undefined }),
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'NAME', align: 'start', key: 'full_name' },
  { title: 'EMAIL', align: 'start', key: 'email' },
  { title: 'PHONE', align: 'start', key: 'phone' },
  { title: 'ROLE', align: 'start', key: 'role' },
  { title: 'BRANCH', align: 'start', key: 'clientstore' },
  { title: 'ACTIVE', align: 'start', key: 'is_active' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

const storeOptions = computed(() => [
  ...(authStore.isStoreBound ? [] : [{ id: 0, store_name: 'All branches (business level)' }]),
  ...stores.value,
]);

const drawer = ref(false);
const drawerRef = ref<any>(null);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = ref<any>({});
const imageFile = ref<File | null>(null);
const deleteOpen = ref(false);
const deleteId = ref<number | null>(null);

const isSelf = computed(() => !!editingId.value && editingId.value === authStore.client?.id);

const roleNotes: Record<string, string> = {
  'Manager': 'Sees everything: sales, stock, products, users and settings.',
  'Cashier': 'Works the sale counter: scans items, takes Cash, Card or Online payment and prints the receipt.',
  'Product Entry': 'Adds products, categories and brands, and enters stock coming in.',
};

const selectedRoleNote = computed(() => {
  const role = lookups.roles.value.find((item: any) => item.id === form.value.role_id);
  return role ? roleNotes[role.name] || '' : '';
});

function isLocked(item: any) {
  return item.client_type === 'Owner';
}

function openForm(item: any = null) {
  editingId.value = item?.id || null;
  form.value = {
    full_name: item?.full_name || '',
    email: item?.email || '',
    phone: item?.phone || '',
    password: '',
    role_id: item?.role_id || null,
    clientstore_id: item ? item.clientstore_id || 0 : authStore.clientstoreId || 0,
    image_url: item?.image_url || '',
    is_active: item?.is_active ?? true,
  };
  imageFile.value = null;
  drawerAlerts.clear();
  drawer.value = true;
  drawerRef.value?.resetValidation();
}

async function save() {
  if (!(await drawerRef.value.validate())) return;
  saving.value = true;
  try {
    const { password, ...fields } = form.value;
    const payload: Record<string, any> = {
      ...fields,
      ...(password ? { password } : {}),
      full_name: fields.full_name.trim(),
      email: fields.email.trim(),
      phone: fields.phone.trim(),
      clientstore_id: fields.clientstore_id || null,
    };
    const image = await uploadImage('client', imageFile.value);
    if (image) payload.image_url = image;
    if (!payload.image_url) delete payload.image_url;
    if (isSelf.value) {
      delete payload.role_id;
      delete payload.clientstore_id;
      delete payload.is_active;
    }
    if (editingId.value) {
      await axios.put(`clients/${editingId.value}`, payload);
      alerts.success('User has been updated!');
    } else {
      await axios.post('clients', payload);
      alerts.success('User has been created!');
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
    await axios.delete(`clients/${deleteId.value}`);
    alerts.success('User has been deleted!');
    list.refresh();
  } catch (error) {
    alerts.fail(error);
  }
}

onMounted(async () => {
  try {
    const [storeResponse] = await Promise.all([axios.get('clientstores/list'), lookups.loadRoles()]);
    stores.value = storeResponse.data;
  } catch (error) {
    alerts.fail(error);
  }
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Users" icon="mdi-account-key-outline">
        <ListToolbar :total="list.totalItems.value" label="Total Users" search-placeholder="Search name, email, phone..."
          add-label="Add New User" :can-add="can('supervisor_create', 'Supervisor')" exportable :exporting="list.exporting.value"
          @search="list.onSearch" @add="openForm()" @export="list.exportFile">
          <template #filters>
            <div v-if="!authStore.isStoreBound">
              <v-select v-model="storeFilter" :items="stores" item-title="store_name" item-value="id" placeholder="All branches" clearable hide-details @update:model-value="list.reload()" />
            </div>
            <div>
              <v-select v-model="roleFilter" :items="lookups.roles.value" item-title="name" item-value="id" placeholder="All roles" clearable hide-details @update:model-value="list.reload()" />
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
          <template v-slot:item.full_name="{ item }">
            <div class="d-flex align-center">
              <v-avatar size="30" color="lightprimary">
                <v-img v-if="item.image_url" :src="item.image_url" cover />
                <span v-else class="text-caption font-weight-bold text-primary">{{ item.full_name?.charAt(0) }}</span>
              </v-avatar>
              <div class="ml-3">
                <span class="text-subtitle-2">{{ item.full_name }}</span>
                <v-chip v-if="item.client_type === 'Owner'" size="x-small" class="ml-2" variant="tonal" color="primary">Owner</v-chip>
                <v-chip v-if="item.id === authStore.client?.id" size="x-small" class="ml-1" variant="tonal">You</v-chip>
              </div>
            </div>
          </template>
          <template v-slot:item.role="{ item }"><span class="font-weight-bold">{{ item.role?.name || '-' }}</span></template>
          <template v-slot:item.clientstore="{ item }">{{ item.clientstore?.store_name || 'All branches' }}</template>
          <template v-slot:item.is_active="{ item }"><ActiveIcon :active="item.is_active" /></template>
          <template v-slot:item.actions="{ item }">
            <div v-if="!isLocked(item)" class="d-flex">
              <v-btn v-if="$can('supervisor_edit', 'Supervisor')" icon="mdi-pencil-outline" color="#EFF0F1" size="small" class="me-2" @click="openForm(item)"></v-btn>
              <v-btn v-if="$can('supervisor_delete', 'Supervisor') && item.id !== authStore.client?.id" icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="openDelete(item)"></v-btn>
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

  <RightDrawer ref="drawerRef" v-model="drawer" :title="editingId ? 'Edit User' : 'Add New User'" icon="mdi-account-key-outline"
    subtitle="Users linked to one branch only see that branch"
    :submit-label="editingId ? 'Update User' : 'Create User'" max-width="600" :loading="saving"
    :show-error-alert="drawerAlerts.showErrorAlert.value" :error-text="drawerAlerts.errorText.value"
    @submit="save" @close-error="drawerAlerts.clear()">
    <v-row>
      <v-col cols="12" sm="6" class="pt-4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Full Name</v-label>
        <v-text-field v-model="form.full_name" :rules="[rules.required]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6" class="pt-sm-4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Phone</v-label>
        <v-text-field v-model="form.phone" :rules="[rules.required]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Email (login)</v-label>
        <v-text-field v-model="form.email" type="email" :rules="[rules.required, rules.email]" autocomplete="off" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">{{ editingId ? 'New Password (optional)' : 'Password' }}</v-label>
        <v-text-field v-model="form.password" type="password" autocomplete="new-password"
          :rules="editingId ? [rules.minLength(6)] : [rules.required, rules.minLength(6)]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Role</v-label>
        <v-select v-model="form.role_id" :items="lookups.roles.value" item-title="name" item-value="id" :disabled="isSelf"
          :rules="isSelf ? [] : [rules.requiredSelect]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Branch</v-label>
        <v-select v-model="form.clientstore_id" :items="storeOptions" item-title="store_name" item-value="id"
          :disabled="authStore.isStoreBound || isSelf" hide-details />
      </v-col>
      <v-col v-if="selectedRoleNote" cols="12" class="py-0">
        <v-alert type="info" variant="tonal" density="compact" icon="mdi-shield-account-outline">{{ selectedRoleNote }}</v-alert>
      </v-col>
      <v-col cols="12">
        <ImageField v-model="imageFile" :existing-url="form.image_url" label="Photo" />
      </v-col>
      <v-col cols="12" class="pb-0 d-flex align-center justify-space-between">
        <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.is_active }">Active?</p>
        <v-switch color="primary" v-model="form.is_active" :disabled="isSelf" hide-details></v-switch>
      </v-col>
    </v-row>
  </RightDrawer>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this user?" @confirm="remove" />
</template>
