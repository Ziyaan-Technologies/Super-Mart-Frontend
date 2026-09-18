<template>
    <v-row class="bg-secondary" style="box-shadow: 1px 1px 4px 2px rgba(16, 24, 40, 0.05);">
        <div class="form-heading-header">
            <slot />
        </div>
        <v-card elevation="0" class="w-100">
            <v-card-text>
                <v-row class="d-flex align-center">
                    <!-- Search Bar -->
                    <v-col :cols="serviceTypes?.length ? 12 : 12">
                        <div>
                            <v-text-field prepend-inner-icon="mdi-magnify" v-model="search_key" @keyup.enter="search"
                                hide-details single-line :placeholder="searchText"></v-text-field>
                        </div>
                    </v-col>
                    <v-col v-if="serviceTypes?.length" cols="1">
                        <v-card-title class="text-h5 text-center">OR</v-card-title>
                    </v-col>

                    <!-- Dropdown -->
                    <v-col v-if="serviceTypes?.length" cols="3">
                        <v-autocomplete v-if="serviceTypes.length" v-model="search_by_service" label="Service Type"
                            :items="serviceTypes" density="comfortable" hide-details single-line
                            @keyup.enter="search"></v-autocomplete>
                    </v-col>
                </v-row>
                <v-divider class="mt-4 border"></v-divider>
                <div class="d-flex justify-end mt-4">
                    <v-btn flat @click="clear" color="error" variant="outlined">Clear</v-btn>
                    <v-btn flat @click="search" color="primary" class="ml-4">Search</v-btn>
                </div>
            </v-card-text>
        </v-card>
    </v-row>
</template>

<script>
export default {
    name: 'SearchHeaderForm',
    props:{
        searchText: String,
        serviceTypes: {
            type: Array,
            default: () => []
        }
    },
    data(){
        return {
            search_key: "",
            search_by_service: "",
        }
    },
    methods: {
        search() {
            this.$emit('onSearch', this.search_key.trim() ? this.search_key.trim() : this.search_by_service.trim());
        },
        clear() {
            this.search_key = "";
            this.search_by_service = "";
            this.$emit('onSearch', "");
        }
    }
}
</script>
