<script setup lang="ts">
import { ref, defineEmits } from 'vue';

// Define the available service types
const serviceTypes = ['Delivery', 'Collection', 'Dine-in'];

// Define the emit function to send selected value to the parent component
const emit = defineEmits();

// Create a ref for the selected service type
const selectedServiceType = ref('');

// Emit the selected service type when changed
const onServiceTypeChange = () => {
  if (selectedServiceType.value) {
    emit('onServiceTypeSelected', selectedServiceType.value);
  }
};
</script>

<template>
  <v-col cols="12" sm="6">
    <v-select
      v-model="selectedServiceType"
      :items="serviceTypes"
      label="Order Fulfilment"
      single-line
      hide-details
      @input="onServiceTypeChange"
    />
  </v-col>
</template>

