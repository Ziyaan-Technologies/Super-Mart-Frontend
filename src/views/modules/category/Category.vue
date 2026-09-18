<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import ListToolbar from '@/components/shared/ListToolbar.vue';
import RightDrawer from '@/components/shared/RightDrawer.vue';
import DeleteDialog from '@/components/shared/DeleteDialog.vue';
import ImageField from '@/components/shared/ImageField.vue';
import CategoryNode from './CategoryNode.vue';
import { useAlerts } from '@/composables/useAlerts';
import { can } from '@/utils/permissions';
import { rules, uploadImage } from '@/utils/api';

const alerts = useAlerts();
const drawerAlerts = useAlerts();
const tree = ref<any[]>([]);
const loading = ref(false);
const search = ref('');

const flat = computed(() => {
  const rows: any[] = [];
  const walk = (nodes: any[]) => nodes.forEach((node) => {
    rows.push(node);
    walk(node.children);
  });
  walk(tree.value);
  return rows;
});

const filteredTree = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return tree.value;
  const filter = (nodes: any[]): any[] => nodes
    .map((node) => ({ ...node, children: filter(node.children) }))
    .filter((node) => node.name.toLowerCase().includes(term) || node.children.length);
  return filter(tree.value);
});

const stats = computed(() => ({
  departments: flat.value.filter((node) => node.level === 1).length,
  aisles: flat.value.filter((node) => node.level === 2).length,
  categories: flat.value.filter((node) => node.level === 3).length,
}));

const drawer = ref(false);
const drawerRef = ref<any>(null);
const saving = ref(false);
const editing = ref<any>(null);
const form = ref<any>({});
const imageFile = ref<File | null>(null);
const deleteOpen = ref(false);
const deleteId = ref<number | null>(null);

const parentOptions = computed(() => flat.value.filter((node) => node.level < 3
  && node.id !== editing.value?.id
  && !(editing.value?.path && node.path.startsWith(`${editing.value.path} /`))));

async function load() {
  loading.value = true;
  try {
    tree.value = (await axios.get('categories/tree', { params: { active: '0' } })).data;
  } catch (error) {
    alerts.fail(error);
  } finally {
    loading.value = false;
  }
}

function fillForm(data: any, parentId: number | null) {
  form.value = {
    name: data?.name || '',
    parent_id: data ? data.parent_id || null : parentId,
    description: data?.description || '',
    sort_order: data?.sort_order ?? 0,
    image_url: data?.image_url || '',
    is_active: data?.is_active ?? true,
  };
  imageFile.value = null;
  drawerAlerts.clear();
  drawer.value = true;
  drawerRef.value?.resetValidation();
}

function openCreate(parent: any = null) {
  editing.value = null;
  fillForm(null, parent?.id || null);
}

async function openEdit(node: any) {
  try {
    const data = (await axios.get(`categories/${node.id}`)).data;
    editing.value = { ...data, path: node.path };
    fillForm(data, null);
  } catch (error) {
    alerts.fail(error);
  }
}

async function save() {
  if (!(await drawerRef.value.validate())) return;
  saving.value = true;
  try {
    const payload: Record<string, any> = {
      ...form.value,
      name: form.value.name.trim(),
      sort_order: Number(form.value.sort_order) || 0,
    };
    const image = await uploadImage('category', imageFile.value);
    if (image) payload.image_url = image;
    if (!payload.image_url) delete payload.image_url;
    if (editing.value?.id) {
      await axios.put(`categories/${editing.value.id}`, payload);
      alerts.success('Category has been updated!');
    } else {
      await axios.post('categories', { ...payload, parent_id: payload.parent_id || undefined });
      alerts.success('Category has been created!');
    }
    drawer.value = false;
    load();
  } catch (error) {
    drawerAlerts.fail(error);
  } finally {
    saving.value = false;
  }
}

function openDelete(node: any) {
  deleteId.value = node.id;
  deleteOpen.value = true;
}

async function remove() {
  try {
    await axios.delete(`categories/${deleteId.value}`);
    alerts.success('Category has been deleted!');
    load();
  } catch (error) {
    alerts.fail(error);
  }
}

onMounted(load);
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Categories" icon="mdi-shape-outline">
        <ListToolbar :total="flat.length" label="Total Categories" search-placeholder="Search categories..."
          add-label="Add New Department" :can-add="can('categories_create', 'Category')" @search="(value) => (search = value)" @add="openCreate()" />

        <div class="d-flex flex-wrap gap-2 mb-4">
          <v-chip variant="tonal" color="primary" prepend-icon="mdi-store-outline">{{ stats.departments }} Departments</v-chip>
          <v-chip variant="tonal" color="primary" prepend-icon="mdi-view-column-outline">{{ stats.aisles }} Aisles</v-chip>
          <v-chip variant="tonal" color="primary" prepend-icon="mdi-shape-outline">{{ stats.categories }} Categories</v-chip>
        </div>

        <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-4 single-line-alert" closable>
          <template v-slot:prepend><v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon></template>
        </v-alert>
        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />

        <div class="border rounded-md">
          <v-skeleton-loader v-if="loading" type="table-row@8" />
          <template v-else>
            <CategoryNode v-for="node in filteredTree" :key="node.id" :node="node" :force-open="!!search"
              @add-child="openCreate" @edit="openEdit" @delete="openDelete" />
            <p v-if="!filteredTree.length" class="px-4 py-6 text-center text-lightText">
              No categories yet. Start with a department such as "Grocery" or "Dairy".
            </p>
          </template>
        </div>
      </UiParentCard>
    </v-col>
  </v-row>

  <RightDrawer ref="drawerRef" v-model="drawer" :title="editing ? 'Edit Category' : 'Add New Category'"
    subtitle="Departments hold aisles, aisles hold categories"
    :submit-label="editing ? 'Update Category' : 'Create Category'" :loading="saving"
    :show-error-alert="drawerAlerts.showErrorAlert.value" :error-text="drawerAlerts.errorText.value"
    @submit="save" @close-error="drawerAlerts.clear()">
    <v-row>
      <v-col cols="12" class="pt-4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Name</v-label>
        <v-text-field v-model="form.name" :rules="[rules.required]" hide-details="auto" />
      </v-col>
      <v-col cols="12">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Parent</v-label>
        <v-autocomplete v-model="form.parent_id" :items="parentOptions" item-title="path" item-value="id" clearable
          placeholder="Top level (department)" hide-details />
      </v-col>
      <v-col cols="12">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Description</v-label>
        <v-textarea v-model="form.description" rows="2" auto-grow hide-details />
      </v-col>
      <v-col cols="12">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Sort Order</v-label>
        <v-text-field v-model="form.sort_order" type="number" hide-details />
      </v-col>
      <v-col cols="12">
        <ImageField v-model="imageFile" :existing-url="form.image_url" />
      </v-col>
      <v-col cols="12" class="pb-0 d-flex align-center justify-space-between">
        <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.is_active }">Active?</p>
        <v-switch color="primary" v-model="form.is_active" hide-details></v-switch>
      </v-col>
    </v-row>
  </RightDrawer>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this category?" hint="Categories with products or sub-categories cannot be deleted." @confirm="remove" />
</template>
