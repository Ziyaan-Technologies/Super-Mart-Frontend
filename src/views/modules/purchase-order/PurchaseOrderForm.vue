<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import BtnOutlined from '@/components/shared/BtnOutlined.vue';
import VariantPicker from '@/components/inventory/VariantPicker.vue';
import LineTotals from '@/components/inventory/LineTotals.vue';
import { useAuthStore } from '@/stores/auth';
import { useAlerts } from '@/composables/useAlerts';
import { useLookups } from '@/composables/useLookups';
import { documentTotals, lineTotal } from '@/utils/lines';
import { formatMoney, formatNumber, rules, today } from '@/utils/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const alerts = useAlerts();
const lookups = useLookups();
const id = computed(() => route.params.id as string | undefined);
const isEdit = computed(() => !!id.value);
const formRef = ref<any>(null);
const loading = ref(false);
const saving = ref(false);
const form = ref<any>({
  supplier_id: null,
  order_date: today(),
  expected_date: '',
  note: '',
});
const lines = ref<any[]>([]);
const totals = computed(() => documentTotals(lines.value));

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
    stock_quantity: variant.stock_quantity,
    stock_unit: variant.stock_unit,
    allow_decimal: variant.is_weighted,
    quantity: 1,
    unit_cost: variant.cost_price,
    tax_rate: variant.tax_rate || 0,
    discount_amount: 0,
  });
}

async function save() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  if (!lines.value.length) {
    alerts.fail(null, 'Add at least one product');
    return;
  }
  if (lines.value.some((line) => !(Number(line.quantity) > 0))) {
    alerts.fail(null, 'Every line needs a quantity above zero');
    return;
  }
  saving.value = true;
  const payload = {
    ...form.value,
    clientstore_id: authStore.clientstoreId,
    expected_date: form.value.expected_date || undefined,
    items: lines.value.map((line) => ({
      product_variant_id: line.product_variant_id,
      quantity: Number(line.quantity),
      unit_cost: Number(line.unit_cost) || 0,
      tax_rate: Number(line.tax_rate) || 0,
      discount_amount: Number(line.discount_amount) || 0,
    })),
  };
  try {
    const response = isEdit.value
      ? await axios.put(`purchase-orders/${id.value}`, payload)
      : await axios.post('purchase-orders', payload);
    router.push(`/purchase-orders/${response.data.id}`);
  } catch (error) {
    alerts.fail(error);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    await lookups.loadSuppliers();
    if (isEdit.value) {
      const order = (await axios.get(`purchase-orders/${id.value}`)).data;
      if (order.status !== 'Draft') {
        router.replace(`/purchase-orders/${order.id}`);
        return;
      }
      form.value = {
        supplier_id: order.supplier_id,
        order_date: order.order_date,
        expected_date: order.expected_date || '',
        note: order.note || '',
      };
      lines.value = order.items.map((item: any) => ({
        product_variant_id: item.product_variant_id,
        label: `${item.product_variant.product.name} - ${item.product_variant.name}`,
        sku: item.product_variant.sku,
        allow_decimal: item.product_variant.product.is_weighted,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        tax_rate: item.tax_rate,
        discount_amount: item.discount_amount,
      }));
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
      <UiParentCard :title="isEdit ? 'Edit Purchase Order' : 'New Purchase Order'" icon="mdi-clipboard-edit-outline">
        <template #action>
          <v-btn variant="outlined" color="primary" to="/purchase-orders" prepend-icon="mdi-arrow-left">Back</v-btn>
        </template>

        <v-skeleton-loader v-if="loading" type="article, table" />
        <v-form v-else ref="formRef" @submit.prevent>
          <v-row>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Deliver To</v-label>
              <v-text-field :model-value="authStore.storeName" disabled hide-details />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Supplier</v-label>
              <v-autocomplete v-model="form.supplier_id" :items="lookups.suppliers.value" item-title="name" item-value="id" :rules="[rules.requiredSelect]" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Order Date</v-label>
              <v-text-field v-model="form.order_date" type="date" :rules="[rules.required]" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Expected Delivery</v-label>
              <v-text-field v-model="form.expected_date" type="date" hide-details />
            </v-col>
            <v-col cols="12">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Note</v-label>
              <v-textarea v-model="form.note" rows="1" auto-grow hide-details />
            </v-col>
            <v-col cols="12">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Products</v-label>
              <VariantPicker :clientstore-id="authStore.clientstoreId" show-stock @select="addVariant" @error="(message) => alerts.fail(null, message)" />
            </v-col>
          </v-row>

          <div class="border rounded-md mt-4 overflow-x-auto">
            <v-table density="comfortable">
              <thead>
                <tr>
                  <th style="min-width: 220px">PRODUCT</th>
                  <th style="width: 130px">QTY</th>
                  <th style="width: 140px">UNIT COST</th>
                  <th style="width: 110px">TAX %</th>
                  <th style="width: 130px">DISCOUNT</th>
                  <th class="text-right" style="width: 140px">LINE TOTAL</th>
                  <th style="width: 60px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, index) in lines" :key="line.product_variant_id">
                  <td>
                    <div class="text-subtitle-2">{{ line.label }}</div>
                    <div class="text-caption text-lightText">{{ line.sku }}<span v-if="line.stock_quantity !== undefined"> · On hand {{ formatNumber(line.stock_quantity, 3) }} {{ line.stock_unit }}</span></div>
                  </td>
                  <td><v-text-field v-model.number="line.quantity" type="number" min="0" :step="line.allow_decimal ? 0.001 : 1" density="compact" hide-details /></td>
                  <td><v-text-field v-model.number="line.unit_cost" type="number" min="0" step="0.01" density="compact" hide-details /></td>
                  <td><v-text-field v-model.number="line.tax_rate" type="number" min="0" max="100" density="compact" hide-details /></td>
                  <td><v-text-field v-model.number="line.discount_amount" type="number" min="0" density="compact" hide-details /></td>
                  <td class="text-right font-weight-semibold">{{ formatMoney(lineTotal(line).total) }}</td>
                  <td><v-btn icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="lines.splice(index, 1)"></v-btn></td>
                </tr>
                <tr v-if="!lines.length">
                  <td colspan="7" class="text-center text-lightText py-6">Search or scan products above to add them to this order.</td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <div class="d-flex mt-6">
            <LineTotals :subtotal="totals.subtotal" :discount="totals.discount" :tax="totals.tax" :total="totals.total" />
          </div>

          <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mt-4 single-line-alert" closable />

          <div class="d-flex justify-end gap-2 mt-6">
            <BtnOutlined type="button" outline="Cancel" @click="router.back()" />
            <BtnFilled type="button" :filled="isEdit ? 'Save Changes' : 'Save as Draft'" :loading="saving" @click="save" />
          </div>
        </v-form>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
