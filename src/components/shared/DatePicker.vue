<script setup>
import { ref, computed } from 'vue';

const menu = ref(false);
const dates = ref([]);
const formattedDateRange = computed(() => {
    if (!dates.value || dates.value.length < 2) return '';
    return `${formatDate(dates.value[0])} - ${formatDate(dates.value[1])}`;
});

const updateDateRange = () => {
    if (dates.value.length === 2) {
        menu.value = false;
    }
};

const clearDates = () => {
    dates.value = [];
};

const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};
</script>
<template>
    <v-col cols="6">
        <v-text-field v-model="formattedDateRange" label="Select Date Range" prepend-inner-icon="mdi-calendar" readonly
            @click="menu = true"></v-text-field>

        <v-menu v-model="menu" transition="scale-transition" min-width="auto" offset-y>
            <v-card>
                <v-date-picker v-model="dates" range show-adjacent-months @update:model-value="updateDateRange" />
                <v-card-actions class="d-flex justify-end">
                    <v-btn text @click="clearDates">Clear</v-btn>
                    <v-btn color="primary" text @click="menu = false">OK</v-btn>
                </v-card-actions>
            </v-card>
        </v-menu>
    </v-col>
</template>