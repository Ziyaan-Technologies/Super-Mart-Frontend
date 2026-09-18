<script setup lang="ts">
interface Props {
  filled?: string;
  disabled?: boolean;
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  filled: '',
  disabled: false,
  loading: false,
});
</script>
<template>
  <button :disabled="disabled || loading" class="app-btn app-btn--primary">
    <v-progress-circular v-if="loading" indeterminate color="white" size="14" width="2" />
    <span v-if="filled">{{ filled }}</span>
    <slot />
  </button>
</template>
