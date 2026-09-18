<script setup lang="ts">
import { ref, watch, defineEmits, defineProps, computed } from 'vue';
import moment from 'moment-timezone';

const emit = defineEmits(['update:selectedDate']);

const menu = ref(false);
const selectedDate = ref<string | null>(null);
const today = moment().tz('Asia/Karachi').format('YYYY-MM-DD');

const props = defineProps({
  minDate: {
    type: [String, Date],
    default: null,
  },
  modelValue: {
    type: String,
    default: '',
  },
  isPlaceholderMode: {
    type: Boolean,
    default: false,
  },
});

const formattedDate = ref<string>(props.modelValue || '');

// Watch prop change
watch(() => props.modelValue, (val) => {
  formattedDate.value = val;
  selectedDate.value = val;
});

// Display text for input
const displayDate = computed(() => {
  return formattedDate.value || today;
});

// Styling logic
const inputClass = computed(() => {
  return props.isPlaceholderMode && !formattedDate.value ? 'placeholder-text' : '';
});


const updateDate = (value: string | null) => {
  if (!value) return; 

  const formatted = moment(value).tz('Asia/Karachi').format('YYYY-MM-DD');
  formattedDate.value = formatted;
  selectedDate.value = formatted;
  menu.value = false;
  emit('update:selectedDate', formatted);
};
</script>

<template>
  <v-container class="pa-0">
    <v-menu
      v-model="menu"
      :close-on-content-click="false"
      transition="scale-transition"
      offset-y
      max-width="290px"
      min-width="290px"
    >
      <template #activator="{ props: activatorProps }">
        <v-text-field
          v-bind="activatorProps"
          :value="displayDate"
          readonly
          prepend-inner-icon="mdi-calendar"
          append-inner-icon="mdi-chevron-down"
          :class="inputClass"
        />
      </template>

      <v-date-picker
        v-model="selectedDate"
        @update:model-value="updateDate"
        color="primary"
        :min="props.minDate"
        :first-day-of-week="1"
      />
    </v-menu>
  </v-container>
</template>

<style scoped>
:deep(.placeholder-text input) {
  color: #9e9e9e !important;
  font-style: italic;
}
</style>
