<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import { useAuthStore } from '@/stores/auth';
import { useAlerts } from '@/composables/useAlerts';
import { rules } from '@/utils/api';

const authStore = useAuthStore();
const alerts = useAlerts();
const form = ref();
const currentPassword = ref('');
const password = ref('');
const confirmPassword = ref('');
const visible = ref(false);
const loading = ref(false);

const confirmRule = (v: string) => v === password.value || 'Passwords do not match';

async function update() {
  const { valid } = await form.value.validate();
  if (!valid) return;
  loading.value = true;
  try {
    const response = await axios.put('auth/me/password', { current_password: currentPassword.value, new_password: password.value });
    authStore.jwt = response.data.token;
    localStorage.setItem('jwt', response.data.token);
    form.value.reset();
    alerts.success('Password updated. Other devices have been signed out.');
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
            <v-card-title class="text-h5">Update Password</v-card-title>
          </div>
        </v-card-item>
        <v-card-text class="pa-0">
          <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />
          <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-4 single-line-alert" closable />
          <v-container class="mt-6">
            <v-form ref="form" @submit.prevent="update">
              <v-row class="d-flex justify-center gap-3">
                <v-col class="pb-0" cols="12" sm="10" md="7">
                  <v-label class="text-subtitle-1 font-weight-medium pb-2">Current Password</v-label>
                  <v-text-field v-model="currentPassword" :rules="[rules.required]" :type="visible ? 'text' : 'password'" placeholder="Current Password"></v-text-field>
                </v-col>
                <v-col class="pb-0" cols="12" sm="10" md="7">
                  <v-label class="text-subtitle-1 font-weight-medium pb-2">New Password</v-label>
                  <v-text-field v-model="password" :rules="[rules.required, rules.minLength(6)]" :type="visible ? 'text' : 'password'"
                    :append-inner-icon="visible ? 'mdi-eye' : 'mdi-eye-off'" @click:append-inner="visible = !visible" placeholder="Password"></v-text-field>
                </v-col>
                <v-col class="pb-0" cols="12" sm="10" md="7">
                  <v-label class="text-subtitle-1 font-weight-medium pb-2">Confirm Password</v-label>
                  <v-text-field v-model="confirmPassword" :rules="[rules.required, confirmRule]" :type="visible ? 'text' : 'password'" placeholder="Confirm Password"></v-text-field>
                </v-col>
                <v-col cols="12" sm="10" md="7">
                  <BtnFilled filled="Update" :loading="loading" class="w-100" type="submit" />
                </v-col>
              </v-row>
            </v-form>
          </v-container>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
