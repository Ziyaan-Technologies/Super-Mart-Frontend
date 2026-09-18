<script setup lang="ts">
import { ref, watch, defineProps, defineEmits } from 'vue';
import moment from 'moment-timezone';

const menu = ref(false);
const today = moment().tz('Asia/Karachi').format('YYYY-MM-DD');

const minDate = ref(today);

const props = defineProps<{
  minDate?: String | Date | null;
  modelValue: string;
}>(); // ISO string like "2025-05-02T19:00:00.000Z"

const emit = defineEmits(['update:selectedDate', 'update:modelValue']);

// Extract date-only string from ISO (handle timezone issue)
const extractDate = (isoString: string): string => {
  return isoString?.split('T')[0] || '';
};

const selectedDate = ref(extractDate(props.modelValue));
const formattedDate = ref(extractDate(props.modelValue));

// Watch for updates from parent and update internal values
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    const dateOnly = extractDate(newVal);
    selectedDate.value = dateOnly;
    formattedDate.value = dateOnly;
  }
});

// Handle date selection
const updateDate = (value: string | Date) => {
  let formatted = '';
  if (value instanceof Date) {
    const yyyy = value.getFullYear();
    const mm = String(value.getMonth() + 1).padStart(2, '0');
    const dd = String(value.getDate()).padStart(2, '0');
    formatted = `${yyyy}-${mm}-${dd}`;
  } else {
    formatted = value;
  }

  selectedDate.value = formatted;
  formattedDate.value = formatted;
  emit('update:modelValue', formatted); // Emits to v-model
  emit('update:selectedDate', formatted); // Emits to custom listener
  menu.value = false;
};

// Keep formattedDate in sync with selectedDate
watch(selectedDate, (val) => {
  formattedDate.value = val;
});
</script>

<template>
  <v-container class="pa-0">
    <v-menu v-model="menu" :close-on-content-click="false" transition="scale-transition" offset-y max-width="290px"
      min-width="290px">
      <template #activator="{ props }">
        <v-text-field v-bind="props" v-model="formattedDate" readonly prepend-inner-icon="mdi-calendar"
          append-inner-icon="mdi-chevron-down" bg-color="gray" />
      </template>

      <v-date-picker v-model="selectedDate" @update:model-value="updateDate" color="primary" :min="props.minDate" />
    </v-menu>
  </v-container>
</template>
