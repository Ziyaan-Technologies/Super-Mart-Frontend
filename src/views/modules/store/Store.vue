<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const alerts = useAlerts();
const drawerAlerts = useAlerts();
const lookups = useLookups();
const status = ref<string | null>(null);
const areas = ref<any[]>([]);

const list = useListPage('clientstores', {
  kpis: false,
  exportName: 'Stores',
  filters: () => ({ status: status.value || undefined }),
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'BRANCH', align: 'start', key: 'store_name' },
  { title: 'LOCATION', align: 'start', key: 'city' },
  { title: 'HOURS', align: 'start', key: 'hours' },
  { title: 'POS', align: 'start', key: 'is_pos_active' },
  { title: 'DELIVERY', align: 'start', key: 'is_delivery_active' },
  { title: 'ACTIVE', align: 'start', key: 'is_active' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

const drawer = ref(false);
const drawerRef = ref<any>(null);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = ref<any>({});
const imageFile = ref<File | null>(null);
const ready = ref(false);
const deleteOpen = ref(false);
const deleteId = ref<number | null>(null);

async function loadAreas(cityId: number | null) {
  areas.value = cityId ? (await axios.get('areas/list', { params: { city_id: cityId } })).data : [];
}

async function openForm(item: any = null) {
  ready.value = false;
  drawerAlerts.clear();
  let data: any = null;
  if (item) {
    try {
      data = (await axios.get(`clientstores/${item.id}`)).data;
    } catch (error) {
      alerts.fail(error);
      return;
    }
  }
  editingId.value = data?.id || null;
  form.value = {
    store_name: data?.store_name || '',
    store_code: data?.store_code || '',
    store_phone: data?.store_phone || '',
    store_email: data?.store_email || '',
    address: data?.address || '',
    lat: data?.lat || '',
    lng: data?.lng || '',
    country_id: data ? data.country_id : authStore.client?.vendor?.country_id || null,
    city_id: data?.city_id || null,
    area_id: data?.area_id || null,
    opening_time: data?.opening_time?.slice(0, 5) || '',
    closing_time: data?.closing_time?.slice(0, 5) || '',
    is_pos_active: data?.is_pos_active ?? true,
    is_delivery_active: data?.is_delivery_active ?? false,
    is_active: data?.is_active ?? true,
    image_url: data?.image_url || '',
  };
  imageFile.value = null;
  drawer.value = true;
  drawerRef.value?.resetValidation();
  try {
    await Promise.all([lookups.loadCities(form.value.country_id), loadAreas(form.value.city_id)]);
  } catch (error) {
    drawerAlerts.fail(error);
  }
  ready.value = true;
}

watch(() => form.value.country_id, (value, previous) => {
  if (!ready.value || value === previous) return;
  form.value.city_id = null;
  lookups.loadCities(value).catch((error) => drawerAlerts.fail(error));
});

watch(() => form.value.city_id, (value, previous) => {
  if (!ready.value || value === previous) return;
  form.value.area_id = null;
  loadAreas(value).catch((error) => drawerAlerts.fail(error));
});

async function syncCurrentStore() {
  const stores = (await axios.get('clientstores/list')).data;
  const current = stores.find((store: any) => store.id === authStore.clientstoreId);
  if (current) {
    await authStore.storeLogin(current.id, current.store_name, true);
  } else if (stores.length) {
    await authStore.storeLogin(stores[0].id, stores[0].store_name, true);
  } else {
    authStore.clearStore();
  }
}

async function save() {
  if (!(await drawerRef.value.validate())) return;
  saving.value = true;
  try {
    const payload: Record<string, any> = {
      ...form.value,
      store_name: form.value.store_name.trim(),
      store_code: form.value.store_code.trim().toUpperCase(),
      store_email: form.value.store_email || undefined,
      opening_time: form.value.opening_time || undefined,
      closing_time: form.value.closing_time || undefined,
      area_id: form.value.area_id || null,
    };
    const image = await uploadImage('store', imageFile.value);
    if (image) payload.image_url = image;
    if (!payload.image_url) delete payload.image_url;
    if (editingId.value) {
      await axios.put(`clientstores/${editingId.value}`, payload);
      alerts.success('Branch has been updated!');
    } else {
      await axios.post('clientstores', payload);
      alerts.success('Branch has been created!');
    }
    drawer.value = false;
    list.refresh();
    await syncCurrentStore();
  } catch (error) {
    drawerAlerts.fail(error);
  } finally {
    saving.value = false;
  }
}

async function switchStore(item: any) {
  try {
    await authStore.storeLogin(item.id, item.store_name, true);
    alerts.success(`Now working in ${item.store_name}`);
  } catch (error) {
    alerts.fail(error);
  }
}

function openDelete(item: any) {
  deleteId.value = item.id;
  deleteOpen.value = true;
}

async function remove() {
  try {
    await axios.delete(`clientstores/${deleteId.value}`);
    alerts.success('Branch has been deleted!');
    list.refresh();
    await syncCurrentStore();
  } catch (error) {
    alerts.fail(error);
  }
}

function hours(item: any) {
  return item.opening_time && item.closing_time ? `${item.opening_time.slice(0, 5)} - ${item.closing_time.slice(0, 5)}` : '-';
}

onMounted(async () => {
  try {
    await lookups.loadCountries();
  } catch (error) {
    alerts.fail(error);
  }
  if (route.query.add && can('store_create', 'Store') && !authStore.isStoreBound) {
    router.replace({ query: {} });
    openForm();
  }
});

watch(() => route.query.add, (value) => {
  if (value && can('store_create', 'Store') && !authStore.isStoreBound) {
    router.replace({ query: {} });
    openForm();
  }
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Branches" icon="mdi-store-outline">
        <ListToolbar :total="list.totalItems.value" label="Total Branches" search-placeholder="Search name, code, phone..."
          add-label="Add New Branch" :can-add="can('store_create', 'Store') && !authStore.isStoreBound" exportable :exporting="list.exporting.value"
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
          <template v-slot:item.store_name="{ item }">
            <div class="d-flex align-center">
              <v-avatar size="30" rounded="md" color="grey100">
                <v-img v-if="item.image_url" :src="item.image_url" cover />
                <v-icon v-else size="18" color="primary">mdi-store-outline</v-icon>
              </v-avatar>
              <div class="ml-3">
                <div class="text-subtitle-2">
                  {{ item.store_name }}
                  <v-chip v-if="item.id === authStore.clientstoreId" size="x-small" color="primary" variant="tonal" class="ml-1">Current</v-chip>
                </div>
                <div class="text-caption text-lightText">{{ item.store_code }} · {{ item.store_phone || 'No phone' }}</div>
              </div>
            </div>
          </template>
          <template v-slot:item.city="{ item }">
            <div>{{ [item.area?.name, item.city?.name].filter(Boolean).join(', ') || '-' }}</div>
            <div class="text-caption text-lightText">{{ item.address }}</div>
          </template>
          <template v-slot:item.hours="{ item }">{{ hours(item) }}</template>
          <template v-slot:item.is_pos_active="{ item }"><ActiveIcon :active="item.is_pos_active" /></template>
          <template v-slot:item.is_delivery_active="{ item }"><ActiveIcon :active="item.is_delivery_active" /></template>
          <template v-slot:item.is_active="{ item }"><ActiveIcon :active="item.is_active" /></template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex align-center">
              <v-btn v-if="!authStore.isStoreBound && item.is_active && item.id !== authStore.clientstoreId" icon="mdi-login-variant" color="#EFF0F1"
                size="small" class="me-2" title="Work in this branch" @click="switchStore(item)"></v-btn>
              <v-btn v-if="$can('store_edit', 'Store')" icon="mdi-pencil-outline" color="#EFF0F1" size="small" class="me-2" @click="openForm(item)"></v-btn>
              <v-btn v-if="$can('store_delete', 'Store') && !authStore.isStoreBound" icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="openDelete(item)"></v-btn>
            </div>
          </template>
          <template v-slot:no-data>
            <p class="px-2 py-2">No branches yet</p>
            <v-btn color="primary" @click="list.fetchData()">Refresh</v-btn>
          </template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <RightDrawer ref="drawerRef" v-model="drawer" :title="editingId ? 'Edit Branch' : 'Add New Branch'"
    :submit-label="editingId ? 'Update Branch' : 'Create Branch'" max-width="600" :loading="saving"
    :show-error-alert="drawerAlerts.showErrorAlert.value" :error-text="drawerAlerts.errorText.value"
    @submit="save" @close-error="drawerAlerts.clear()">
    <v-row>
      <v-col cols="12" sm="6" class="pt-4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Branch Name</v-label>
        <v-text-field v-model="form.store_name" :rules="[rules.required]" placeholder="e.g. Main Branch" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6" class="pt-sm-4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Branch Code</v-label>
        <v-text-field v-model="form.store_code" :rules="[rules.required]" placeholder="e.g. MAIN" hint="Used on bill numbers" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Phone</v-label>
        <v-text-field v-model="form.store_phone" hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Email</v-label>
        <v-text-field v-model="form.store_email" type="email" :rules="[rules.email]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Country</v-label>
        <v-autocomplete v-model="form.country_id" :items="lookups.countries.value" item-title="name" item-value="id" :rules="[rules.requiredSelect]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">City</v-label>
        <v-autocomplete v-model="form.city_id" :items="lookups.cities.value" item-title="name" item-value="id" :disabled="!form.country_id" :rules="[rules.requiredSelect]" hide-details="auto" />
      </v-col>
      <v-col cols="12" sm="4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Area</v-label>
        <v-autocomplete v-model="form.area_id" :items="areas" item-title="name" item-value="id" :disabled="!form.city_id" clearable hide-details />
      </v-col>
      <v-col cols="12">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Address</v-label>
        <v-text-field v-model="form.address" hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Latitude</v-label>
        <v-text-field v-model="form.lat" hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Longitude</v-label>
        <v-text-field v-model="form.lng" hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Opens At</v-label>
        <v-text-field v-model="form.opening_time" type="time" hide-details />
      </v-col>
      <v-col cols="12" sm="6">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Closes At</v-label>
        <v-text-field v-model="form.closing_time" type="time" hide-details />
      </v-col>
      <v-col cols="12">
        <ImageField v-model="imageFile" :existing-url="form.image_url" label="Branch Image" />
      </v-col>
      <v-col cols="12" class="py-0 d-flex align-center justify-space-between">
        <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.is_active }">Active?</p>
        <v-switch color="primary" v-model="form.is_active" hide-details></v-switch>
      </v-col>
      <v-col cols="12" class="py-0 d-flex align-center justify-space-between">
        <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.is_pos_active }">POS Active?</p>
        <v-switch color="primary" v-model="form.is_pos_active" hide-details></v-switch>
      </v-col>
      <v-col cols="12" class="py-0 d-flex align-center justify-space-between">
        <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.is_delivery_active }">Delivery Active?</p>
        <v-switch color="primary" v-model="form.is_delivery_active" hide-details></v-switch>
      </v-col>
    </v-row>
  </RightDrawer>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this branch?" @confirm="remove" />
</template>
