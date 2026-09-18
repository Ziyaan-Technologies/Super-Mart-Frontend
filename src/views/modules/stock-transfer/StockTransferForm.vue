<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import BtnOutlined from '@/components/shared/BtnOutlined.vue';
import VariantPicker from '@/components/inventory/VariantPicker.vue';
import { useAuthStore } from '@/stores/auth';
import { useAlerts } from '@/composables/useAlerts';
import { can } from '@/utils/permissions';
import { apiError, formatNumber, rules, today } from '@/utils/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const alerts = useAlerts();
const id = computed(() => route.params.id as string | undefined);
const isEdit = computed(() => !!id.value);
const draftId = ref<number | null>(null);
const transferId = computed(() => id.value || draftId.value);
const formRef = ref<any>(null);
const loading = ref(false);
const saving = ref(false);
const allStores = ref<any[]>([]);
const form = ref<any>({
  to_clientstore_id: null,
  transfer_date: today(),
  note: '',
});
const lines = ref<any[]>([]);

const destinationStores = computed(() => allStores.value.filter((store) => store.id !== authStore.clientstoreId));

async function refreshAvailability() {
  const results = await Promise.all(lines.value.map((line) =>
    axios.get('products/variants/search', { params: { q: line.sku, clientstore_id: authStore.clientstoreId, limit: 5 } }),
  ));
  results.forEach((result, index) => {
    const match = result.data.find((row: any) => row.id === lines.value[index].product_variant_id);
    lines.value[index].available = match?.stock_quantity ?? 0;
  });
}

function addVariant(variant: any) {
  const existing = lines.value.find((line) => line.product_variant_id === variant.id);
  if (existing) {
    existing.quantity = Number(existing.quantity) + 1;
    return;
  }
  lines.value.push({
    product_variant_id: variant.id,
    label: `${variant.product_name} - ${variant.name}`,
    sku: variant.sku,
    stock_unit: variant.stock_unit,
    allow_decimal: variant.is_weighted,
    available: variant.stock_quantity ?? 0,
    quantity: 1,
  });
}

async function save(dispatch: boolean) {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  if (!lines.value.length) {
    alerts.fail(null, 'Add at least one product');
    return;
  }
  const invalid = lines.value.find((line) => !(Number(line.quantity) > 0));
  if (invalid) {
    alerts.fail(null, `${invalid.label}: quantity must be above zero`);
    return;
  }
  saving.value = true;
  const payload = {
    ...form.value,
    from_clientstore_id: authStore.clientstoreId,
    items: lines.value.map((line) => ({ product_variant_id: line.product_variant_id, quantity: Number(line.quantity) })),
  };
  try {
    let transfer = transferId.value
      ? (await axios.put(`stock-transfers/${transferId.value}`, payload)).data
      : (await axios.post('stock-transfers', payload)).data;
    if (dispatch) {
      try {
        transfer = (await axios.put(`stock-transfers/${transfer.id}/dispatch`)).data;
      } catch (error) {
        draftId.value = transfer.id;
        alerts.fail(null, `${transfer.transfer_number} was saved as a draft but could not be dispatched: ${apiError(error)}`);
        return;
      }
    }
    router.push(`/stock-transfers/${transfer.id}`);
  } catch (error) {
    alerts.fail(error);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    allStores.value = (await axios.get('clientstores/directory')).data;
    if (isEdit.value) {
      const transfer = (await axios.get(`stock-transfers/${id.value}`)).data;
      if (transfer.status !== 'Draft' || transfer.from_clientstore_id !== authStore.clientstoreId) {
        router.replace(`/stock-transfers/${transfer.id}`);
        return;
      }
      form.value = {
        to_clientstore_id: transfer.to_clientstore_id,
        transfer_date: transfer.transfer_date,
        note: transfer.note || '',
      };
      lines.value = transfer.items.map((item: any) => ({
        product_variant_id: item.product_variant_id,
        label: `${item.product_variant.product.name} - ${item.product_variant.name}`,
        sku: item.product_variant.sku,
        allow_decimal: item.product_variant.product.is_weighted,
        stock_unit: item.product_variant.product.is_weighted ? item.product_variant.product.unit?.short_name : 'pcs',
        available: undefined,
        quantity: item.quantity,
      }));
      await refreshAvailability();
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
      <UiParentCard :title="isEdit ? 'Edit Stock Transfer' : 'New Stock Transfer'" icon="mdi-swap-horizontal-bold">
        <template #action>
          <v-btn variant="outlined" color="primary" to="/stock-transfers" prepend-icon="mdi-arrow-left">Back</v-btn>
        </template>

        <v-skeleton-loader v-if="loading" type="article, table" />
        <v-form v-else ref="formRef" @submit.prevent>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            Stock leaves this branch when the transfer is dispatched. The receiving branch confirms what arrives.
          </v-alert>

          <v-row>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">From Branch</v-label>
              <v-text-field :model-value="authStore.storeName" disabled hide-details />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">To Branch</v-label>
              <v-select v-model="form.to_clientstore_id" :items="destinationStores" item-title="store_name" item-value="id"
                :rules="[rules.requiredSelect]" no-data-text="Add another branch first" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Transfer Date</v-label>
              <v-text-field v-model="form.transfer_date" type="date" :rules="[rules.required]" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Note</v-label>
              <v-text-field v-model="form.note" hide-details />
            </v-col>
            <v-col cols="12">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Products to Send</v-label>
              <VariantPicker :clientstore-id="authStore.clientstoreId" show-stock @select="addVariant" @error="(message) => alerts.fail(null, message)" />
            </v-col>
          </v-row>

          <div class="border rounded-md mt-4 overflow-x-auto">
            <v-table density="comfortable">
              <thead>
                <tr>
                  <th style="min-width: 220px">PRODUCT</th>
                  <th style="width: 180px">AVAILABLE HERE</th>
                  <th style="width: 170px">QUANTITY TO SEND</th>
                  <th style="width: 60px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, index) in lines" :key="line.product_variant_id">
                  <td>
                    <div class="text-subtitle-2">{{ line.label }}</div>
                    <div class="text-caption text-lightText">{{ line.sku }}</div>
                  </td>
                  <td :class="line.available !== undefined && Number(line.quantity) > line.available ? 'text-error font-weight-bold' : ''">
                    {{ line.available === undefined ? '-' : `${formatNumber(line.available, 3)} ${line.stock_unit || ''}` }}
                  </td>
                  <td><v-text-field v-model.number="line.quantity" type="number" min="0" :step="line.allow_decimal ? 0.001 : 1" density="compact" hide-details /></td>
                  <td><v-btn icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="lines.splice(index, 1)"></v-btn></td>
                </tr>
                <tr v-if="!lines.length">
                  <td colspan="4" class="text-center text-lightText py-6">Search or scan products to send.</td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mt-4 single-line-alert" closable />

          <div class="d-flex justify-end flex-wrap gap-2 mt-6">
            <BtnOutlined type="button" outline="Cancel" @click="router.back()" />
            <BtnOutlined type="button" outline="Save Draft" class="text-primary" :loading="saving" @click="save(false)" />
            <BtnFilled type="button" filled="Save & Dispatch" :loading="saving" :disabled="!can('stock_transfers_dispatch', 'Stock Transfer')" @click="save(true)" />
          </div>
        </v-form>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
