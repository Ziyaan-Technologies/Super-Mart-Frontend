<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { Form } from 'vee-validate';

const password = ref('');
const username = ref('');
const visiblePwd = ref(false);
const passwordRules = ref([
  (v: string) => !!v || 'Password is required'
]);
const emailRules = ref([(v: string) => !!v || 'E-mail is required', (v: string) => /.+@.+\..+/.test(v) || 'E-mail must be valid']);

function validate(values: any, { setErrors }: any) {
  const authStore = useAuthStore();
  return authStore.login(username.value.trim(), password.value)
    .catch((error) => {
      const errorMessage = error?.response?.data?.message || error.message || 'An unexpected error occurred. Please try again.';
      setErrors({ apiError: errorMessage });
    });
}
</script>

<template>
  <Form @submit="validate" v-slot="{ errors, isSubmitting }" class="text-start">
    <v-label class="form-label">Email</v-label>
    <VTextField v-model="username" :rules="emailRules" class="mb-4" required hide-details="auto" placeholder="you@store.com"
      prepend-inner-icon="mdi-email-outline" autocomplete="username" autofocus></VTextField>
    <v-label class="form-label">Password</v-label>
    <VTextField v-model="password" :rules="passwordRules" required hide-details="auto" :type="visiblePwd ? 'text' : 'password'"
      prepend-inner-icon="mdi-lock-outline" :append-inner-icon="visiblePwd ? 'mdi-eye' : 'mdi-eye-off'" autocomplete="current-password"
      @click:append-inner="visiblePwd = !visiblePwd" class="mb-5"></VTextField>
    <v-alert v-if="errors.apiError" type="error" density="compact" class="mb-4 text-start">{{ errors.apiError }}</v-alert>
    <v-btn type="submit" color="primary" size="large" block flat :loading="isSubmitting" class="sign-in-btn">Sign In</v-btn>
  </Form>
</template>

<style scoped>
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: rgb(var(--v-theme-textPrimary));
  opacity: 1;
  margin-bottom: 6px;
}

.sign-in-btn {
  border-radius: 10px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}
</style>
