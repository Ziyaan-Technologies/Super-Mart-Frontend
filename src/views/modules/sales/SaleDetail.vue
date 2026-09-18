<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import ReceiptButtons from '@/components/shared/ReceiptButtons.vue';
import ReturnDialog from '@/views/modules/pos/ReturnDialog.vue';
import { useAlerts } from '@/composables/useAlerts';
import { can } from '@/utils/permissions';
import { formatDateTime, formatMoney, formatNumber } from '@/utils/api';

const route = useRoute();
const router = useRouter();
const alerts = useAlerts();
const sale = ref<any>(null);
const loading = ref(true);
const returnDialog = ref(false);

const profit = computed(() => {
  if (!sale.value) return 0;
  return sale.value.items.reduce((sum: number, item: any) => {
    const kept = item.quantity - item.returned_quantity;
    return sum + (item.line_total - item.tax_amount) * kept / item.quantity - item.unit_cost * kept;
  }, 0);
});

async function load() {
  loading.value = true;
  try {
    sale.value = (await axios.get(`pos/sales/${route.params.id}`)).data;
  } catch (error) {
    alerts.fail(error);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard :title="sale ? `Bill ${sale.bill_number}` : 'Bill'" icon="mdi-receipt-text-outline">
        <template #action>
          <div v-if="sale" class="d-flex align-center ga-2 flex-wrap">
            <StatusChip :status="sale.status" />
            <ReceiptButtons :sale-id="sale.id" :bill-number="sale.bill_number" variant="button" @printed="sale.print_count++" @error="(error: any) => alerts.fail(error)" />
            <v-btn v-if="can('pos_return', 'POS') && sale.status !== 'Returned'" color="error" variant="tonal" prepend-icon="mdi-keyboard-return" class="text-capitalize" @click="returnDialog = true">Return Items</v-btn>
            <v-btn variant="text" color="primary" prepend-icon="mdi-arrow-left" class="text-capitalize" @click="router.back()">Back</v-btn>
          </div>
        </template>

        <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-4 single-line-alert" closable />
        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />

        <v-skeleton-loader v-if="loading" type="article, table" />
        <template v-else-if="sale">
          <v-card elevation="0" class="border rounded-md mb-4">
            <v-card-text>
              <v-row>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Date</div><div class="font-weight-semibold">{{ formatDateTime(sale.created_at) }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Store</div><div class="font-weight-semibold">{{ sale.clientstore?.store_name }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Cashier</div><div class="font-weight-semibold">{{ sale.cashier?.full_name }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Register</div><div class="font-weight-semibold">{{ sale.register_session?.session_number || '-' }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Customer</div><div class="font-weight-semibold">{{ sale.customer_name || 'Walk-in' }}</div><div class="text-caption">{{ sale.customer_phone }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Printed</div><div class="font-weight-semibold">{{ sale.print_count }} time(s)</div></v-col>
                <v-col v-if="can('sales_view', 'Sales')" cols="6" md="3"><div class="text-caption text-lightText">Gross Profit</div><div class="font-weight-semibold" :class="profit < 0 ? 'text-error' : 'text-successdark'">{{ formatMoney(profit) }}</div></v-col>
                <v-col v-if="sale.note" cols="12" md="3"><div class="text-caption text-lightText">Note</div><div class="font-weight-semibold">{{ sale.note }}</div></v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-row>
            <v-col cols="12" lg="8">
              <v-card elevation="0" class="border rounded-md">
                <v-table>
                  <thead class="bg-grey-lighten-4 text-primary">
                    <tr>
                      <th>Item</th>
                      <th class="text-center">Qty</th>
                      <th class="text-right">Price</th>
                      <th class="text-right">Discount</th>
                      <th class="text-right">Tax</th>
                      <th class="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="item in sale.items" :key="item.id">
                      <td>
                        <div class="font-weight-semibold">{{ item.product_name }}</div>
                        <div class="text-caption text-lightText">{{ item.variant_name }} · {{ item.sku }}</div>
                        <div v-if="item.returned_quantity > 0" class="text-caption text-error">Returned {{ formatNumber(item.returned_quantity, 3) }}</div>
                      </td>
                      <td class="text-center">{{ formatNumber(item.quantity, 3) }} {{ item.unit_label || '' }}</td>
                      <td class="text-right">{{ formatMoney(item.unit_price) }}</td>
                      <td class="text-right">{{ item.discount_amount + item.bill_discount_share > 0 ? `−${formatMoney(item.discount_amount + item.bill_discount_share)}` : '-' }}</td>
                      <td class="text-right">{{ formatMoney(item.tax_amount) }} <span class="text-caption">({{ item.tax_rate }}%)</span></td>
                      <td class="text-right font-weight-semibold">{{ formatMoney(item.line_total) }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>

              <v-card v-if="sale.returns?.length" elevation="0" class="border rounded-md mt-4">
                <v-card-title class="text-h6">Returns</v-card-title>
                <v-table density="compact">
                  <thead>
                    <tr><th>Return No</th><th>Date</th><th>By</th><th>Reason</th><th>Method</th><th class="text-right">Refund</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in sale.returns" :key="row.id">
                      <td class="font-weight-semibold">{{ row.return_number }}</td>
                      <td>{{ formatDateTime(row.created_at) }}</td>
                      <td>{{ row.processed_by?.full_name }}</td>
                      <td>{{ row.reason }}</td>
                      <td>{{ row.refund_method }}</td>
                      <td class="text-right text-error">{{ formatMoney(row.refund_amount) }}</td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>
            </v-col>
            <v-col cols="12" lg="4">
              <v-card elevation="0" class="border rounded-md">
                <v-card-text class="d-flex flex-column ga-2 text-subtitle-1">
                  <div class="d-flex justify-space-between"><span>Subtotal</span><span>{{ formatMoney(sale.subtotal) }}</span></div>
                  <div v-if="sale.item_discount > 0" class="d-flex justify-space-between text-successdark"><span>Item discounts</span><span>−{{ formatMoney(sale.item_discount) }}</span></div>
                  <div v-if="sale.bill_discount > 0" class="d-flex justify-space-between text-successdark"><span>Bill discount</span><span>−{{ formatMoney(sale.bill_discount) }}</span></div>
                  <div class="d-flex justify-space-between"><span>Tax</span><span>{{ formatMoney(sale.tax_amount) }}</span></div>
                  <v-divider />
                  <div class="d-flex justify-space-between text-h5 font-weight-bold"><span>Total</span><span class="text-primary">{{ formatMoney(sale.total_amount) }}</span></div>
                  <v-divider />
                  <div v-for="payment in sale.payments" :key="payment.id" class="d-flex justify-space-between">
                    <span>{{ payment.method }}<span v-if="payment.reference" class="text-caption text-lightText"> · {{ payment.reference }}</span></span>
                    <span>{{ formatMoney(payment.amount) }}</span>
                  </div>
                  <div v-if="sale.change_amount > 0" class="d-flex justify-space-between font-weight-semibold"><span>Change</span><span>{{ formatMoney(sale.change_amount) }}</span></div>
                  <div v-if="sale.refunded_amount > 0" class="d-flex justify-space-between font-weight-semibold text-error"><span>Refunded</span><span>−{{ formatMoney(sale.refunded_amount) }}</span></div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </template>
      </UiParentCard>
    </v-col>
  </v-row>

  <ReturnDialog v-if="sale" v-model="returnDialog" :sale-id="sale.id" @returned="alerts.success('Return processed'); load()" />
</template>
