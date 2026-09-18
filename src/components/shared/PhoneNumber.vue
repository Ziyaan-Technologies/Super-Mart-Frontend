<script setup lang="ts">
import { ref } from 'vue';

interface Country {
  code: string;
  label: string;
  flag: string;
}
const phoneNumber = ref<string>('');
const selectedCountry = ref<string>('UK');

const countries: Country[] = [
  { code: 'UK', label: 'United Kingdom (+44)', flag: '🇬🇧' },
  { code: 'US', label: 'United States (+1)', flag: '🇺🇸' },
  { code: 'PK', label: 'Pakistan (+92)', flag: '🇵🇰' },
  { code: 'IN', label: 'India (+91)', flag: '🇮🇳' },
];
</script>
<template>
  <v-col cols="12" class="mb-0">
    <p class="text-subtitle-1 mb-2">Restaurant Phone Number</p>
    <v-text-field
      v-model="phoneNumber"
      placeholder="+44 - XXXX - XXXXXX"
      bg-color="gray"
      rounded
      class="phone-input"
    >
      <!-- Country Flag Dropdown -->
      <template #prepend-inner>
        <div class="d-flex align-center pr-1 country-wrapper">
          <v-select
            v-model="selectedCountry"
            :items="countries"
            item-title="label"
            item-value="code"
            variant="plain"
            hide-details
            density="compact"
            menu-icon="mdi-chevron-down"
            style="width: 100px"
            class="country-dropdown"
          >
            <!-- Selected item rendering -->
            <template #selection="{ item }">
              <span class="d-flex align-center text-body-2">
                <span class="mr-1">{{ item.raw.flag }}</span>
                {{ item.raw.code }}
              </span>
            </template>

            <!-- Dropdown list items -->
            <template #item="{ item }">
              <span class="d-flex align-center text-body-2">
                <span class="mr-2">{{ item.raw.flag }}</span>
                {{ item.raw.label }}
              </span>
            </template>
          </v-select>
          <div class="divider"></div>
        </div>
      </template>
    </v-text-field>
  </v-col>
</template>

<style scoped>
.phone-input .v-field__prepend-inner {
  padding-left: 0;
}

.country-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.divider {
  width: 1px;
  height: 28px;
  background-color: #ccc;
  margin-left: 8px;
}

.country-dropdown .v-field__outline,
.country-dropdown .v-field__control {
  border: none !important;
  box-shadow: none !important;
}
</style>
