<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue';
import { useDisplay } from 'vuetify';
import { useMenuStore } from '@/stores/menu';
import { useAuthStore } from '@/stores/auth';

defineProps<{
  modelValue: boolean;
  mini: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'toggle-mini'): void;
}>();

const { mobile } = useDisplay();
const menuStore = useMenuStore();
const authStore = useAuthStore();
const instance = getCurrentInstance();
const ability = instance?.appContext.config.globalProperties.$ability;
const abilityReady = instance?.appContext.config.globalProperties.$abilityReady;

const groups = computed(() => {
  if (!abilityReady?.value || !ability?.value) return [];
  return menuStore.groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.action || !item.subject || ability.value.can(item.action, item.subject)),
    }))
    .filter((group) => group.items.length);
});
</script>

<template>
  <v-navigation-drawer left :model-value="modelValue" elevation="0" rail-width="75" app class="leftSidebar"
    :rail="!mobile && mini" :expand-on-hover="!mobile" :permanent="!mobile" width="256"
    @update:model-value="emit('update:modelValue', $event)">
    <perfect-scrollbar class="scrollnavbar">
      <div class="sidebar-brand d-flex align-center justify-space-between px-5 py-5">
        <RouterLink to="/" class="brand-logo">
          <span class="mini-text">SUPER MART</span>
          <span class="mini-icon brand-logo-mark">S</span>
        </RouterLink>
        <v-btn variant="text" icon size="small" class="brand-collapse mini-text" @click="emit('toggle-mini')">
          <v-icon size="22">mdi-page-layout-sidebar-left</v-icon>
        </v-btn>
      </div>

      <div v-if="authStore.storeName" class="sidebar-branch mini-text mx-4 mb-2">
        <v-icon size="16" color="primary">mdi-store-marker-outline</v-icon>
        <span class="text-truncate">{{ authStore.storeName }}</span>
      </div>

      <v-list class="py-2 px-4">
        <template v-for="group in groups" :key="group.title">
          <v-list-subheader class="smallCap text-subtitle-2 d-flex align-items-center">
            <span class="mini-icon"><v-icon size="16">mdi-dots-horizontal</v-icon></span>
            <span class="mini-text">{{ group.title }}</span>
          </v-list-subheader>
          <v-list-item v-for="item in group.items" :key="item.to" :to="item.to" rounded class="mb-1 leftPadding">
            <template v-slot:prepend>
              <v-icon size="20">{{ item.icon }}</v-icon>
            </template>
            <v-list-item-title>{{ item.title }}</v-list-item-title>
          </v-list-item>
        </template>
      </v-list>
    </perfect-scrollbar>
  </v-navigation-drawer>
</template>

<style scoped>
.sidebar-branch {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid rgb(var(--v-theme-borderColor));
  border-radius: 8px;
  background: rgb(var(--v-theme-lightprimary));
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}
</style>
