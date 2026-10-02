<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import DeskDialog from '@/components/shared/DeskDialog.vue';
import { defaultLayout, labelsDocument, loadLayout, pageWidth, printLabels, saveLayout, type LabelItem } from '@/utils/labels';

const props = defineProps<{
  modelValue: boolean;
  productName: string;
  variants: any[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const layout = ref(loadLayout());
const copies = ref<Record<number, number>>({});
const showSetup = ref(false);

const printable = computed(() => props.variants.filter((variant) => variant.is_active && variant.barcode));

function title(variant: any) {
  const name = variant.name?.trim();
  return !name || name.toLowerCase() === 'standard' ? props.productName : `${props.productName} ${name}`;
}

const items = computed<LabelItem[]>(() => printable.value.map((variant) => ({
  title: title(variant),
  barcode: variant.barcode,
  copies: Number(copies.value[variant.id]) || 0,
})));

const totalLabels = computed(() => items.value.reduce((total, item) => total + Math.max(0, Math.floor(item.copies)), 0));
const rows = computed(() => Math.ceil(totalLabels.value / layout.value.columns));
const blanks = computed(() => rows.value * layout.value.columns - totalLabels.value);

const previewScale = 1.8;
const mmToPx = 96 / 25.4;
const preview = computed(() => {
  const sample = items.value.find((item) => item.copies > 0) || items.value[0];
  if (!sample) return '';
  return labelsDocument([{ ...sample, copies: layout.value.columns }], layout.value);
});

watch(() => props.modelValue, (open) => {
  if (!open) return;
  layout.value = loadLayout();
  copies.value = Object.fromEntries(printable.value.map((variant) => [variant.id, layout.value.columns]));
});

watch(layout, (value) => saveLayout(value), { deep: true });

function resetLayout() {
  layout.value = { ...defaultLayout };
}

function print() {
  if (!totalLabels.value) return;
  printLabels(items.value, layout.value);
}
</script>

<template>
  <DeskDialog :model-value="modelValue" title="Print Barcode Labels" :subtitle="productName" icon="mdi-barcode" max-width="820" :persistent="false"
    @update:model-value="emit('update:modelValue', $event)">
    <p v-if="!printable.length" class="text-lightText mb-0">No active variant has a barcode to print.</p>
    <template v-else>
      <v-table density="compact" class="border rounded-md mb-4">
        <thead>
          <tr>
            <th>VARIANT</th>
            <th>BARCODE</th>
            <th style="width: 130px">LABELS</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="variant in printable" :key="variant.id">
            <td>{{ variant.name }}</td>
            <td class="font-weight-medium">{{ variant.barcode }}</td>
            <td><v-text-field v-model.number="copies[variant.id]" type="number" min="0" density="compact" hide-details /></td>
          </tr>
        </tbody>
      </v-table>

      <div class="text-subtitle-2 mb-2">Preview</div>
      <div class="label-preview border rounded-md mb-2"
        :style="{ width: `${pageWidth(layout) * mmToPx * previewScale}px`, height: `${layout.height * mmToPx * previewScale}px` }">
        <iframe :srcdoc="preview" title="Label preview" tabindex="-1"
          :style="{ width: `${pageWidth(layout)}mm`, height: `${layout.height}mm`, transform: `scale(${previewScale})` }" />
      </div>
      <p class="text-caption text-lightText mb-3">
        {{ totalLabels }} labels · {{ rows }} {{ rows === 1 ? 'row' : 'rows' }}<span v-if="blanks"> · {{ blanks }} blank {{ blanks === 1 ? 'label' : 'labels' }} left on the last row</span>
      </p>

      <v-btn variant="text" color="primary" size="small" class="px-0" :prepend-icon="showSetup ? 'mdi-chevron-up' : 'mdi-chevron-down'" @click="showSetup = !showSetup">
        Label size &amp; printer setup
      </v-btn>
      <div v-if="showSetup" class="border rounded-md pa-3 mt-2">
        <v-row dense>
          <v-col cols="6" sm="4" md="2">
            <v-text-field v-model.number="layout.width" type="number" label="Label width" suffix="mm" density="compact" hide-details />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-text-field v-model.number="layout.height" type="number" label="Label height" suffix="mm" density="compact" hide-details />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-text-field v-model.number="layout.columns" type="number" min="1" label="Across" density="compact" hide-details />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-text-field v-model.number="layout.gap" type="number" label="Gap between" suffix="mm" density="compact" hide-details />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-text-field v-model.number="layout.offset" type="number" label="Left margin" suffix="mm" density="compact" hide-details />
          </v-col>
          <v-col cols="6" sm="4" md="2">
            <v-text-field v-model.number="layout.top" type="number" step="0.25" label="Top offset" suffix="mm" density="compact" hide-details />
          </v-col>
          <v-col cols="6" sm="4" md="2" class="d-flex align-center">
            <v-btn variant="text" size="small" @click="resetLayout">Reset</v-btn>
          </v-col>
        </v-row>
        <ul class="text-caption text-lightText mt-3 ps-4">
          <li>In the print dialog choose <b>BC-LP1300</b>, margins <b>None</b> and scale <b>100%</b>.</li>
          <li>Paper size must be <b>{{ pageWidth(layout) }} × {{ layout.height }} mm</b>. The first time, add it as a custom size in the printer driver (Windows: Printing Preferences → Page Setup; Mac: Paper Size → Manage Custom Sizes).</li>
          <li>In the printer options set type <b>Label with Gaps</b>, gap <b>3 mm</b> (0.118 in), post-print action <b>Tear Off</b> and darkness <b>5</b> (darker makes the bars bleed and stop scanning). Tear Off makes the printer line each print up with the sticker; with None, prints land several mm too high.</li>
          <li>If labels print across two stickers, calibrate the gap sensor with the printer's Feed button. If the print isn't centred top to bottom, change the top offset (negative moves it up); if the print is off to one side, change the left margin.</li>
          <li>These settings are saved on this computer only.</li>
        </ul>
      </div>
    </template>

    <template #footer>
      <v-btn variant="outlined" color="primary" @click="emit('update:modelValue', false)">Close</v-btn>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-printer" :disabled="!totalLabels" @click="print">Print {{ totalLabels || '' }} Labels</v-btn>
    </template>
  </DeskDialog>
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
