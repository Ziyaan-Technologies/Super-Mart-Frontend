<script setup lang="ts">
const props = defineProps({
    heading: String,
});
</script>
<template>
    <div class="d-flex align-center gap-2">
        <span class="border px-2 py-2 rounded-circle d-flex">
            <img src='icon' alt="">
        </span>
        <span>
            <strong>{{ heading }}</strong>
        </span>
    </div>
</template>
<style scoped>
.v-col__4 {
    padding: 0 !important;
    width: 100%;
    display: flex;
    justify-content: space-between;
}
</style>