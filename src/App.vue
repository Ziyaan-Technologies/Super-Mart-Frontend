<template>
  <RouterView></RouterView>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { useAuthStore } from '@/stores/auth';
import { watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

onMounted(() => {
  window.addEventListener('storage', (event) => {
    if (event.key === 'jwt' && !event.newValue) {
      authStore.logout(false);
    }
  });
  if (authStore.jwt) {
    authStore.refreshClient().catch(() => undefined);
  }
});

watch(() => authStore.jwt, (newToken) => {
  if (!newToken) {
    router.push({ name: 'Login' });
  }
});
</script>

<style>
.pac-container {
  z-index: 3000 !important;
}
</style>
