<script setup lang="ts">
import { onMounted, ref } from 'vue';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import ImageField from '@/components/shared/ImageField.vue';
import { useAuthStore } from '@/stores/auth';
import { useAlerts } from '@/composables/useAlerts';
import { useLookups } from '@/composables/useLookups';
import { rules, uploadImage } from '@/utils/api';

const authStore = useAuthStore();
const alerts = useAlerts();
const lookups = useLookups();
const businessTypes = ['Supermarket', 'Hypermarket', 'Grocery', 'Convenience Store', 'Pharmacy'];
const vendor = ref<any>(null);
const logoFile = ref<File | null>(null);
const loading = ref(true);
const saving = ref(false);
const formRef = ref<any>(null);
const form = ref<any>({});

async function load() {
  loading.value = true;
  try {
    vendor.value = (await axios.get('vendors/me')).data;
    form.value = {
      business_name: vendor.value.business_name,
      owner_name: vendor.value.owner_name || '',
      phone: vendor.value.phone || '',
      address: vendor.value.address || '',
      business_type: vendor.value.business_type,
      tax_number: vendor.value.tax_number || '',
      city_id: vendor.value.city_id || null,
      allow_negative_stock: vendor.value.allow_negative_stock,
      logo_url: vendor.value.logo_url || '',
    };
    await lookups.loadCities(vendor.value.country_id);
  } catch (error) {
    alerts.fail(error);
  } finally {
    loading.value = false;
  }
}

async function save() {
  const { valid } = await formRef.value.validate();
  if (!valid) return;
  saving.value = true;
  try {
    const logo = await uploadImage('vendor', logoFile.value);
    const payload = {
      ...form.value,
      business_name: form.value.business_name.trim(),
      city_id: form.value.city_id || null,
      logo_url: logo || form.value.logo_url || undefined,
    };
    vendor.value = (await axios.put('vendors/me', payload)).data;
    form.value.logo_url = vendor.value.logo_url || '';
    logoFile.value = null;
    await authStore.refreshClient();
    alerts.success('Business settings have been saved!');
  } catch (error) {
    alerts.fail(error);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard title="Business Settings" icon="mdi-cog-outline">
        <v-skeleton-loader v-if="loading" type="article, article" />
        <v-form v-else ref="formRef" @submit.prevent="save">
          <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-4 single-line-alert" closable>
            <template v-slot:prepend><v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon></template>
          </v-alert>
          <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />

          <v-row>
            <v-col cols="12" md="8">
              <v-row>
                <v-col cols="12" sm="6">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Business Name</v-label>
                  <v-text-field v-model="form.business_name" :rules="[rules.required]" hide-details="auto" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Business Type</v-label>
                  <v-select v-model="form.business_type" :items="businessTypes" hide-details />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Login Email</v-label>
                  <v-text-field :model-value="vendor?.email" disabled hide-details />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Country</v-label>
                  <v-text-field :model-value="vendor?.country?.name" disabled hide-details />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Contact Person</v-label>
                  <v-text-field v-model="form.owner_name" hide-details />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Phone</v-label>
                  <v-text-field v-model="form.phone" hide-details />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">City</v-label>
                  <v-autocomplete v-model="form.city_id" :items="lookups.cities.value" item-title="name" item-value="id" clearable hide-details />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Tax Number</v-label>
                  <v-text-field v-model="form.tax_number" hint="Printed on receipts" hide-details />
                </v-col>
                <v-col cols="12">
                  <v-label class="text-subtitle-1 pb-2 text-lightText">Address</v-label>
                  <v-text-field v-model="form.address" hide-details />
                </v-col>
              </v-row>
            </v-col>
            <v-col cols="12" md="4">
              <ImageField v-model="logoFile" :existing-url="form.logo_url" label="Logo" />
              <div class="border rounded-md pa-4 mt-6">
                <div class="d-flex align-center justify-space-between">
                  <p class="text-subtitle-1 font-weight-bold" :class="{ 'text-primary': form.allow_negative_stock }">Allow stock to go below zero?</p>
                  <v-switch color="primary" v-model="form.allow_negative_stock" hide-details></v-switch>
                </div>
                <p class="text-caption text-lightText">When off, sales, transfers and adjustments that would take stock below zero are rejected.</p>
                <v-alert v-if="form.allow_negative_stock && !vendor?.allow_negative_stock" type="warning" variant="tonal" density="compact" class="mt-3 text-caption">
                  Use this only if you correct stock later with adjustments.
                </v-alert>
              </div>
            </v-col>
          </v-row>

          <div class="d-flex justify-end mt-6">
            <BtnFilled filled="Save Settings" type="submit" :loading="saving" class="w-100 w-sm-auto" />
          </div>
        </v-form>
      </UiParentCard>
    </v-col>
  </v-row>
</template>
