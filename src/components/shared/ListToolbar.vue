<script setup lang="ts">
import { ref } from 'vue';

withDefaults(defineProps<{
  total: number;
  label: string;
  searchPlaceholder?: string;
  addLabel?: string;
  canAdd?: boolean;
  exportable?: boolean;
  exporting?: string | null;
}>(), {
  searchPlaceholder: 'Search...',
  addLabel: '',
  canAdd: false,
  exportable: false,
  exporting: null,
});

const emit = defineEmits<{
  (e: 'search', value: string): void;
  (e: 'add'): void;
  (e: 'export', format: 'excel' | 'pdf'): void;
}>();

const searchQuery = ref('');
let timer: ReturnType<typeof setTimeout> | undefined;

function onInput() {
  clearTimeout(timer);
  timer = setTimeout(() => emit('search', (searchQuery.value || '').trim()), 300);
}

function clearSearch() {
  searchQuery.value = '';
  emit('search', '');
}
</script>

<template>
  <div class="list-toolbar mb-4">
    <div class="list-toolbar__filters">
      <div class="list-toolbar__search">
        <v-text-field v-model="searchQuery" prepend-inner-icon="mdi-magnify" :placeholder="searchPlaceholder" hide-details clearable
          @input="onInput" @click:clear="clearSearch" @keydown.enter.prevent="emit('search', (searchQuery || '').trim())" />
      </div>
      <slot name="filters" />
    </div>
    <div class="list-toolbar__actions">
      <span class="list-toolbar__count">{{ total }} {{ label }}</span>
      <template v-if="exportable">
        <v-btn variant="outlined" class="toolbar-btn" :loading="exporting === 'excel'" @click="emit('export', 'excel')">
          <v-icon size="18" class="me-1" color="success">mdi-microsoft-excel</v-icon>Excel
        </v-btn>
        <v-btn variant="outlined" class="toolbar-btn" :loading="exporting === 'pdf'" @click="emit('export', 'pdf')">
          <v-icon size="18" class="me-1" color="error">mdi-file-pdf-box</v-icon>PDF
        </v-btn>
      </template>
      <v-btn v-if="canAdd && addLabel" color="primary" variant="flat" class="toolbar-btn toolbar-btn--add" prepend-icon="mdi-plus"
        @click="emit('add')">{{ addLabel }}</v-btn>
    </div>
  </div>
</template>

<style scoped>
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.list-toolbar__filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
  min-width: 260px;
}

.list-toolbar__filters > :deep(div) {
  min-width: 170px;
  flex: 0 1 200px;
}

.list-toolbar__filters > .list-toolbar__search {
  flex: 1 1 260px;
  max-width: 320px;
}

.list-toolbar__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.list-toolbar__count {
  font-size: 13px;
  font-weight: 500;
  color: rgb(var(--v-theme-lightgray));
  margin-right: 4px;
  white-space: nowrap;
}

.toolbar-btn {
  min-height: 40px;
  border-radius: 10px;
  text-transform: none;
  letter-spacing: 0;
  font-weight: 500;
  border-color: #d9d9d9;
  background: #fff;
}

.toolbar-btn--add {
  font-weight: 600;
  padding-inline: 18px;
}
</style>
