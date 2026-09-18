<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: File | null;
  existingUrl?: string | null;
  label?: string;
}>(), {
  existingUrl: '',
  label: 'Image',
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: File | null): void;
}>();

const previewUrl = ref<string | null>(null);
const fileError = ref('');

const shownImage = computed(() => previewUrl.value || props.existingUrl || '');

function revoke() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = null;
  }
}

function onChange(value: File | File[] | null) {
  const file = Array.isArray(value) ? value[0] || null : value;
  revoke();
  fileError.value = '';
  if (file && file.size > 5 * 1024 * 1024) {
    fileError.value = 'File must be 5 MB or smaller';
    emit('update:modelValue', null);
    return;
  }
  if (file) {
    previewUrl.value = URL.createObjectURL(file);
  }
  emit('update:modelValue', file);
}

watch(() => props.modelValue, (value) => {
  if (!value) revoke();
});

onBeforeUnmount(revoke);
</script>

<template>
  <div>
    <v-label class="text-subtitle-1 pb-2 text-lightText">{{ label }}</v-label>
    <v-file-input :model-value="modelValue" accept="image/*" show-size clearable hide-details prepend-icon="mdi-camera"
      variant="outlined" :error="!!fileError" :error-messages="fileError" @update:model-value="onChange"></v-file-input>
    <div class="bannerImg rounded-lg d-flex flex-column align-center justify-center bg-grey50 mt-2">
      <div v-if="!shownImage" class="d-flex align-center justify-center flex-column">
        <span class="h6">Supported file: JPG, PNG, SVG</span>
        <span class="h6">Size file: max. 5 MB</span>
      </div>
      <v-img v-else :src="shownImage" contain max-height="170" class="w-100" alt="Preview"></v-img>
    </div>
  </div>
</template>

<style scoped>
.bannerImg {
  height: 180px;
  overflow: hidden;
}
</style>
