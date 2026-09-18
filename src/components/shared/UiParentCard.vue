<script setup lang="ts">
defineProps({
    title: String,
    icon: {
        type: String,
        default: ''
    }
});
</script>

<template>
    <v-card class="content-card" elevation="0" rounded="lg">
        <div class="content-card__header">
            <h4 class="content-card__title">
                <v-icon v-if="icon" size="20" color="primary" class="me-2">{{ icon }}</v-icon>{{ title }}
            </h4>
            <div class="content-card__actions">
                <slot name="action"></slot>
            </div>
        </div>
        <div class="content-card__body">
            <slot />
        </div>
    </v-card>
</template>

<style scoped>
.content-card {
    border: 1px solid rgb(var(--v-theme-borderColor));
    background: #fff;
}

.content-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    padding: 16px 20px;
    border-bottom: 1px solid rgb(var(--v-theme-borderColor));
}

.content-card__title {
    display: flex;
    align-items: center;
    font-size: 17px;
    font-weight: 600;
    color: rgb(var(--v-theme-textPrimary));
    margin: 0;
}

.content-card__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.content-card__body {
    padding: 16px 20px 20px;
}
</style>
