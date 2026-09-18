<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import errorImage from '@/assets/images/backgrounds/errorimg.svg';

const route = useRoute();
const unauthorized = computed(() => route.name === 'Unauthorized');
</script>

<template>
    <div class="d-flex justify-center align-center text-center h-100 py-10">
        <div>
            <img :src="errorImage" width="420" alt="Error" style="max-width: 100%" />
            <h1 class="text-h1 pt-3">{{ unauthorized ? 'No Access' : 'Oops!' }}</h1>
            <h4 class="text-h4 my-8">
                {{ unauthorized ? 'You have no permission to access it. Ask your manager to update your role.' : 'The page you are looking for could not be found.' }}
            </h4>
            <v-btn flat color="primary" class="mb-4" to="/">Go Back to Home</v-btn>
        </div>
    </div>
</template>
