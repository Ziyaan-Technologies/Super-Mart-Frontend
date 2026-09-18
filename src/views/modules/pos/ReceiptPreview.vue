<script setup lang="ts">
import { computed } from 'vue';
import { formatDateTime, formatNumber } from '@/utils/api';

const props = defineProps<{
  sale: any;
}>();

const currency = computed(() => props.sale?.vendor?.country?.currency_symbol || props.sale?.vendor?.country?.currency_short_name || '');
const inclusive = computed(() => (props.sale?.items || []).every((item: any) => item.price_includes_tax));

function amount(value?: number | string | null) {
  return Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
</script>

<template>
  <div class="receipt-paper">
    <div class="text-center">
      <div class="receipt-title">{{ sale.vendor?.business_name }}</div>
      <div>{{ sale.clientstore?.store_name }}</div>
      <div v-if="sale.clientstore?.address">{{ sale.clientstore.address }}</div>
      <div v-if="sale.clientstore?.store_phone">Tel: {{ sale.clientstore.store_phone }}</div>
      <div v-if="sale.vendor?.tax_number">Tax No: {{ sale.vendor.tax_number }}</div>
    </div>
    <div class="receipt-line" />
    <div class="receipt-heading">SALES RECEIPT</div>
    <div v-if="sale.status !== 'Completed'" class="text-center font-weight-bold">{{ String(sale.status).toUpperCase() }}</div>
    <div class="receipt-row"><span>Bill No</span><span>{{ sale.bill_number }}</span></div>
    <div class="receipt-row"><span>Date</span><span>{{ formatDateTime(sale.created_at) }}</span></div>
    <div class="receipt-row"><span>Cashier</span><span>{{ sale.cashier?.full_name }}</span></div>
    <div v-if="sale.register_session?.session_number" class="receipt-row"><span>Counter</span><span>{{ sale.register_session.session_number }}</span></div>
    <div class="receipt-row"><span>Party</span><span>{{ [sale.customer_name, sale.customer_phone].filter(Boolean).join(' · ') || 'Cash Sale - Walk-in' }}</span></div>
    <div class="receipt-line" />
    <table class="receipt-items">
      <thead>
        <tr><th class="text-left">Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
      </thead>
      <tbody>
        <template v-for="item in sale.items" :key="item.id">
          <tr><td colspan="4" class="font-weight-bold text-left">{{ item.product_name }} {{ item.variant_name }}</td></tr>
          <tr>
            <td></td>
            <td>{{ formatNumber(item.quantity, 3) }}{{ item.unit_label ? ` ${item.unit_label}` : '' }}</td>
            <td>{{ amount(item.unit_price) }}</td>
            <td>{{ amount(item.quantity * item.unit_price) }}</td>
          </tr>
          <tr v-if="item.discount_amount > 0"><td colspan="3" class="text-left">&nbsp;&nbsp;Discount</td><td>-{{ amount(item.discount_amount) }}</td></tr>
          <tr v-if="item.returned_quantity > 0"><td colspan="3" class="text-left">&nbsp;&nbsp;Returned</td><td>{{ formatNumber(item.returned_quantity, 3) }}</td></tr>
        </template>
      </tbody>
    </table>
    <div class="receipt-line" />
    <div class="receipt-row"><span>Lines</span><span>{{ sale.items?.length || 0 }}</span></div>
    <div class="receipt-row"><span>Subtotal</span><span>{{ amount(sale.subtotal) }}</span></div>
    <div v-if="sale.item_discount > 0" class="receipt-row"><span>Item discounts</span><span>-{{ amount(sale.item_discount) }}</span></div>
    <div v-if="sale.bill_discount > 0" class="receipt-row"><span>Bill discount</span><span>-{{ amount(sale.bill_discount) }}</span></div>
    <div class="receipt-row"><span>{{ inclusive ? 'G.S.T (included)' : 'G.S.T' }}</span><span>{{ amount(sale.tax_amount) }}</span></div>
    <div class="receipt-row receipt-total"><span>NET TOTAL</span><span>{{ currency }} {{ amount(sale.total_amount) }}</span></div>
    <div class="receipt-line" />
    <div v-for="payment in sale.payments" :key="payment.id" class="receipt-row">
      <span>{{ payment.method === 'Cash' ? 'Cash Received' : `Paid by ${payment.method}` }}<template v-if="payment.reference"> ({{ payment.reference }})</template></span>
      <span>{{ amount(payment.amount) }}</span>
    </div>
    <div class="receipt-row font-weight-bold"><span>Cash Back</span><span>{{ amount(sale.change_amount) }}</span></div>
    <div v-if="sale.refunded_amount > 0" class="receipt-row font-weight-bold"><span>Refunded</span><span>-{{ amount(sale.refunded_amount) }}</span></div>
    <div class="receipt-line" />
    <div v-if="sale.note" class="text-center">{{ sale.note }}</div>
    <div class="text-center">Thank you for shopping with us!</div>
    <div class="text-center">Keep this receipt for returns.</div>
  </div>
</template>

<style scoped>
.receipt-paper {
  width: 320px;
  max-width: 100%;
  margin: 0 auto;
  padding: 16px 14px 20px;
  background: #fff;
  border: 1px solid #c3ccd8;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
  font-family: "Consolas", "Courier New", monospace;
  font-size: 12px;
  line-height: 1.45;
  color: #111;
}

.receipt-title {
  font-size: 16px;
  font-weight: 700;
}

.receipt-heading {
  text-align: center;
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 4px;
}

.receipt-line {
  border-top: 1px dashed #555;
  margin: 6px 0;
}

.receipt-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.receipt-row > span:last-child {
  text-align: right;
}

.receipt-total {
  font-size: 15px;
  font-weight: 700;
  margin-top: 4px;
}

.receipt-items {
  width: 100%;
  border-collapse: collapse;
}

.receipt-items th,
.receipt-items td {
  padding: 0;
  text-align: right;
  font-weight: 400;
}

.receipt-items th {
  font-weight: 700;
  border-bottom: 1px solid #555;
}
</style>
