<script setup lang="ts">
import { ref } from 'vue';
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
import { can } from '@/utils/permissions';
import { formatDate, uploadImage } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const alerts = useAlerts();
const drawerAlerts = useAlerts();
const status = ref<string | null>(null);

const list = useListPage('brands', {
  kpis: false,
  exportName: 'Brands',
  filters: () => ({ status: status.value || undefined }),
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'NAME', align: 'start', key: 'name' },
  { title: 'DESCRIPTION', align: 'start', key: 'description' },
  { title: 'CREATED', align: 'start', key: 'created_at' },
  { title: 'ACTIVE', align: 'start', key: 'is_active' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

const drawer = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = ref<any>({});
const drawerRef = ref<any>(null);
const imageFile = ref<File | null>(null);
const deleteOpen = ref(false);
const deleteId = ref<number | null>(null);

function openForm(item: any = null) {
  editingId.value = item?.id || null;
  form.value = {
    name: item?.name || '',
    description: item?.description || '',
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
    const payload = { ...form.value, name: form.value.name.trim() };
    const image = await uploadImage('brand', imageFile.value);
    if (image) payload.image_url = image;
    if (!payload.image_url) delete payload.image_url;
    if (editingId.value) {
      await axios.put(`brands/${editingId.value}`, payload);
      alerts.success('Brand has been updated!');
    } else {
      await axios.post('brands', payload);
      alerts.success('Brand has been created!');
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
    await axios.delete(`brands/${deleteId.value}`);
    alerts.success('Brand has been deleted!');
    list.refresh();
  } catch (error) {
    alerts.fail(error);
  }
}
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Brands" icon="mdi-tag-multiple-outline">
        <ListToolbar :total="list.totalItems.value" label="Total Brands" search-placeholder="Search by name..."
          add-label="Add New Brand" :can-add="can('brands_create', 'Brand')" exportable :exporting="list.exporting.value"
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
            <div class="d-flex align-center">
              <v-avatar size="28" rounded="md" color="grey100">
                <v-img v-if="item.image_url" :src="item.image_url" cover />
                <span v-else class="text-caption font-weight-bold">{{ item.name?.charAt(0) }}</span>
              </v-avatar>
              <span class="text-subtitle-2 ml-3">{{ item.name }}</span>
            </div>
          </template>
          <template v-slot:item.description="{ item }">{{ item.description || '-' }}</template>
          <template v-slot:item.created_at="{ item }">{{ formatDate(item.created_at) }}</template>
          <template v-slot:item.is_active="{ item }"><ActiveIcon :active="item.is_active" /></template>
          <template v-slot:item.actions="{ item }">
            <v-btn v-if="$can('brands_edit', 'Brand')" icon="mdi-pencil-outline" color="#EFF0F1" size="small" class="me-2" @click="openForm(item)"></v-btn>
            <v-btn v-if="$can('brands_delete', 'Brand')" icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="openDelete(item)"></v-btn>
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

  <RightDrawer ref="drawerRef" v-model="drawer" :title="editingId ? 'Edit Brand' : 'Add New Brand'" :submit-label="editingId ? 'Update Brand' : 'Create Brand'"
    :loading="saving" :show-error-alert="drawerAlerts.showErrorAlert.value" :error-text="drawerAlerts.errorText.value"
    @submit="save" @close-error="drawerAlerts.clear()">
    <v-row>
      <v-col cols="12" class="pt-4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Name</v-label>
        <v-text-field v-model="form.name" :rules="[(v: string) => !!v?.trim() || 'Name is required']" placeholder="e.g. Nestle" hide-details="auto" />
      </v-col>
      <v-col cols="12">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Description</v-label>
        <v-textarea v-model="form.description" rows="2" auto-grow hide-details />
      </v-col>
      <v-col cols="12">
        <ImageField v-model="imageFile" :existing-url="form.image_url" label="Logo" />
      </v-col>
      <v-col cols="12" class="pb-0 d-flex align-center justify-space-between">
        <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.is_active }">Active?</p>
        <v-switch color="primary" v-model="form.is_active" hide-details></v-switch>
      </v-col>
    </v-row>
  </RightDrawer>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this brand?" @confirm="remove" />
</template>
