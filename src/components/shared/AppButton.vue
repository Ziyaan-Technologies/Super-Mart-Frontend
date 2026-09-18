<script setup lang="ts">
withDefaults(
    defineProps<{
        label?: string;
        variant?: 'filled' | 'outlined' | 'tonal';
        color?: string;
        size?: string;
        prependIcon?: string;
        appendIcon?: string;
        block?: boolean;
        disabled?: boolean;
        loading?: boolean;
    }>(),
    {
        label: '',
        variant: 'filled',
        size: 'default',
        block: false,
        disabled: false,
        loading: false,
    },
);
</script>

<template>
    <v-btn :color="variant === 'outlined' ? color : color || 'primary'"
        :variant="variant === 'outlined' ? 'outlined' : variant === 'tonal' ? 'tonal' : 'flat'" :size="size"
        :block="block" :disabled="disabled" :loading="loading" class="text-none font-weight-semibold rounded-md px-5"
        :class="[variant === 'outlined' ? 'border' : '', variant === 'outlined' && !color ? 'text-black' : '']">
        <v-icon v-if="prependIcon" start size="18">{{ prependIcon }}</v-icon>
        <slot>{{ label }}</slot>
        <v-icon v-if="appendIcon" end size="18">{{ appendIcon }}</v-icon>
    </v-btn>
</template>
