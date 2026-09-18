<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  page: number;
  pageCount: number;
  perPage: string;
  total?: number;
  itemLabel?: string;
}>(), {
  total: 0,
  itemLabel: 'records',
});

const emit = defineEmits<{
  (e: 'update:page', value: number): void;
  (e: 'update:perPage', value: string): void;
}>();

const perPageNumber = computed(() => parseInt(props.perPage, 10) || 10);

const fromIndex = computed(() => (props.total === 0 ? 0 : (props.page - 1) * perPageNumber.value + 1));

const toIndex = computed(() => Math.min(props.page * perPageNumber.value, props.total));

const pagesToDisplay = computed(() => {
  const total = props.pageCount;
  const current = props.page;
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages: (number | string)[] = [1];
  if (current > 3) pages.push('...');
  for (let index = Math.max(2, current - 1); index <= Math.min(total - 1, current + 1); index++) {
    pages.push(index);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
});
</script>

<template>
  <div class="ui-pagination d-flex align-center justify-space-between flex-wrap mt-4 px-1">
    <div class="showing-orders-text">
      <span class="font-weight-medium">Showing {{ fromIndex }} to {{ toIndex }} of {{ total }} {{ itemLabel }}</span>
    </div>

    <div class="d-flex align-center flex-wrap ui-pagination__controls">
      <v-select :model-value="perPageNumber" :items="[10, 20, 50, 100]" variant="outlined" density="compact" hide-details
        class="items-per-page-select" @update:model-value="emit('update:perPage', String($event))">
        <template #selection="{ item }">
          <span class="text-body-2 text-no-wrap">{{ item.title }} per page</span>
        </template>
      </v-select>

      <div class="custom-pagination d-flex align-center">
        <v-btn icon variant="outlined" size="small" class="pagination-nav-btn border" :disabled="page === 1"
          @click="emit('update:page', page - 1)">
          <v-icon size="18">mdi-chevron-left</v-icon>
        </v-btn>

        <template v-for="(item, index) in pagesToDisplay" :key="index">
          <v-btn v-if="item !== '...'" variant="flat" size="small"
            :color="page === item ? 'primary' : 'transparent'"
            :class="['pagination-num-btn font-weight-medium', page === item ? 'text-white' : 'text-dark']"
            @click="emit('update:page', item as number)">{{ item }}</v-btn>
          <span v-else class="pagination-dots px-2 font-weight-bold">...</span>
        </template>

        <v-btn icon variant="outlined" size="small" class="pagination-nav-btn border" :disabled="page === pageCount || pageCount === 0"
          @click="emit('update:page', page + 1)">
          <v-icon size="18">mdi-chevron-right</v-icon>
        </v-btn>
      </div>
    </div>
  </div>
</template>
