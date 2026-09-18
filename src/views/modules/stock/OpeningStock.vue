<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import BtnOutlined from '@/components/shared/BtnOutlined.vue';
import VariantPicker from '@/components/inventory/VariantPicker.vue';
import { useAuthStore } from '@/stores/auth';
import { useAlerts } from '@/composables/useAlerts';
import { formatMoney, formatNumber } from '@/utils/api';

const router = useRouter();
const authStore = useAuthStore();
const alerts = useAlerts();
const note = ref('');
const lines = ref<any[]>([]);
const saving = ref(false);

const totalValue = computed(() => lines.value.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0), 0));

function addVariant(variant: any) {
  const existing = lines.value.find((line) => line.product_variant_id === variant.id && !line.track_expiry);
  if (existing) {
    existing.quantity = Number(existing.quantity || 0) + 1;
    return;
  }
  lines.value.push({
    product_variant_id: variant.id,
    label: `${variant.product_name} - ${variant.name}`,
    sku: variant.sku,
    stock_unit: variant.stock_unit,
    allow_decimal: variant.is_weighted,
    track_expiry: variant.track_expiry,
    on_hand: variant.stock_quantity,
    quantity: 1,
    unit_cost: variant.cost_price,
    batch_number: '',
    expiry_date: '',
  });
}

async function save() {
  alerts.clear();
  let message = '';
  if (!lines.value.length) message = 'Add at least one product';
  else if (lines.value.some((line) => !(Number(line.quantity) > 0))) message = 'Every line needs a quantity above zero';
  else if (lines.value.some((line) => line.track_expiry && !line.expiry_date)) message = 'Expiry date is required for expiry-tracked products';
  if (message) {
    alerts.fail(null, message);
    return;
  }
  saving.value = true;
  try {
    await axios.post('stock/opening', {
      clientstore_id: authStore.clientstoreId,
      note: note.value || undefined,
      items: lines.value.map((line) => ({
        product_variant_id: line.product_variant_id,
        quantity: Number(line.quantity),
        unit_cost: Number(line.unit_cost) || 0,
        batch_number: line.batch_number || undefined,
        expiry_date: line.expiry_date || undefined,
      })),
    });
    alerts.success('Opening stock has been recorded!');
    lines.value = [];
    note.value = '';
    setTimeout(() => router.push('/stock'), 1200);
  } catch (error) {
    alerts.fail(error);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard :title="`Opening Stock · ${authStore.storeName || ''}`" icon="mdi-archive-arrow-down-outline">
        <template #action>
          <v-btn variant="outlined" color="primary" to="/stock" prepend-icon="mdi-arrow-left">Back to Stock</v-btn>
        </template>

        <v-alert type="info" variant="tonal" density="compact" class="mb-4">
          Use this once per branch to load stock you already had before using Super Mart. It is added straight to stock and recorded in the ledger as "Opening". For normal deliveries, use Goods Receipts.
        </v-alert>

        <v-row>
          <v-col cols="12" md="8">
            <v-label class="text-subtitle-1 pb-2 text-lightText">Add Products</v-label>
            <VariantPicker :clientstore-id="authStore.clientstoreId" show-stock @select="addVariant" @error="(message) => alerts.fail(null, message)" />
          </v-col>
          <v-col cols="12" md="4">
            <v-label class="text-subtitle-1 pb-2 text-lightText">Note</v-label>
            <v-text-field v-model="note" placeholder="Optional" hide-details />
          </v-col>
        </v-row>

        <div class="border rounded-md mt-4 overflow-x-auto">
          <v-table density="comfortable">
            <thead>
              <tr>
                <th style="min-width: 220px">PRODUCT</th>
                <th style="width: 120px">ON HAND</th>
                <th style="width: 130px">QUANTITY</th>
                <th style="width: 140px">UNIT COST</th>
                <th style="width: 140px">BATCH</th>
                <th style="width: 170px">EXPIRY</th>
                <th style="width: 60px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, index) in lines" :key="index">
                <td>
                  <div class="text-subtitle-2">{{ line.label }}</div>
                  <div class="text-caption text-lightText">{{ line.sku }}</div>
                </td>
                <td>{{ line.on_hand === undefined ? '-' : `${formatNumber(line.on_hand, 3)} ${line.stock_unit}` }}</td>
                <td><v-text-field v-model.number="line.quantity" type="number" min="0" :step="line.allow_decimal ? 0.001 : 1" density="compact" hide-details :suffix="line.stock_unit" /></td>
                <td><v-text-field v-model.number="line.unit_cost" type="number" min="0" step="0.01" density="compact" hide-details /></td>
                <td><v-text-field v-model="line.batch_number" density="compact" hide-details /></td>
                <td><v-text-field v-model="line.expiry_date" type="date" density="compact" hide-details :error="line.track_expiry && !line.expiry_date" /></td>
                <td><v-btn icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="lines.splice(index, 1)"></v-btn></td>
              </tr>
              <tr v-if="!lines.length">
                <td colspan="7" class="text-center text-lightText py-6">Search or scan products to load their opening quantities.</td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mt-4 single-line-alert" closable>
          <template v-slot:prepend><v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon></template>
        </v-alert>
        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mt-4 single-line-alert" closable />

        <div class="d-flex flex-wrap justify-space-between align-center gap-3 mt-6">
          <div class="text-h6">Total value: <span class="text-primary">{{ formatMoney(totalValue) }}</span></div>
          <div class="d-flex gap-2">
            <BtnOutlined type="button" outline="Cancel" @click="router.back()" />
            <BtnFilled type="button" filled="Record Opening Stock" :loading="saving" @click="save" />
          </div>
        </div>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
