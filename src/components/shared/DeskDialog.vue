<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean;
  title: string;
  subtitle?: string;
  icon?: string;
  maxWidth?: number | string;
  persistent?: boolean;
}>(), {
  subtitle: '',
  icon: 'mdi-application-outline',
  maxWidth: 500,
  persistent: true,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();
</script>

<template>
  <v-dialog :model-value="modelValue" :max-width="maxWidth" :persistent="persistent" scrollable
    @update:model-value="emit('update:modelValue', $event)">
    <v-card class="desk-window desk-dialog w-100">
      <div class="desk-window__caption">
        <span class="desk-window__title"><v-icon size="16">{{ icon }}</v-icon>{{ title }}</span>
        <span v-if="subtitle" class="desk-window__subtitle">{{ subtitle }}</span>
        <button type="button" class="desk-dialog__close" title="Close (Esc)" @click="emit('update:modelValue', false)">
          <v-icon size="16">mdi-close</v-icon>
        </button>
      </div>
      <v-card-text class="desk-dialog__body">
        <slot />
      </v-card-text>
      <div v-if="$slots.footer" class="desk-dialog__footer">
        <slot name="footer" />
      </div>
    </v-card>
  </v-dialog>
</template>
