<script setup lang="ts">
import { ref, defineEmits, watch, nextTick, computed } from "vue";
import moment from 'moment-timezone';

const emit = defineEmits(["update:selectedDates", "clear:dates"]);
const menu = ref<boolean>(false);

const today = moment().tz('Asia/Karachi').format('YYYY-MM-DD');

const selectedRange = ref<[string] | [string, string] | []>([]);
const now = new Date();

// const pickerKey = ref(Date.now());
const pickerKey = ref(today);

const formatDate = (value: string | Date) => {
  if (value instanceof Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, "0");
    const dd = String(value.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return value;
};

const formattedRange = computed(() => {
  if (selectedRange.value.length === 1) {
    return `${formatDate(selectedRange.value[0])} -`;
  } else if (selectedRange.value.length === 2) {
    return `${formatDate(selectedRange.value[0])} - ${formatDate(selectedRange.value[1])}`;
  }
  return '';
});


watch(selectedRange, (range) => {
  if (!Array.isArray(range)) return;

  if (range.length > 2) {
    const newStart = range[range.length - 1];
    selectedRange.value = [newStart]; // This is okay
    return;
  }

  if (range.length === 2) {
    const [d1, d2] = range.map((r) => new Date(r));
    const sorted = d1 < d2 ? [range[0], range[1]] : [range[1], range[0]];

    // ✅ DO NOT reassign selectedRange.value here

    emit("update:selectedDates", {
      startDate: formatDate(sorted[0]),
      endDate: formatDate(sorted[1]),
    });
  } else if (range.length === 1) {
    emit("update:selectedDates", {
      startDate: formatDate(range[0]),
      endDate: "",
    });
  } else {
    emit("update:selectedDates", { startDate: "", endDate: "" });
  }
});

const clearDates = () => {
  selectedRange.value = [];
  emit("update:selectedDates", { startDate: "", endDate: "" });
  emit("clear:dates");
};
</script>

<template>
  <v-menu v-model="menu" :close-on-content-click="false" transition="scale-transition" offset-y>
    <template v-slot:activator="{ props }">
      <v-text-field v-bind="props" prepend-inner-icon="mdi-calendar" append-inner-icon="mdi-chevron-down" readonly
        :model-value="formattedRange" placeholder="Select date range" variant="outlined" @click:clear="clearDates"
        class="custom-text-field" hide-details clearable />
    </template>

    <v-card>
      <v-date-picker v-model="selectedRange" :key="pickerKey" color="primary" :max="today" multiple range
        title="Select Date Range" />
    </v-card>
  </v-menu>
</template>

<style scoped>
.custom-text-field {
  min-width: 250px;
  width: 100%;
}
</style>
