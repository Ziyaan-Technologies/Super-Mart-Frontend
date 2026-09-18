<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import axios from 'axios';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import { useAuthStore } from '@/stores/auth';
import { useAlerts } from '@/composables/useAlerts';
import { rules, uploadImage } from '@/utils/api';

const authStore = useAuthStore();
const alerts = useAlerts();
const form = ref<any>({ full_name: '', phone: '', image_url: '' });
const file = ref<File | File[] | null>(null);
const loading = ref(false);
const editForm = ref();

const selectedFile = computed(() => (Array.isArray(file.value) ? file.value[0] : file.value) || null);
const preview = computed(() => (selectedFile.value ? URL.createObjectURL(selectedFile.value) : form.value.image_url));

watch(() => authStore.client, (client) => {
  form.value = { full_name: client?.full_name || '', phone: client?.phone || '', image_url: client?.image_url || '' };
}, { immediate: true });

async function update() {
  const { valid } = await editForm.value.validate();
  if (!valid) return;
  loading.value = true;
  try {
    const image = await uploadImage('client', selectedFile.value);
    await axios.put('auth/me/profile', { full_name: form.value.full_name, phone: form.value.phone, image_url: image || form.value.image_url || undefined });
    await authStore.refreshClient();
    file.value = null;
    alerts.success('Profile has been updated!');
  } catch (error) {
    alerts.fail(error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-row>
    <v-col cols="12">
      <v-card elevation="0" class="border">
        <v-card-item class="border-bottom">
          <div class="d-flex align-center justify-center">
            <v-card-title class="text-h5">Account Details</v-card-title>
          </div>
        </v-card-item>
        <v-card-text class="pa-0">
          <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />
          <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-4 single-line-alert" closable />
          <v-container class="mt-6">
            <v-form ref="editForm" @submit.prevent="update">
              <v-row class="d-flex justify-center gap-3">
                <v-col class="pb-0" cols="12" sm="10" md="7">
                  <v-label class="text-subtitle-1 font-weight-medium pb-2">Full Name</v-label>
                  <v-text-field v-model="form.full_name" :rules="[rules.required]" placeholder="Enter your full name"></v-text-field>
                </v-col>
                <v-col class="pb-0" cols="12" sm="10" md="7">
                  <v-label class="text-subtitle-1 font-weight-medium pb-2">Email Address</v-label>
                  <v-text-field :model-value="authStore.client?.email" disabled hide-details></v-text-field>
                </v-col>
                <v-col class="pb-0" cols="12" sm="10" md="7">
                  <v-label class="text-subtitle-1 font-weight-medium pb-2">Phone Number</v-label>
                  <v-text-field v-model="form.phone" :rules="[rules.required]" type="tel" placeholder="Phone Number"></v-text-field>
                </v-col>
                <v-col cols="12" sm="10" md="7">
                  <v-file-input v-model="file" accept="image/*" show-size prepend-icon="mdi-camera" variant="outlined" class="mb-4" label="Profile photo" />
                  <v-img v-if="preview" :src="preview" max-height="150" max-width="150" class="rounded-circle mx-auto" cover />
                </v-col>
                <v-col cols="12" sm="10" md="7">
                  <BtnFilled filled="Submit" :loading="loading" class="w-100" type="submit" />
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
