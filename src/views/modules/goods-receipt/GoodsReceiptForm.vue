<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
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
import { can } from '@/utils/permissions';
import { apiError, formatMoney, formatNumber, rules, today } from '@/utils/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const alerts = useAlerts();
const lookups = useLookups();
const id = computed(() => route.params.id as string | undefined);
const isEdit = computed(() => !!id.value);
const draftId = ref<number | null>(null);
const receiptId = computed(() => id.value || draftId.value);
const formRef = ref<any>(null);
const orders = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const form = ref<any>({
  purchase_order_id: null,
  supplier_id: null,
  received_date: today(),
  supplier_invoice_number: '',
  note: '',
});
const lines = ref<any[]>([]);
const totals = computed(() => documentTotals(lines.value));
const fromOrder = computed(() => !!form.value.purchase_order_id);
let skipOrderWatch = false;

const orderOptions = computed(() => orders.value
  .filter((order) => (order.clientstore_id ?? order.clientstore?.id) === authStore.clientstoreId)
  .map((order) => ({ id: order.id, name: `${order.po_number} · ${order.supplier?.name}` })));

function lineFromOrderItem(item: any) {
  const remaining = Math.max(0, Number(item.quantity) - Number(item.received_quantity));
  return {
    product_variant_id: item.product_variant_id,
    purchase_order_item_id: item.id,
    label: `${item.product_variant.product.name} - ${item.product_variant.name}`,
    sku: item.product_variant.sku,
    track_expiry: item.product_variant.product.track_expiry,
    allow_decimal: item.product_variant.product.is_weighted,
    ordered: item.quantity,
    remaining,
    quantity: remaining,
    free_quantity: 0,
    unit_cost: item.unit_cost,
    tax_rate: item.tax_rate,
    discount_amount: remaining && item.quantity ? Math.round((item.discount_amount * remaining / item.quantity) * 100) / 100 : 0,
    batch_number: '',
    expiry_date: '',
  };
}

async function loadOrder(orderId: number | null) {
  if (!orderId) {
    lines.value = [];
    return;
  }
  const order = (await axios.get(`purchase-orders/${orderId}`)).data;
  form.value.supplier_id = order.supplier_id;
  lines.value = order.items.map(lineFromOrderItem).filter((line: any) => line.remaining > 0);
}

watch(() => form.value.purchase_order_id, (orderId) => {
  if (skipOrderWatch) return;
  loadOrder(orderId).catch((error) => alerts.fail(error));
});

function addVariant(variant: any) {
  lines.value.push({
    product_variant_id: variant.id,
    purchase_order_item_id: null,
    label: `${variant.product_name} - ${variant.name}`,
    sku: variant.sku,
    track_expiry: variant.track_expiry,
    allow_decimal: variant.is_weighted,
    quantity: 1,
    free_quantity: 0,
    unit_cost: variant.cost_price,
    tax_rate: variant.tax_rate || 0,
    discount_amount: 0,
    batch_number: '',
    expiry_date: '',
  });
}

function lineError() {
  if (!lines.value.length) return 'Add at least one line';
  const invalid = lines.value.find((line) => !(Number(line.quantity) > 0));
  if (invalid) return `${invalid.label}: quantity must be above zero (remove the line if nothing arrived)`;
  const over = lines.value.find((line) => line.remaining !== undefined && Number(line.quantity) > line.remaining);
  if (over) return `${over.label}: only ${formatNumber(over.remaining, 3)} is still open on the purchase order`;
  const missingExpiry = lines.value.find((line) => line.track_expiry && !line.expiry_date);
  if (missingExpiry) return `${missingExpiry.label}: expiry date is required`;
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
    purchase_order_id: form.value.purchase_order_id || undefined,
    supplier_invoice_number: form.value.supplier_invoice_number || undefined,
    items: lines.value.map((line) => ({
      product_variant_id: line.product_variant_id,
      purchase_order_item_id: line.purchase_order_item_id || undefined,
      quantity: Number(line.quantity),
      free_quantity: Number(line.free_quantity) || 0,
      unit_cost: Number(line.unit_cost) || 0,
      tax_rate: Number(line.tax_rate) || 0,
      discount_amount: Number(line.discount_amount) || 0,
      batch_number: line.batch_number || undefined,
      expiry_date: line.expiry_date || undefined,
    })),
  };
  try {
    let receipt = receiptId.value
      ? (await axios.put(`goods-receipts/${receiptId.value}`, payload)).data
      : (await axios.post('goods-receipts', payload)).data;
    if (post) {
      try {
        receipt = (await axios.put(`goods-receipts/${receipt.id}/post`)).data;
      } catch (error) {
        draftId.value = receipt.id;
        alerts.fail(null, `${receipt.grn_number} was saved as a draft but could not be posted: ${apiError(error)}`);
        return;
      }
    }
    router.push(`/goods-receipts/${receipt.id}`);
  } catch (error) {
    alerts.fail(error);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    const [, orderResponse] = await Promise.all([lookups.loadSuppliers(), axios.get('purchase-orders/receivable')]);
    orders.value = orderResponse.data;
    if (isEdit.value) {
      const receipt = (await axios.get(`goods-receipts/${id.value}`)).data;
      if (receipt.status !== 'Draft') {
        router.replace(`/goods-receipts/${receipt.id}`);
        return;
      }
      skipOrderWatch = true;
      form.value = {
        purchase_order_id: receipt.purchase_order_id || null,
        supplier_id: receipt.supplier_id,
        received_date: receipt.received_date,
        supplier_invoice_number: receipt.supplier_invoice_number || '',
        note: receipt.note || '',
      };
      if (receipt.purchase_order && !orders.value.some((order) => order.id === receipt.purchase_order_id)) {
        orders.value.push({ ...receipt.purchase_order, clientstore_id: receipt.clientstore_id, supplier: receipt.supplier });
      }
      const order = receipt.purchase_order_id ? (await axios.get(`purchase-orders/${receipt.purchase_order_id}`)).data : null;
      lines.value = receipt.items.map((item: any) => {
        const orderItem = order?.items.find((row: any) => row.id === item.purchase_order_item_id);
        return {
          product_variant_id: item.product_variant_id,
          purchase_order_item_id: item.purchase_order_item_id,
          label: `${item.product_variant.product.name} - ${item.product_variant.name}`,
          sku: item.product_variant.sku,
          track_expiry: item.product_variant.product.track_expiry,
          allow_decimal: item.product_variant.product.is_weighted,
          ordered: orderItem?.quantity,
          remaining: orderItem ? Math.max(0, orderItem.quantity - orderItem.received_quantity) : undefined,
          quantity: item.quantity,
          free_quantity: item.free_quantity,
          unit_cost: item.unit_cost,
          tax_rate: item.tax_rate,
          discount_amount: item.discount_amount,
          batch_number: item.batch_number || '',
          expiry_date: item.expiry_date || '',
        };
      });
      setTimeout(() => (skipOrderWatch = false));
    } else if (route.query.purchase_order_id) {
      form.value.purchase_order_id = Number(route.query.purchase_order_id);
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
      <UiParentCard :title="isEdit ? 'Edit Stock In' : 'Stock In · Receive Goods'" icon="mdi-truck-delivery-outline">
        <template #action>
          <v-btn variant="outlined" color="primary" to="/goods-receipts" prepend-icon="mdi-arrow-left">Back</v-btn>
        </template>

        <v-skeleton-loader v-if="loading" type="article, table" />
        <v-form v-else ref="formRef" @submit.prevent>
          <v-row>
            <v-col cols="12" md="6">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Against Purchase Order (optional)</v-label>
              <v-autocomplete v-model="form.purchase_order_id" :items="orderOptions" item-title="name" item-value="id" clearable
                placeholder="Direct receipt without a PO" hide-details />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Branch</v-label>
              <v-text-field :model-value="authStore.storeName" disabled hide-details />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Supplier</v-label>
              <v-autocomplete v-model="form.supplier_id" :items="lookups.suppliers.value" item-title="name" item-value="id" :disabled="fromOrder"
                :rules="[rules.requiredSelect]" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Received On</v-label>
              <v-text-field v-model="form.received_date" type="date" :rules="[rules.required]" hide-details="auto" />
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Supplier Invoice No.</v-label>
              <v-text-field v-model="form.supplier_invoice_number" hide-details />
            </v-col>
            <v-col cols="12" md="6">
              <v-label class="text-subtitle-1 pb-2 text-lightText">Note</v-label>
              <v-text-field v-model="form.note" hide-details />
            </v-col>
            <v-col cols="12">
              <template v-if="!fromOrder">
                <v-label class="text-subtitle-1 pb-2 text-lightText">Received Items</v-label>
                <VariantPicker :clientstore-id="authStore.clientstoreId" show-stock @select="addVariant" @error="(message) => alerts.fail(null, message)" />
              </template>
              <v-alert v-else type="info" variant="tonal" density="compact">
                Lines come from the purchase order. Change quantities to what actually arrived, and remove lines that did not arrive.
              </v-alert>
            </v-col>
          </v-row>

          <div class="border rounded-md mt-4 overflow-x-auto">
            <v-table density="comfortable">
              <thead>
                <tr>
                  <th style="min-width: 220px">PRODUCT</th>
                  <th style="width: 120px">QTY</th>
                  <th style="width: 100px">FREE</th>
                  <th style="width: 130px">UNIT COST</th>
                  <th style="width: 100px">TAX %</th>
                  <th style="width: 120px">DISCOUNT</th>
                  <th style="width: 130px">BATCH</th>
                  <th style="width: 170px">EXPIRY</th>
                  <th class="text-right" style="width: 130px">TOTAL</th>
                  <th style="width: 60px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, index) in lines" :key="`${line.product_variant_id}-${index}`">
                  <td>
                    <div class="text-subtitle-2">{{ line.label }}</div>
                    <div class="text-caption text-lightText">
                      {{ line.sku }}
                      <span v-if="line.remaining !== undefined"> · open {{ formatNumber(line.remaining, 3) }} of {{ formatNumber(line.ordered, 3) }}</span>
                      <v-chip v-if="line.track_expiry" size="x-small" color="orange" variant="tonal" class="ml-1">expiry</v-chip>
                    </div>
                  </td>
                  <td><v-text-field v-model.number="line.quantity" type="number" min="0" :step="line.allow_decimal ? 0.001 : 1" density="compact" hide-details /></td>
                  <td><v-text-field v-model.number="line.free_quantity" type="number" min="0" density="compact" hide-details /></td>
                  <td><v-text-field v-model.number="line.unit_cost" type="number" min="0" step="0.01" density="compact" hide-details /></td>
                  <td><v-text-field v-model.number="line.tax_rate" type="number" min="0" max="100" density="compact" hide-details /></td>
                  <td><v-text-field v-model.number="line.discount_amount" type="number" min="0" density="compact" hide-details /></td>
                  <td><v-text-field v-model="line.batch_number" density="compact" hide-details /></td>
                  <td><v-text-field v-model="line.expiry_date" type="date" density="compact" hide-details :error="line.track_expiry && !line.expiry_date" /></td>
                  <td class="text-right font-weight-semibold">{{ formatMoney(lineTotal(line).total) }}</td>
                  <td><v-btn icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="lines.splice(index, 1)"></v-btn></td>
                </tr>
                <tr v-if="!lines.length">
                  <td colspan="10" class="text-center text-lightText py-6">
                    {{ fromOrder ? 'Everything on this purchase order has been received.' : 'Search or scan products above to add received items.' }}
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <div class="d-flex mt-6">
            <LineTotals :subtotal="totals.subtotal" :discount="totals.discount" :tax="totals.tax" :total="totals.total" />
          </div>

          <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mt-4 single-line-alert" closable />

          <div class="d-flex justify-end flex-wrap gap-2 mt-6">
            <BtnOutlined type="button" outline="Cancel" @click="router.back()" />
            <BtnOutlined type="button" outline="Save Draft" class="text-primary" :loading="saving" @click="save(false)" />
            <BtnFilled type="button" filled="Save & Post to Stock" :loading="saving" :disabled="!can('goods_receipts_post', 'Goods Receipt')" @click="save(true)" />
          </div>
        </v-form>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
