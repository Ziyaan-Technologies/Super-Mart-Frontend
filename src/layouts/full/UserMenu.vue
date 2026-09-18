<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';

withDefaults(defineProps<{
  dark?: boolean;
}>(), {
  dark: false,
});

const authStore = useAuthStore();
</script>

<template>
  <v-menu location="bottom end">
    <template v-slot:activator="{ props }">
      <button v-if="dark" class="desk-titlebar__item" v-bind="props">
        <v-avatar size="22" color="white">
          <v-img v-if="authStore.client?.image_url" :src="authStore.client.image_url" cover />
          <v-icon v-else size="16" color="secondary">mdi-account</v-icon>
        </v-avatar>
        <span class="desk-hide-sm">{{ authStore.client?.full_name }}</span>
        <v-icon size="16">mdi-menu-down</v-icon>
      </button>
      <button v-else class="user-chip" v-bind="props">
        <v-avatar size="34" color="lightprimary">
          <v-img v-if="authStore.client?.image_url" :src="authStore.client.image_url" cover />
          <v-icon v-else size="20" color="primary">mdi-account</v-icon>
        </v-avatar>
        <span class="user-chip__name d-none d-sm-flex">
          <span class="font-weight-semibold">{{ authStore.client?.full_name }}</span>
          <span class="text-caption text-lightText">{{ authStore.roleName }}</span>
        </span>
        <v-icon size="18">mdi-chevron-down</v-icon>
      </button>
    </template>

    <v-card class="menu-card" width="290" elevation="8" rounded="lg">
      <div class="menu-card__header">
        <v-avatar size="42" color="lightprimary">
          <v-img v-if="authStore.client?.image_url" :src="authStore.client.image_url" cover />
          <v-icon v-else size="24" color="primary">mdi-account</v-icon>
        </v-avatar>
        <div class="overflow-hidden">
          <div class="font-weight-bold text-truncate">{{ authStore.client?.full_name }}</div>
          <div class="text-caption text-lightText text-truncate">{{ authStore.client?.email }}</div>
          <div class="text-caption">Role: <strong>{{ authStore.roleName || '-' }}</strong></div>
        </div>
      </div>
      <v-list density="compact" class="py-1">
        <v-list-item to="/profile/update-details" prepend-icon="mdi-account-edit-outline" title="My Profile" />
        <v-list-item to="/auth/update-password" prepend-icon="mdi-lock-reset" title="Change Password" />
      </v-list>
      <div class="menu-card__footer">
        <v-btn color="error" variant="flat" block prepend-icon="mdi-logout" @click="authStore.logout()">Log Out</v-btn>
      </div>
    </v-card>
  </v-menu>
</template>

<style scoped>
.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 3px 8px 3px 3px;
  border: 1px solid rgb(var(--v-theme-borderColor));
  border-radius: 999px;
  background: #fff;
}

.user-chip:hover {
  border-color: rgb(var(--v-theme-primary));
}

.user-chip__name {
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.15;
  font-size: 13px;
}

.menu-card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-bottom: 1px solid rgb(var(--v-theme-borderColor));
}

.menu-card__footer {
  padding: 10px 14px;
  border-top: 1px solid rgb(var(--v-theme-borderColor));
}
</style>
