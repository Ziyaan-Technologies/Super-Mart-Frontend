<script setup lang="ts">
import { ref } from 'vue';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import BtnOutlined from '@/components/shared/BtnOutlined.vue';

withDefaults(defineProps<{
  modelValue: boolean;
  title: string;
  subtitle?: string;
  icon?: string;
  maxWidth?: number | string;
  submitLabel?: string;
  loading?: boolean;
  hideFooter?: boolean;
  showAlert?: boolean;
  alertText?: string;
  showErrorAlert?: boolean;
  errorText?: string;
}>(), {
  icon: '',
  maxWidth: 560,
  submitLabel: 'Save',
  loading: false,
  hideFooter: false,
  showAlert: false,
  alertText: '',
  showErrorAlert: false,
  errorText: '',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'submit'): void;
  (e: 'close-error'): void;
}>();

const formRef = ref<any>(null);

function close() {
  emit('update:modelValue', false);
}

async function validate() {
  if (!formRef.value) return true;
  const { valid } = await formRef.value.validate();
  return valid;
}

function resetValidation() {
  formRef.value?.resetValidation();
}

defineExpose({ validate, resetValidation });
</script>

<template>
  <v-dialog :model-value="modelValue" :max-width="maxWidth" persistent scrollable
    @update:model-value="emit('update:modelValue', $event)">
    <v-card class="ui-modal">
      <div class="ui-modal__header">
        <div>
          <span class="ui-modal__title">{{ title }}</span>
          <div v-if="subtitle" class="ui-modal__subtitle">{{ subtitle }}</div>
        </div>
        <button class="ui-modal__close" type="button" :aria-label="`Close ${title}`" @click="close">
          <v-icon size="18">mdi-close</v-icon>
        </button>
      </div>

      <v-card-text class="ui-modal__body">
        <v-form ref="formRef" class="drawer-form" @submit.prevent="emit('submit')">
          <slot />
          <v-alert :model-value="showAlert" :text="alertText" type="success" density="compact" class="mt-3 single-line-alert" />
          <v-alert :model-value="showErrorAlert" :text="errorText" type="error" density="compact" class="mt-3 single-line-alert" closable
            @click:close="emit('close-error')" />
        </v-form>
      </v-card-text>

      <template v-if="!hideFooter">
        <div class="ui-modal__divider" />
        <div class="ui-modal__footer">
          <BtnOutlined type="button" outline="Cancel" @click="close" />
          <BtnFilled type="button" :filled="submitLabel" :loading="loading" @click="emit('submit')" />
        </div>
      </template>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.ui-modal__subtitle {
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 2px;
}

.drawer-form :deep(.v-label.text-subtitle-1) {
  font-size: 13px !important;
  font-weight: 500;
  color: rgb(var(--v-theme-textPrimary)) !important;
  padding-bottom: 4px !important;
}
</style>
