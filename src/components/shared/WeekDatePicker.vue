<script setup lang="ts">
import { ref, defineEmits } from 'vue';
import moment from 'moment';

const emit = defineEmits(['update:selectedDates']);
const selectedMonday = ref<string>('');
const menu = ref(false);

const isMonday = (date: unknown): boolean => {
  if (typeof date === 'string' || date instanceof Date) {
    return moment(date).isoWeekday() === 1;
  }
  return false;
};

const formatDate = (date: Date) => moment(date).format('YYYY-MM-DD');

const formatDisplayRange = (start: string) => {
  const startDate = moment(start);
  const endDate = moment(start).add(6, 'days');
  return `${startDate.format('MMM D')} - ${endDate.format('MMM D, YYYY')}`;
};

const handleDateSelect = (date: unknown) => {
  if (!date || !(typeof date === 'string' || date instanceof Date)) return;
  
  const monday = moment(date).startOf('day');
  const sunday = moment(date).add(6, 'days').endOf('day');

  selectedMonday.value = formatDate(monday.toDate());

  emit('update:selectedDates', {
    startDate: formatDate(monday.toDate()),
    endDate: formatDate(sunday.toDate()),
  });

  menu.value = false;
};
</script>

<template>
  <v-menu v-model="menu" :close-on-content-click="false" transition="scale-transition" offset-y>
    <template #activator="{ props }">
      <v-text-field
        v-bind="props"
        readonly
        variant="outlined"
        prepend-inner-icon="mdi-calendar"
        placeholder="Select weekly date range"
        :model-value="selectedMonday ? formatDisplayRange(selectedMonday) : ''"
        class="custom-text-field"
        clearable
        @click:clear="() => { selectedMonday = ''; emit('update:selectedDates', { startDate: '', endDate: '' }) }"
      />
    </template>

    <v-date-picker
      color="primary"
      @update:modelValue="handleDateSelect"
      :allowed-dates="isMonday"
      :first-day-of-week="1" 
    />
  </v-menu>
</template>

<style scoped>
/*  */
</style>
