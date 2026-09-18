<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import BtnOutlined from '@/components/shared/BtnOutlined.vue';
import VariantPicker from '@/components/inventory/VariantPicker.vue';
import { useAuthStore } from '@/stores/auth';
import { useAlerts } from '@/composables/useAlerts';
import { can } from '@/utils/permissions';
import { apiError, formatDate, formatNumber, rules, today } from '@/utils/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const alerts = useAlerts();
const id = computed(() => route.params.id as string | undefined);
const isEdit = computed(() => !!id.value);
const draftId = ref<number | null>(null);
const adjustmentId = computed(() => id.value || draftId.value);
const formRef = ref<any>(null);
const reasons = ref<string[]>([]);
const loading = ref(false);
const saving = ref(false);
const form = ref<any>({
  adjustment_date: today(),
  reason: 'Count Correction',
  note: '',
});
const lines = ref<any[]>([]);
const isCount = computed(() => form.value.reason === 'Count Correction');
const canAdd = computed(() => form.value.reason === 'Other');

const hint = computed(() => {
  if (isCount.value) return 'Enter what you physically counted. The difference from system stock is booked when you post.';
  if (canAdd.value) return 'Use "Other" to add found stock or remove stock for any other reason.';
  return `${form.value.reason} removes stock. Damage and expiry are booked as wastage.`;
});

async function loadBatches(line: any) {
  line.batches = (await axios.get('stock/batches', {
    params: { clientstore_id: authStore.clientstoreId, product_variant_id: line.product_variant_id },
  })).data;
}

async function refreshStock() {
  await Promise.all(lines.value.map(async (line) => {
    const result = await axios.get('products/variants/search', { params: { q: line.sku, clientstore_id: authStore.clientstoreId, limit: 5 } });
    const match = result.data.find((row: any) => row.id === line.product_variant_id);
    line.on_hand = match?.stock_quantity ?? 0;
    line.stock_unit = match?.stock_unit ?? line.stock_unit;
    await loadBatches(line);
  }));
}

watch(() => form.value.reason, () => {
  lines.value.forEach((line) => {
    if (!canAdd.value) line.direction = 'remove';
  });
});

function addVariant(variant: any) {
  if (lines.value.some((line) => line.product_variant_id === variant.id)) {
    alerts.fail(null, 'This product is already on the list');
    return;
  }
  lines.value.push({
    product_variant_id: variant.id,
    label: `${variant.product_name} - ${variant.name}`,
    sku: variant.sku,
    stock_unit: variant.stock_unit,
    allow_decimal: variant.is_weighted,
    track_expiry: variant.track_expiry,
    on_hand: variant.stock_quantity ?? 0,
    counted_quantity: variant.stock_quantity ?? 0,
    direction: 'remove',
    quantity: 1,
    stock_batch_id: null,
    unit_cost: variant.average_cost ?? variant.cost_price,
    batch_number: '',
    expiry_date: '',
    batches: [] as any[],
  });
  loadBatches(lines.value[lines.value.length - 1]).catch((error) => alerts.fail(error));
}

const batchLabel = (batch: any) => `${batch.batch_number || 'No batch'}${batch.expiry_date ? ` · exp ${formatDate(batch.expiry_date)}` : ''} · ${formatNumber(batch.quantity, 3)} left`;

function difference(line: any) {
  return Number(line.counted_quantity) - Number(line.on_hand);
}

function lineError() {
  if (!lines.value.length) return 'Add at least one product';
  for (const line of lines.value) {
    if (isCount.value && !(Number(line.counted_quantity) >= 0)) return `${line.label}: enter the counted quantity`;
    if (!isCount.value && !(Number(line.quantity) > 0)) return `${line.label}: quantity must be above zero`;
    if (!isCount.value && line.direction === 'add' && line.track_expiry && !line.expiry_date) return `${line.label}: expiry date is required when adding stock`;
  }
  return '';
}

async function save(post: boolean) {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  const message = lineError();
  if (message) {
    alerts.fail(null, message);
    return;
  }
  saving.value = true;
  const payload = {
    ...form.value,
    clientstore_id: authStore.clientstoreId,
    items: lines.value.map((line) => isCount.value
      ? { product_variant_id: line.product_variant_id, counted_quantity: Number(line.counted_quantity) }
      : {
        product_variant_id: line.product_variant_id,
        quantity: line.direction === 'add' ? Number(line.quantity) : -Number(line.quantity),
        stock_batch_id: line.direction === 'remove' ? line.stock_batch_id || undefined : undefined,
        unit_cost: line.direction === 'add' ? Number(line.unit_cost) || 0 : undefined,
        batch_number: line.direction === 'add' ? line.batch_number || undefined : undefined,
        expiry_date: line.direction === 'add' ? line.expiry_date || undefined : undefined,
      }),
  };
  try {
    let adjustment = adjustmentId.value
      ? (await axios.put(`stock-adjustments/${adjustmentId.value}`, payload)).data
      : (await axios.post('stock-adjustments', payload)).data;
    if (post) {
      try {
        adjustment = (await axios.put(`stock-adjustments/${adjustment.id}/post`)).data;
      } catch (error) {
        draftId.value = adjustment.id;
        alerts.fail(null, `${adjustment.adjustment_number} was saved as a draft but could not be posted: ${apiError(error)}`);
        return;
      }
    }
    router.push(`/stock-adjustments/${adjustment.id}`);
  } catch (error) {
    alerts.fail(error);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    reasons.value = (await axios.get('stock-adjustments/reasons')).data;
    if (isEdit.value) {
      const adjustment = (await axios.get(`stock-adjustments/${id.value}`)).data;
      if (adjustment.status !== 'Draft' || adjustment.clientstore_id !== authStore.clientstoreId) {
        router.replace(`/stock-adjustments/${adjustment.id}`);
        return;
      }
      form.value = {
        adjustment_date: adjustment.adjustment_date,
        reason: adjustment.reason,
        note: adjustment.note || '',
      };
      lines.value = adjustment.items.map((item: any) => ({
        product_variant_id: item.product_variant_id,
        label: `${item.product_variant.product.name} - ${item.product_variant.name}`,
        sku: item.product_variant.sku,
        stock_unit: item.product_variant.product.is_weighted ? item.product_variant.product.unit?.short_name : 'pcs',
        allow_decimal: item.product_variant.product.is_weighted,
        track_expiry: item.product_variant.product.track_expiry,
        on_hand: undefined,
        counted_quantity: item.counted_quantity ?? 0,
        direction: item.quantity > 0 ? 'add' : 'remove',
        quantity: Math.abs(item.quantity) || 1,
        stock_batch_id: item.stock_batch_id || null,
        unit_cost: item.unit_cost ?? item.product_variant.cost_price,
        batch_number: item.batch_number || '',
        expiry_date: item.expiry_date || '',
        batches: [],
      }));
      await refreshStock();
    }
  } catch (error) {
    alerts.fail(error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard :title="isEdit ? 'Edit Stock Adjustment' : 'New Stock Adjustment'" icon="mdi-scale-balance">
        <template #action>
          <v-btn variant="outlined" color="primary" to="/stock-adjustments" prepend-icon="mdi-arrow-left">Back</v-btn>
        </template>

        <v-skeleton-loader v-if="loading" type="article, table" />
        <v-form v-else ref="formRef" @submit.prevent>
          <v-row>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Branch</v-label>
              <v-text-field :model-value="authStore.storeName" disabled hide-details />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Reason</v-label>
              <v-select v-model="form.reason" :items="reasons" :rules="[rules.requiredSelect]" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Date</v-label>
              <v-text-field v-model="form.adjustment_date" type="date" :rules="[rules.required]" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Note</v-label>
              <v-text-field v-model="form.note" hide-details />
            </v-col>
            <v-col cols="12">
              <v-alert type="info" variant="tonal" density="compact">{{ hint }}</v-alert>
            </v-col>
            <v-col cols="12">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Products</v-label>
              <VariantPicker :clientstore-id="authStore.clientstoreId" show-stock @select="addVariant" @error="(message) => alerts.fail(null, message)" />
            </v-col>
          </v-row>

          <div class="border rounded-md mt-4 overflow-x-auto">
            <v-table density="comfortable">
              <thead>
                <tr v-if="isCount">
                  <th style="min-width: 220px">PRODUCT</th>
                  <th style="width: 160px">SYSTEM QTY</th>
                  <th style="width: 170px">COUNTED QTY</th>
                  <th style="width: 150px">DIFFERENCE</th>
                  <th style="width: 60px"></th>
                </tr>
                <tr v-else>
                  <th style="min-width: 220px">PRODUCT</th>
                  <th style="width: 130px">ON HAND</th>
                  <th v-if="canAdd" style="width: 170px">DIRECTION</th>
                  <th style="width: 130px">QUANTITY</th>
                  <th style="width: 280px">BATCH</th>
                  <th style="width: 60px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, index) in lines" :key="line.product_variant_id">
                  <td>
                    <div class="text-subtitle-2">{{ line.label }}</div>
                    <div class="text-caption text-lightText">{{ line.sku }}</div>
                  </td>
                  <template v-if="isCount">
                    <td>{{ line.on_hand === undefined ? '-' : `${formatNumber(line.on_hand, 3)} ${line.stock_unit}` }}</td>
                    <td><v-text-field v-model.number="line.counted_quantity" type="number" min="0" :step="line.allow_decimal ? 0.001 : 1" density="compact" hide-details /></td>
                    <td>
                      <span v-if="line.on_hand !== undefined" :class="difference(line) < 0 ? 'text-error font-weight-bold' : difference(line) > 0 ? 'text-successdark font-weight-bold' : ''">
                        {{ difference(line) > 0 ? '+' : '' }}{{ formatNumber(difference(line), 3) }}
                      </span>
                    </td>
                  </template>
                  <template v-else>
                    <td>{{ line.on_hand === undefined ? '-' : `${formatNumber(line.on_hand, 3)} ${line.stock_unit}` }}</td>
                    <td v-if="canAdd">
                      <v-btn-toggle v-model="line.direction" mandatory density="compact" color="primary" variant="outlined">
                        <v-btn value="remove" size="small">Remove</v-btn>
                        <v-btn value="add" size="small">Add</v-btn>
                      </v-btn-toggle>
                    </td>
                    <td><v-text-field v-model.number="line.quantity" type="number" min="0" :step="line.allow_decimal ? 0.001 : 1" density="compact" hide-details /></td>
                    <td>
                      <v-select v-if="line.direction === 'remove' && line.batches.length" v-model="line.stock_batch_id" :items="line.batches" :item-title="batchLabel"
                        item-value="id" placeholder="Earliest expiry first" clearable density="compact" hide-details />
                      <div v-else-if="line.direction === 'add'" class="d-flex gap-2">
                        <v-text-field v-model="line.batch_number" placeholder="Batch" density="compact" hide-details />
                        <v-text-field v-model="line.expiry_date" type="date" density="compact" hide-details :error="line.track_expiry && !line.expiry_date" />
                      </div>
                      <span v-else class="text-lightText">No batches</span>
                    </td>
                  </template>
                  <td><v-btn icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="lines.splice(index, 1)"></v-btn></td>
                </tr>
                <tr v-if="!lines.length">
                  <td :colspan="isCount ? 5 : 6" class="text-center text-lightText py-6">Search or scan products to adjust.</td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mt-4 single-line-alert" closable />

          <div class="d-flex justify-end flex-wrap gap-2 mt-6">
            <BtnOutlined type="button" outline="Cancel" @click="router.back()" />
            <BtnOutlined type="button" outline="Save Draft" class="text-primary" :loading="saving" @click="save(false)" />
            <BtnFilled type="button" filled="Save & Post" :loading="saving" :disabled="!can('stock_adjustments_post', 'Stock Adjustment')" @click="save(true)" />
          </div>
        </v-form>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
