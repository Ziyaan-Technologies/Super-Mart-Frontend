<script setup lang="ts">
import { computed, getCurrentInstance, onBeforeUnmount, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import AdminShell from './AdminShell.vue';
import PosShell from './PosShell.vue';
import { useMenuStore } from '@/stores/menu';

const route = useRoute();
const menuStore = useMenuStore();
const instance = getCurrentInstance();
const ability = instance?.appContext.config.globalProperties.$ability;
const abilityReady = instance?.appContext.config.globalProperties.$abilityReady;

const visibleItems = computed(() => {
  if (!abilityReady?.value || !ability?.value) return [];
  return menuStore.groups.flatMap((group) => group.items)
    .filter((item) => !item.action || !item.subject || ability.value.can(item.action, item.subject));
});

const counterOnly = computed(() => abilityReady?.value && visibleItems.value.length <= 1);

watchEffect(() => {
  document.documentElement.classList.toggle('pos-ui', counterOnly.value || route.path === '/pos');
});

onBeforeUnmount(() => document.documentElement.classList.remove('pos-ui'));
</script>

<template>
  <PosShell v-if="counterOnly" />
  <AdminShell v-else />
</template>
