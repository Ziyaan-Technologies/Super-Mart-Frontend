<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import { useAuthStore } from '@/stores/auth';
import { can } from '@/utils/permissions';
import { formatMoney } from '@/utils/api';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import BtnOutlined from '@/components/shared/BtnOutlined.vue';
import RegisterDialog from '@/views/modules/pos/RegisterDialog.vue';

withDefaults(defineProps<{
  dark?: boolean;
}>(), {
  dark: false,
});

const authStore = useAuthStore();
const checking = ref(false);
const openSession = ref<any>(null);
const promptDialog = ref(false);
const closeDialog = ref(false);

// A cashier who still has a counter open is asked to close it before leaving.
async function logout() {
  if (!authStore.clientstoreId || !can('pos_sell', 'POS')) {
    return authStore.logout();
  }
  checking.value = true;
  try {
    openSession.value = (await axios.get('pos/registers/current', { params: { clientstore_id: authStore.clientstoreId } })).data.session;
  } catch (error) {
    openSession.value = null;
  } finally {
    checking.value = false;
  }
  if (openSession.value) {
    promptDialog.value = true;
  } else {
    authStore.logout();
  }
}

function closeCounter() {
  promptDialog.value = false;
  closeDialog.value = true;
}
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
        <v-btn color="error" variant="flat" block prepend-icon="mdi-logout" :loading="checking" @click="logout">Log Out</v-btn>
      </div>
    </v-card>
  </v-menu>

  <v-dialog v-model="promptDialog" max-width="460" persistent>
    <v-card class="ui-modal">
      <div class="ui-modal__header">
        <span class="ui-modal__title">Close your counter first</span>
        <button class="ui-modal__close" type="button" aria-label="Close" @click="promptDialog = false">
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>
      <div class="logout-prompt">
        <v-avatar size="56" color="lightwarning"><v-icon size="30" color="warning">mdi-cash-register</v-icon></v-avatar>
        <p class="logout-prompt__title">{{ openSession?.counter?.name || 'Your counter' }} is still open</p>
        <p class="logout-prompt__hint">
          {{ openSession?.session_number }} · opened with {{ formatMoney(openSession?.opening_cash) }}.<br>Count the cash and close it before you log out.
        </p>
        <button type="button" class="logout-prompt__skip" @click="promptDialog = false; authStore.logout()">Log out without closing</button>
      </div>
      <div class="ui-modal__divider" />
      <div class="ui-modal__footer">
        <BtnOutlined outline="Cancel" @click="promptDialog = false" />
        <BtnFilled filled="Close Counter" @click="closeCounter" />
      </div>
    </v-card>
  </v-dialog>

  <RegisterDialog v-if="openSession" v-model="closeDialog" :session-id="openSession.id" @closed="closeDialog = false; authStore.logout()" />
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

.logout-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 26px 24px 16px;
  text-align: center;
}

.logout-prompt__title {
  margin: 6px 0 0;
  font-size: 16px;
  font-weight: 600;
  color: rgb(var(--v-theme-textPrimary));
}

.logout-prompt__hint {
  margin: 0;
  font-size: 13px;
  color: rgb(var(--v-theme-lightgray));
}

.logout-prompt__skip {
  margin-top: 6px;
  font-size: 12.5px;
  color: rgb(var(--v-theme-error));
  text-decoration: underline;
}

.menu-card__footer {
  padding: 10px 14px;
  border-top: 1px solid rgb(var(--v-theme-borderColor));
}
</style>
