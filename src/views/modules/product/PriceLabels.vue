<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import { useAuthStore } from '@/stores/auth';
import { labelPrice, loadLayout, pageWidth, priceLabelsDocument, printPriceLabels, type PriceLabelItem } from '@/utils/labels';

const authStore = useAuthStore();
const layout = loadLayout();
const storeKey = 'priceLabelStore';

const store = ref(localStorage.getItem(storeKey) || authStore.client?.vendor?.business_name || '');
const rows = ref<PriceLabelItem[]>([{ price: 0, copies: layout.columns }]);

watch(store, (value) => localStorage.setItem(storeKey, value));

const printable = computed(() => rows.value.filter((row) => Number(row.price) > 0 && Number(row.copies) > 0));
const totalLabels = computed(() => printable.value.reduce((total, row) => total + Math.floor(Number(row.copies)), 0));
const sheetRows = computed(() => Math.ceil(totalLabels.value / layout.columns));
const blanks = computed(() => sheetRows.value * layout.columns - totalLabels.value);

const previewScale = 1.8;
const mmToPx = 96 / 25.4;
const preview = computed(() => {
  const sample = printable.value[0] || { price: 64.9, copies: 0 };
  return priceLabelsDocument(store.value, [{ price: sample.price, copies: layout.columns }], layout);
});

function addRow() {
  rows.value.push({ price: 0, copies: layout.columns });
}

function removeRow(index: number) {
  rows.value.splice(index, 1);
  if (!rows.value.length) addRow();
}

function print() {
  if (!totalLabels.value) return;
  printPriceLabels(store.value.trim(), printable.value, layout);
}
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Price Labels" icon="mdi-tag-outline">
        <v-row>
          <v-col cols="12" md="6">
            <v-label class="text-subtitle-1 pb-2 text-lightText">Store Name</v-label>
            <v-text-field v-model="store" placeholder="e.g. NK Super Mart" hint="Printed small at the top of every label" persistent-hint />

            <v-table density="compact" class="border rounded-md mt-6">
              <thead>
                <tr>
                  <th>PRICE</th>
                  <th style="width: 130px">LABELS</th>
                  <th style="width: 48px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in rows" :key="index">
                  <td><v-text-field v-model.number="row.price" type="number" min="0" step="0.01" density="compact" hide-details autofocus @keydown.enter="addRow" /></td>
                  <td><v-text-field v-model.number="row.copies" type="number" min="0" density="compact" hide-details /></td>
                  <td><v-btn icon="mdi-close" variant="text" size="small" @click="removeRow(index)" /></td>
                </tr>
              </tbody>
            </v-table>
            <v-btn variant="text" color="primary" prepend-icon="mdi-plus" class="mt-2 px-0" @click="addRow">Add Price</v-btn>
          </v-col>

          <v-col cols="12" md="6">
            <div class="text-subtitle-2 mb-2">Preview</div>
            <div class="label-preview border rounded-md mb-2"
              :style="{ width: `${pageWidth(layout) * mmToPx * previewScale}px`, height: `${layout.height * mmToPx * previewScale}px` }">
              <iframe :srcdoc="preview" title="Label preview" tabindex="-1"
                :style="{ width: `${pageWidth(layout)}mm`, height: `${layout.height}mm`, transform: `scale(${previewScale})` }" />
            </div>
            <p class="text-caption text-lightText mb-1">
              {{ totalLabels }} labels · {{ sheetRows }} {{ sheetRows === 1 ? 'row' : 'rows' }}<span v-if="blanks"> · {{ blanks }} blank {{ blanks === 1 ? 'label' : 'labels' }} left on the last row</span>
            </p>
            <p v-for="row in printable" :key="`${row.price}-${row.copies}`" class="text-caption text-lightText mb-0">{{ row.copies }} × {{ labelPrice(row.price) }}</p>
            <p class="text-caption text-lightText mt-3">
              Uses the same label size and printer settings as barcode labels ({{ layout.width }} × {{ layout.height }} mm, {{ layout.columns }} across). Change them from Print Labels on a product.
            </p>
          </v-col>
        </v-row>

        <div class="d-flex justify-end mt-6">
          <v-btn color="primary" variant="flat" prepend-icon="mdi-printer" :disabled="!totalLabels" @click="print">Print {{ totalLabels || '' }} Labels</v-btn>
        </div>
      </UiParentCard>
    </v-col>
  </v-row>
</template>

<style scoped>
.label-preview {
  overflow: hidden;
  max-width: 100%;
  background: #f4f4f4;
}

.label-preview iframe {
  border: 0;
  background: #fff;
  transform-origin: 0 0;
  pointer-events: none;
}
</style>
