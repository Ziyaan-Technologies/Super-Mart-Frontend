<script setup lang="ts">
import { ref, watch } from 'vue';
import axios from 'axios';
import { apiError, formatNumber } from '@/utils/api';

const props = defineProps<{
  clientstoreId?: number | null;
  placeholder?: string;
  showStock?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', variant: any): void;
  (e: 'error', message: string): void;
}>();

const search = ref('');
const barcode = ref('');
const items = ref<any[]>([]);
const loading = ref(false);
const selected = ref<any>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
let lastQuery = '';

const label = (item: any) => `${item.product_name} — ${item.name} (${item.sku})`;

async function load(term: string) {
  lastQuery = `${term}|${props.clientstoreId || ''}`;
  loading.value = true;
  try {
    const response = await axios.get('products/variants/search', {
      params: { q: term, clientstore_id: props.clientstoreId || undefined, limit: 20 },
    });
    items.value = response.data;
  } catch (error) {
    emit('error', apiError(error));
  } finally {
    loading.value = false;
  }
}

watch(search, (term) => {
  clearTimeout(timer);
  if (selected.value || `${term || ''}|${props.clientstoreId || ''}` === lastQuery) return;
  timer = setTimeout(() => load(term || ''), 250);
});

watch(() => props.clientstoreId, () => load(search.value || ''));

function choose(variant: any) {
  if (!variant) return;
  emit('select', variant);
  setTimeout(() => {
    selected.value = null;
    search.value = '';
  });
}

async function scan() {
  const code = barcode.value.trim();
  if (!code) return;
  try {
    const response = await axios.get(`products/variants/barcode/${encodeURIComponent(code)}`, {
      params: { clientstore_id: props.clientstoreId || undefined },
    });
    emit('select', response.data);
  } catch (error) {
    emit('error', apiError(error, 'No product found for this barcode'));
  } finally {
    barcode.value = '';
  }
}

load('');
</script>

<template>
  <div class="variant-picker">
    <v-autocomplete
      v-model="selected"
      v-model:search="search"
      :items="items"
      :item-title="label"
      return-object
      :loading="loading"
      :placeholder="placeholder || 'Search product, SKU or barcode to add a line...'"
      density="comfortable"
      bg-color="white"
      rounded="pill"
      hide-details
      no-filter
      class="variant-picker__search"
      prepend-inner-icon="mdi-magnify"
      @update:model-value="choose"
    >
      <template #item="{ props: itemProps, item }">
        <v-list-item v-bind="itemProps" :title="`${item.raw.product_name} — ${item.raw.name}`">
          <template #subtitle>
            {{ item.raw.sku }}<span v-if="item.raw.barcode"> · {{ item.raw.barcode }}</span>
            <span v-if="showStock && item.raw.stock_quantity !== undefined"> · On hand {{ formatNumber(item.raw.stock_quantity, 3) }} {{ item.raw.stock_unit }}</span>
          </template>
        </v-list-item>
      </template>
    </v-autocomplete>
    <v-text-field
      v-model="barcode"
      placeholder="Scan barcode"
      density="comfortable"
      bg-color="white"
      rounded="pill"
      hide-details
      prepend-inner-icon="mdi-barcode-scan"
      class="variant-picker__scan"
      @keydown.enter.prevent="scan"
    />
  </div>
</template>

<style scoped>
.variant-picker {
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 12px;
}
@media (max-width: 700px) {
  .variant-picker {
    grid-template-columns: 1fr;
  }
}
</style>
