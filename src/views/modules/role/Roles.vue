<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import ListToolbar from '@/components/shared/ListToolbar.vue';
import TableBottom from '@/components/shared/TableBottom.vue';
import RightDrawer from '@/components/shared/RightDrawer.vue';
import DeleteDialog from '@/components/shared/DeleteDialog.vue';
import { useListPage } from '@/composables/useListPage';
import { useAlerts } from '@/composables/useAlerts';
import { can } from '@/utils/permissions';
import { rules } from '@/utils/api';
import type { Header } from '@/models/type-interfaces';

const alerts = useAlerts();
const drawerAlerts = useAlerts();
const groups = ref<any[]>([]);

const list = useListPage('roles', {
  kpis: false,
  onError: (error) => alerts.fail(error),
});

const headers = ref<Header[]>([
  { title: 'ID', align: 'start', key: 'id' },
  { title: 'ROLE', align: 'start', key: 'name' },
  { title: 'ACTIONS', key: 'actions', sortable: false },
]);

const drawer = ref(false);
const drawerRef = ref<any>(null);
const saving = ref(false);
const editing = ref<any>(null);
const viewOnly = ref(false);
const form = ref<{ name: string; permissions: number[] }>({ name: '', permissions: [] });
const deleteOpen = ref(false);
const deleteId = ref<number | null>(null);

const allPermissions = computed(() => groups.value.flatMap((group: any) => group.permissions));

function moduleIds(group: any) {
  return group.permissions.map((permission: any) => permission.id);
}

function isModuleSelected(group: any) {
  const ids = moduleIds(group);
  return ids.length > 0 && ids.every((id: number) => form.value.permissions.includes(id));
}

function isModulePartial(group: any) {
  const ids = moduleIds(group);
  const count = ids.filter((id: number) => form.value.permissions.includes(id)).length;
  return count > 0 && count < ids.length;
}

function toggleModule(group: any, checked: boolean) {
  const ids = moduleIds(group);
  form.value.permissions = checked
    ? Array.from(new Set([...form.value.permissions, ...ids]))
    : form.value.permissions.filter((id) => !ids.includes(id));
}

function selectAll(checked: boolean) {
  form.value.permissions = checked ? allPermissions.value.map((permission: any) => permission.id) : [];
}

async function openForm(item: any = null, readonly = false) {
  drawerAlerts.clear();
  editing.value = item;
  viewOnly.value = readonly;
  form.value = { name: '', permissions: [] };
  if (item) {
    try {
      const role = (await axios.get(`roles/${item.id}`)).data;
      form.value = { name: role.name, permissions: (role.permissions || []).map((permission: any) => permission.id) };
    } catch (error) {
      alerts.fail(error);
      return;
    }
  }
  drawer.value = true;
  drawerRef.value?.resetValidation();
}

async function save() {
  if (viewOnly.value) {
    drawer.value = false;
    return;
  }
  if (!(await drawerRef.value.validate())) return;
  saving.value = true;
  try {
    const payload = { name: form.value.name.trim(), permissions: form.value.permissions };
    if (editing.value) {
      await axios.put(`roles/${editing.value.id}`, payload);
      alerts.success('Role has been updated!');
    } else {
      await axios.post('roles', payload);
      alerts.success('Role has been created!');
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
    await axios.delete(`roles/${deleteId.value}`);
    alerts.success('Role has been deleted!');
    list.refresh();
  } catch (error) {
    alerts.fail(error);
  }
}

onMounted(async () => {
  try {
    groups.value = (await axios.get('permissions/list')).data;
  } catch (error) {
    alerts.fail(error);
  }
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard>
        <ListToolbar :total="list.totalItems.value" label="Roles" search-placeholder="Search role..." add-label="Add New Role"
          :can-add="can('roles_create', 'Roles')" @search="list.onSearch" @add="openForm()" />

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
            <span class="font-weight-bold">{{ item.name }}</span>
            <v-chip v-if="item.is_system" size="x-small" class="ml-2" variant="tonal" color="primary">Built in</v-chip>
          </template>
          <template v-slot:item.actions="{ item }">
            <div class="d-flex">
              <v-btn icon="mdi-eye-outline" color="#EFF0F1" size="small" class="me-2" title="See permissions" @click="openForm(item, true)"></v-btn>
              <template v-if="!item.is_system">
                <v-btn v-if="$can('roles_edit', 'Roles')" icon="mdi-pencil-outline" color="#EFF0F1" size="small" class="me-2" @click="openForm(item)"></v-btn>
                <v-btn v-if="$can('roles_delete', 'Roles')" icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="openDelete(item)"></v-btn>
              </template>
            </div>
          </template>
          <template v-slot:no-data><p class="px-2 py-2">No roles found</p></template>
          <template v-slot:bottom>
            <TableBottom v-model:page="list.currentPage.value" :page-count="list.pageCount.value" v-model:per-page="list.itemsPerPageInput.value" :total="list.totalItems.value" />
          </template>
        </v-data-table>
      </UiParentCard>
    </v-col>
  </v-row>

  <RightDrawer ref="drawerRef" v-model="drawer" :title="viewOnly ? form.name : editing ? 'Edit Role' : 'Add New Role'" icon="mdi-shield-account-outline"
    :subtitle="`${form.permissions.length} of ${allPermissions.length} permissions ticked`" :submit-label="viewOnly ? 'Close' : editing ? 'Update Role' : 'Create Role'"
    max-width="760" :loading="saving" :show-error-alert="drawerAlerts.showErrorAlert.value" :error-text="drawerAlerts.errorText.value"
    @submit="save" @close-error="drawerAlerts.clear()">
    <v-row>
      <v-col v-if="!viewOnly" cols="12" class="pt-4">
        <v-label class="text-subtitle-1 pb-2 text-lightText">Role Title</v-label>
        <v-text-field v-model="form.name" :rules="[rules.required]" placeholder="e.g. Senior Cashier" hide-details="auto" />
      </v-col>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-2">
          <h4>Permissions</h4>
          <v-checkbox v-if="!viewOnly" label="Tick everything" :model-value="form.permissions.length === allPermissions.length" hide-details density="compact" color="primary"
            @update:model-value="(value) => selectAll(!!value)" />
        </div>
        <div v-for="group in groups" :key="group.module_name" class="permission-group">
          <v-checkbox :label="group.module_name" :model-value="isModuleSelected(group)" :indeterminate="isModulePartial(group)"
            :disabled="viewOnly" color="primary" class="font-weight-bold" hide-details density="compact"
            @update:model-value="(value) => toggleModule(group, !!value)" />
          <v-row dense class="ml-6">
            <v-col v-for="permission in group.permissions" :key="permission.id" cols="12" sm="6" md="4" class="py-0">
              <v-checkbox v-model="form.permissions" :label="permission.name" :value="permission.id" :disabled="viewOnly" color="primary" hide-details density="compact" />
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>
  </RightDrawer>

  <DeleteDialog v-model="deleteOpen" message="Are you sure you want to delete this role?" hint="Roles that users still have cannot be deleted." @confirm="remove" />
</template>

<style scoped>
.permission-group {
  padding: 6px 10px 8px;
  margin-bottom: 8px;
  border: 1px solid rgb(var(--v-theme-borderColor));
  border-radius: 10px;
}
</style>
