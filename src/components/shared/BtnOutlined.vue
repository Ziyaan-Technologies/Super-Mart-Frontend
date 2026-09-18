<script setup lang="ts">
interface Props {
  outline?: string;
  disabled?: boolean;
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  outline: '',
  disabled: false,
  loading: false,
});
</script>
<template>
  <button :disabled="disabled || loading" class="app-btn">
    <v-progress-circular v-if="loading" indeterminate color="primary" size="14" width="2" />
    <span v-if="outline">{{ outline }}</span>
    <slot />
  </button>
</template>
