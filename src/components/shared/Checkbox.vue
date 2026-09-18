<script setup lang="ts">
import { ref } from 'vue';

const selectedOption = ref('yes')
const options = [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
]
</script>
<template>
    <div>
        <label class="con1" v-for="option in options" :key="option.value">
            <span>{{ option.label }}</span>
            <input type="radio" :value="option.value" v-model="selectedOption" name="radio1" />
            <span class="checkmark"></span>
        </label>
    </div>
</template>
<style>
.con1 {
    display: inline-block;
    position: relative;
    padding-top: 5px;
    padding-left: 35px;
    margin-bottom: 12px;
    margin-right: 20px;
    cursor: pointer;
    font-size: 15px;
    user-select: none;

    input {
        position: absolute;
        opacity: 0;
        cursor: pointer;
    }

    .checkmark {
        position: absolute;
        top: 0;
        left: 0;
        height: 30px;
        width: 30px;
        background-color: #f6f3ff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        color: transparent;
        transition: background-color 0.3s ease, color 0.3s ease;
    }

    input:checked~.checkmark {
        background-color: #f6f3ff;
        color: #4f30a9;

        &::before {
            content: "✓";
        }
    }
}
</style>