<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import { printPdf, saveBlob } from '@/utils/api';

const props = withDefaults(defineProps<{
  saleId: number;
  billNumber?: string;
  variant?: 'icon' | 'button';
}>(), {
  billNumber: '',
  variant: 'icon',
});

const emit = defineEmits<{
  (e: 'printed', saleId: number): void;
  (e: 'error', error: any): void;
}>();

const printLoading = ref(false);
const downloadLoading = ref(false);

async function fetchReceipt() {
  const response = await axios.get(`pos/sales/${props.saleId}/receipt`, { responseType: 'blob' });
  return response.data as Blob;
}

async function printReceipt() {
  printLoading.value = true;
  try {
    printPdf(await fetchReceipt());
    emit('printed', props.saleId);
  } catch (error) {
    emit('error', error);
  } finally {
    printLoading.value = false;
  }
}

async function downloadReceipt() {
  downloadLoading.value = true;
  try {
    saveBlob(await fetchReceipt(), `${props.billNumber || props.saleId}.pdf`);
  } catch (error) {
    emit('error', error);
  } finally {
    downloadLoading.value = false;
  }
}

defineExpose({ printReceipt, downloadReceipt });
</script>

<template>
  <div class="d-inline-flex align-center flex-nowrap ga-1">
    <template v-if="variant === 'icon'">
      <v-btn icon="mdi-printer" color="#EFF0F1" size="small" title="Print Receipt" :loading="printLoading" @click="printReceipt" />
      <v-btn icon="mdi-download" color="#EFF0F1" size="small" title="Download Receipt" :loading="downloadLoading" @click="downloadReceipt" />
    </template>
    <template v-else>
      <v-btn color="primary" variant="outlined" class="font-weight-medium px-3 text-capitalize" prepend-icon="mdi-printer" :loading="printLoading" @click="printReceipt">Print</v-btn>
      <v-btn color="primary" variant="outlined" class="font-weight-medium px-3 text-capitalize" prepend-icon="mdi-download" :loading="downloadLoading" @click="downloadReceipt">Download</v-btn>
    </template>
  </div>
</template>
