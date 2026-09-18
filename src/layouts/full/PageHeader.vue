<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useMenuStore } from '@/stores/menu';

const route = useRoute();
const menuStore = useMenuStore();

const items = computed(() => menuStore.groups.flatMap((group) => group.items.map((item) => ({ ...item, group: group.title }))));

const current = computed(() => items.value
  .filter((item) => route.path === item.to || route.path.startsWith(`${item.to}/`))
  .sort((a, b) => b.to.length - a.to.length)[0]);

const title = computed(() => {
  const parentTitle = current.value?.title;
  if (parentTitle && route.path === current.value.to) return parentTitle;
  const name = String(route.name || '');
  if (parentTitle) {
    if (name.endsWith('Create')) return `New ${parentTitle}`;
    if (name.endsWith('Edit')) return `Edit ${parentTitle}`;
    if (name.endsWith('Detail')) return `${parentTitle} Detail`;
  }
  return name.replace(/([a-z])([A-Z])/g, '$1 $2') || parentTitle || 'Super Mart';
});

const parent = computed(() => (current.value && route.path !== current.value.to ? current.value : null));
</script>

<template>
  <div class="ui-page-header">
    <div class="page-breadcrumb">
      <RouterLink to="/" class="page-breadcrumb__link">Home</RouterLink>
      <v-icon size="14">mdi-chevron-right</v-icon>
      <template v-if="parent">
        <RouterLink :to="parent.to" class="page-breadcrumb__link">{{ parent.title }}</RouterLink>
        <v-icon size="14">mdi-chevron-right</v-icon>
      </template>
      <span class="page-breadcrumb__current">{{ title }}</span>
    </div>
    <h2 class="page-title">{{ title }}</h2>
  </div>
</template>

<style scoped>
.ui-page-header {
  margin-bottom: 18px;
}

.page-breadcrumb {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  color: rgb(var(--v-theme-lightgray));
}

.page-breadcrumb__link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  font-weight: 500;
}

.page-breadcrumb__link:hover {
  text-decoration: underline;
}

.page-title {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.25;
  color: rgb(var(--v-theme-textPrimary));
  margin-top: 2px;
}
</style>
