<script setup lang="ts">
import type { DashboardStatCardProps } from '@/types/DashboardStatCardType';

withDefaults(defineProps<DashboardStatCardProps>(), {
    currency: '',
    comparisonLabel: '',
    showInfoIcon: false,
});
</script>

<template>
    <v-card elevation="0" class="kpi-info-card" rounded="0">
        <v-card-text class="pa-4">
            <div class="d-flex align-center mb-3">
                <div class="kpi-icon-box d-flex align-center justify-center flex-shrink-0 me-3"
                    :style="{ backgroundColor: showInfoIcon ? 'rgba(var(--v-theme-error), 0.12)' : 'rgba(var(--v-theme-primary), 0.12)' }">
                    <v-icon :icon="icon" :color="showInfoIcon ? 'error' : 'primary'" size="24"></v-icon>
                </div>
                <div class="d-flex flex-column overflow-hidden">
                    <p class="text-caption text-grey-darken-1 mb-1 kpi-card-title">{{ title }}</p>
                    <h3 class="text-h5 font-weight-bold mb-0 kpi-card-value text-truncate">
                        <span v-if="currency">{{ currency }}</span>{{ value }}
                    </h3>
                </div>
            </div>
            <v-progress-linear v-if="progress !== undefined" :model-value="progress" color="primary" height="5" rounded class="mb-1" />
            <div v-if="progressLabel || comparisonLabel || change" class="d-flex align-center">
                <span class="text-caption text-grey-darken-1">{{ progressLabel || comparisonLabel }}</span>
                <span v-if="change" class="text-caption font-weight-medium text-success ms-1">{{ change }}</span>
            </div>
        </v-card-text>
    </v-card>
</template>
