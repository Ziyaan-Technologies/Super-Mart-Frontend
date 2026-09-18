<script setup lang="ts">
import { formatMoney } from '@/utils/api';

defineProps<{
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}>();
</script>

<template>
  <div class="line-totals">
    <div><span>Subtotal</span><strong>{{ formatMoney(subtotal) }}</strong></div>
    <div><span>Discount</span><strong>− {{ formatMoney(discount) }}</strong></div>
    <div><span>Tax</span><strong>{{ formatMoney(tax) }}</strong></div>
    <div class="line-totals__grand"><span>Total</span><strong>{{ formatMoney(total) }}</strong></div>
  </div>
</template>

<style scoped>
.line-totals {
  margin-left: auto;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
}
.line-totals div {
  display: flex;
  justify-content: space-between;
}
.line-totals span {
  color: #6b7280;
}
.line-totals__grand {
  border-top: 1px solid #e5e7eb;
  padding-top: 8px;
  font-size: 16px;
}
.line-totals__grand span {
  color: #09090b;
  font-weight: 600;
}
</style>
