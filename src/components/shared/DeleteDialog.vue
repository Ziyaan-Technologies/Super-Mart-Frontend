<script setup lang="ts">
import BtnFilled from '@/components/shared/BtnFilled.vue';
import BtnOutlined from '@/components/shared/BtnOutlined.vue';

withDefaults(defineProps<{
  modelValue: boolean;
  message: string;
  hint?: string;
  confirmLabel?: string;
  icon?: string;
  tone?: 'error' | 'primary' | 'warning';
  loading?: boolean;
}>(), {
  hint: 'This action cannot be undone.',
  confirmLabel: 'Yes, Delete',
  icon: 'mdi-alert-circle-outline',
  tone: 'error',
  loading: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
}>();

function close() {
  emit('update:modelValue', false);
}

function confirm() {
  emit('confirm');
  emit('update:modelValue', false);
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="460" persistent @update:model-value="emit('update:modelValue', $event)">
    <v-card class="ui-modal confirm-modal">
      <div class="ui-modal__header">
        <span class="ui-modal__title">Confirm</span>
        <button class="ui-modal__close" type="button" aria-label="Close" @click="close">
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>
      <div class="confirm-modal__body">
        <v-icon size="44" :color="tone === 'warning' ? 'warning' : tone">{{ icon }}</v-icon>
        <p class="confirm-modal__message">{{ message }}</p>
        <p class="confirm-modal__hint">{{ hint }}</p>
      </div>
      <div class="ui-modal__divider" />
      <div class="ui-modal__footer justify-center">
        <BtnOutlined outline="Cancel" @click="close" />
        <BtnFilled :filled="confirmLabel" :loading="loading" :class="tone === 'error' ? 'app-btn--danger' : ''" @click="confirm" />
      </div>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.confirm-modal__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 26px 24px 18px;
  text-align: center;
}

.confirm-modal__message {
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--v-theme-textPrimary));
  margin: 0;
}

.confirm-modal__hint {
  font-size: 12.5px;
  color: rgb(var(--v-theme-lightgray));
  margin: 0;
}
</style>
