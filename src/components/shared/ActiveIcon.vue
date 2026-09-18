<script setup lang="ts">
import { CheckIcon, XIcon } from 'vue-tabler-icons';

defineProps<{ active: boolean }>();
</script>

<template>
  <div class="d-flex align-center">
    <CheckIcon v-if="active" stroke-width="1.5" size="20" class="text-primary" />
    <XIcon v-else stroke-width="1.5" size="20" class="text-error" />
  </div>
</template>
