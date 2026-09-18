<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import BtnOutlined from '@/components/shared/BtnOutlined.vue';
import ImageField from '@/components/shared/ImageField.vue';
import { useAlerts } from '@/composables/useAlerts';
import { useLookups } from '@/composables/useLookups';
import { formatMoney, rules, uploadImage } from '@/utils/api';

const route = useRoute();
const router = useRouter();
const alerts = useAlerts();
const lookups = useLookups();
const id = computed(() => route.params.id as string | undefined);
const isEdit = computed(() => !!id.value);
const formRef = ref<any>(null);
const units = ref<any[]>([]);
const taxes = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const imageFile = ref<File | null>(null);
const form = ref<any>({
  name: '',
  description: '',
  category_id: null,
  brand_id: null,
  unit_id: null,
  tax_id: null,
  price_includes_tax: true,
  is_weighted: false,
  track_expiry: false,
  is_active: true,
  image_url: '',
});
const variants = ref<any[]>([]);

const selectedUnit = computed(() => units.value.find((unit) => unit.id === form.value.unit_id));
const selectedTax = computed(() => taxes.value.find((tax) => tax.id === form.value.tax_id));

function blankVariant() {
  return {
    id: undefined,
    name: variants.value.length ? '' : 'Standard',
    sku: '',
    barcode: '',
    unit_quantity: 1,
    cost_price: 0,
    sale_price: 0,
    mrp: null,
    reorder_level: 0,
    is_active: true,
  };
}

function margin(variant: any) {
  const price = Number(variant.sale_price) || 0;
  const cost = Number(variant.cost_price) || 0;
  const rate = Number(selectedTax.value?.rate) || 0;
  const net = form.value.price_includes_tax ? price / (1 + rate / 100) : price;
  if (!net) return null;
  return Math.round(((net - cost) / net) * 1000) / 10;
}

function suggestSku(variant: any, index: number) {
  if (variant.sku || !form.value.name) return;
  const base = form.value.name.replace(/[^a-z0-9]+/gi, '').slice(0, 6).toUpperCase();
  const suffix = (variant.name || String(index + 1)).replace(/[^a-z0-9]+/gi, '').slice(0, 5).toUpperCase();
  variant.sku = `${base}-${suffix}`;
}

function variantError() {
  if (!variants.value.length) return 'Add at least one variant';
  for (const [index, variant] of variants.value.entries()) {
    if (!variant.name?.trim()) return `Variant ${index + 1}: name is required`;
    if (!variant.sku?.trim()) return `Variant ${index + 1}: SKU is required`;
    if (!(Number(variant.unit_quantity) > 0)) return `Variant ${index + 1}: pack size must be above zero`;
  }
  return '';
}

async function save() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  const message = variantError();
  if (message) {
    alerts.fail(null, message);
    return;
  }
  saving.value = true;
  try {
    const image = await uploadImage('product', imageFile.value);
    const payload = {
      ...form.value,
      name: form.value.name.trim(),
      image_url: image || form.value.image_url || undefined,
      brand_id: form.value.brand_id || null,
      tax_id: form.value.tax_id || null,
      variants: variants.value.map((variant) => ({
        ...(variant.id ? { id: variant.id } : {}),
        name: variant.name.trim(),
        sku: variant.sku.trim(),
        barcode: variant.barcode?.trim() || undefined,
        unit_quantity: Number(variant.unit_quantity),
        cost_price: Number(variant.cost_price) || 0,
        sale_price: Number(variant.sale_price) || 0,
        mrp: variant.mrp === null || variant.mrp === '' ? undefined : Number(variant.mrp),
        reorder_level: Number(variant.reorder_level) || 0,
        is_active: variant.is_active,
      })),
    };
    if (isEdit.value) {
      await axios.put(`products/${id.value}`, payload);
    } else {
      await axios.post('products', payload);
    }
    router.push('/products');
  } catch (error) {
    alerts.fail(error);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    const [, , unitResponse, taxResponse] = await Promise.all([
      lookups.loadCategories(),
      lookups.loadBrands(),
      axios.get('units/list'),
      axios.get('taxes/list'),
    ]);
    units.value = unitResponse.data.map((unit: any) => ({ ...unit, label: `${unit.name} (${unit.short_name})` }));
    taxes.value = taxResponse.data.map((tax: any) => ({ ...tax, label: `${tax.name} · ${tax.rate}%` }));
    if (isEdit.value) {
      const product = (await axios.get(`products/${id.value}`)).data;
      form.value = {
        name: product.name,
        description: product.description || '',
        category_id: product.category_id,
        brand_id: product.brand_id || null,
        unit_id: product.unit_id,
        tax_id: product.tax_id || null,
        price_includes_tax: product.price_includes_tax,
        is_weighted: product.is_weighted,
        track_expiry: product.track_expiry,
        is_active: product.is_active,
        image_url: product.image_url || '',
      };
      variants.value = product.variants.map((variant: any) => ({ ...variant, barcode: variant.barcode || '' }));
    } else {
      variants.value = [blankVariant()];
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
      <UiParentCard :title="isEdit ? 'Edit Product' : 'Add New Product'" icon="mdi-package-variant-plus">
        <template #action>
          <v-btn variant="outlined" color="primary" to="/products" prepend-icon="mdi-arrow-left">Back</v-btn>
        </template>

        <v-skeleton-loader v-if="loading" type="article, table" />
        <v-form v-else ref="formRef" @submit.prevent>
          <v-row>
            <v-col cols="12" lg="8">
              <v-row>
                <v-col cols="12">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Product Name</v-label>
                  <v-text-field v-model="form.name" :rules="[rules.required]" placeholder="e.g. Olpers Milk" hide-details="auto" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Category</v-label>
                  <v-autocomplete v-model="form.category_id" :items="lookups.categories.value" item-title="path" item-value="id" :rules="[rules.requiredSelect]" hide-details="auto" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Brand</v-label>
                  <v-autocomplete v-model="form.brand_id" :items="lookups.brands.value" item-title="name" item-value="id" clearable placeholder="No brand" hide-details />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Unit</v-label>
                  <v-select v-model="form.unit_id" :items="units" item-title="label" item-value="id" :rules="[rules.requiredSelect]" hide-details="auto" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Tax</v-label>
                  <v-select v-model="form.tax_id" :items="taxes" item-title="label" item-value="id" clearable placeholder="No tax" hide-details />
                </v-col>
                <v-col cols="12">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Description</v-label>
                  <v-textarea v-model="form.description" rows="3" auto-grow hide-details />
                </v-col>
              </v-row>
            </v-col>
            <v-col cols="12" lg="4">
              <ImageField v-model="imageFile" :existing-url="form.image_url" />
              <div class="border rounded-md px-4 py-2 mt-4">
                <div class="d-flex align-center justify-space-between">
                  <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.is_active }">Active?</p>
                  <v-switch color="primary" v-model="form.is_active" hide-details></v-switch>
                </div>
                <div class="d-flex align-center justify-space-between">
                  <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.price_includes_tax }">Prices include tax?</p>
                  <v-switch color="primary" v-model="form.price_includes_tax" hide-details></v-switch>
                </div>
                <div class="d-flex align-center justify-space-between">
                  <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.is_weighted }">Sold by weight (loose)?</p>
                  <v-switch color="primary" v-model="form.is_weighted" hide-details></v-switch>
                </div>
                <div class="d-flex align-center justify-space-between">
                  <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.track_expiry }">Track batches and expiry?</p>
                  <v-switch color="primary" v-model="form.track_expiry" hide-details></v-switch>
                </div>
              </div>
              <v-alert v-if="form.is_weighted && selectedUnit && !selectedUnit.allow_decimal" type="warning" variant="tonal" density="compact" class="mt-3">
                Weighed products usually need a unit that allows decimals (kg, g, L).
              </v-alert>
              <v-alert v-if="form.is_weighted" type="info" variant="tonal" density="compact" class="mt-3">
                For scale labels, set the variant barcode to the 5 or 6 digit PLU printed by your scale. The POS reads labels that start with 2.
              </v-alert>
            </v-col>
          </v-row>

          <div class="d-flex align-center justify-space-between mt-6 mb-2">
            <div>
              <h4 class="text-h5">Variants / Packs</h4>
              <p class="text-caption text-lightText mb-0">
                Each variant is a separate SKU with its own barcode, price and stock. Pack size is how many {{ selectedUnit?.short_name || 'units' }} one variant holds.
              </p>
            </div>
            <v-btn variant="tonal" color="primary" prepend-icon="mdi-plus" @click="variants.push(blankVariant())">Add Variant</v-btn>
          </div>

          <div class="border rounded-md overflow-x-auto">
            <v-table density="comfortable">
              <thead>
                <tr>
                  <th style="min-width: 140px">VARIANT</th>
                  <th style="min-width: 150px">SKU</th>
                  <th style="min-width: 170px">BARCODE</th>
                  <th style="width: 110px">PACK SIZE</th>
                  <th style="width: 120px">COST</th>
                  <th style="width: 120px">SALE PRICE</th>
                  <th style="width: 110px">MRP</th>
                  <th style="width: 110px">REORDER AT</th>
                  <th style="width: 90px">MARGIN</th>
                  <th style="width: 70px">ACTIVE</th>
                  <th style="width: 60px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(variant, index) in variants" :key="variant.id || `new-${index}`">
                  <td><v-text-field v-model="variant.name" density="compact" hide-details placeholder="1 kg" /></td>
                  <td><v-text-field v-model="variant.sku" density="compact" hide-details @focus="suggestSku(variant, index)" /></td>
                  <td><v-text-field v-model="variant.barcode" density="compact" hide-details prepend-inner-icon="mdi-barcode" /></td>
                  <td><v-text-field v-model.number="variant.unit_quantity" type="number" min="0" density="compact" hide-details /></td>
                  <td><v-text-field v-model.number="variant.cost_price" type="number" min="0" density="compact" hide-details /></td>
                  <td><v-text-field v-model.number="variant.sale_price" type="number" min="0" density="compact" hide-details /></td>
                  <td><v-text-field v-model.number="variant.mrp" type="number" min="0" density="compact" hide-details /></td>
                  <td><v-text-field v-model.number="variant.reorder_level" type="number" min="0" density="compact" hide-details /></td>
                  <td>
                    <span v-if="margin(variant) !== null" :class="(margin(variant) ?? 0) < 0 ? 'text-error font-weight-bold' : ''">{{ margin(variant) }}%</span>
                    <span v-else class="text-lightText">-</span>
                  </td>
                  <td><v-checkbox-btn v-model="variant.is_active" color="primary" density="compact" /></td>
                  <td><v-btn icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" :disabled="variants.length === 1" @click="variants.splice(index, 1)"></v-btn></td>
                </tr>
              </tbody>
            </v-table>
          </div>
          <p v-if="isEdit" class="text-caption text-lightText mt-3 mb-0">Removing a variant that already has stock history deactivates it instead of deleting it.</p>
          <p v-if="variants.length" class="text-caption text-lightText mt-1">
            Margin is calculated on the price {{ form.price_includes_tax ? `after removing ${selectedTax?.rate || 0}% tax` : 'before tax' }}. Example sale price {{ formatMoney(variants[0].sale_price) }}.
          </p>

          <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mt-4 single-line-alert" closable />

          <div class="d-flex justify-end gap-2 mt-6">
            <BtnOutlined type="button" outline="Cancel" @click="router.back()" />
            <BtnFilled type="button" :filled="isEdit ? 'Save Changes' : 'Create Product'" :loading="saving" @click="save" />
          </div>
        </v-form>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
