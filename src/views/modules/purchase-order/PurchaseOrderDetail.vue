<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import DeleteDialog from '@/components/shared/DeleteDialog.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import LineTotals from '@/components/inventory/LineTotals.vue';
import { useAlerts } from '@/composables/useAlerts';
import { can } from '@/utils/permissions';
import { formatDate, formatMoney, formatNumber } from '@/utils/api';

const route = useRoute();
const router = useRouter();
const alerts = useAlerts();
const order = ref<any>(null);
const loading = ref(true);
const working = ref(false);
const confirmOpen = ref(false);
const confirmAction = ref<'approve' | 'cancel'>('approve');

const receivable = computed(() => ['Approved', 'Partially Received'].includes(order.value?.status));
const canCancel = computed(() => ['Draft', 'Approved'].includes(order.value?.status)
  && (can('purchase_orders_edit', 'Purchase Order') || can('purchase_orders_approve', 'Purchase Order')));

function ask(action: 'approve' | 'cancel') {
  confirmAction.value = action;
  confirmOpen.value = true;
}

async function load() {
  loading.value = true;
  try {
    order.value = (await axios.get(`purchase-orders/${route.params.id}`)).data;
  } catch (error) {
    alerts.fail(error);
  } finally {
    loading.value = false;
  }
}

async function run(action: 'approve' | 'cancel') {
  working.value = true;
  try {
    order.value = (await axios.put(`purchase-orders/${order.value.id}/${action}`)).data;
    alerts.success(action === 'approve' ? 'Purchase order has been approved!' : 'Purchase order has been cancelled!');
  } catch (error) {
    alerts.fail(error);
  } finally {
    working.value = false;
  }
}

function printPage() {
  window.print();
}

onMounted(load);
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard :title="order ? `Purchase Order ${order.po_number}` : 'Purchase Order'" icon="mdi-clipboard-text-outline">
        <template #action>
          <div v-if="order" class="d-flex align-center flex-wrap gap-2 no-print">
            <StatusChip :status="order.status" />
            <v-btn variant="outlined" color="primary" prepend-icon="mdi-printer-outline" @click="printPage">Print</v-btn>
            <v-btn v-if="order.status === 'Draft' && can('purchase_orders_edit', 'Purchase Order')" variant="outlined" color="primary" prepend-icon="mdi-pencil-outline"
              :to="`/purchase-orders/${order.id}/edit`">Edit</v-btn>
            <v-btn v-if="canCancel" variant="tonal" color="error" :loading="working" @click="ask('cancel')">Cancel Order</v-btn>
            <v-btn v-if="order.status === 'Draft' && can('purchase_orders_approve', 'Purchase Order')" color="primary" :loading="working" @click="ask('approve')">Approve</v-btn>
            <v-btn v-if="receivable && can('goods_receipts_create', 'Goods Receipt')" color="primary" prepend-icon="mdi-package-down"
              :to="{ path: '/goods-receipts/create', query: { purchase_order_id: order.id } }">Receive Goods</v-btn>
            <v-btn variant="text" color="primary" prepend-icon="mdi-arrow-left" @click="router.push('/purchase-orders')">Back</v-btn>
          </div>
        </template>

        <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-4 single-line-alert" closable>
          <template v-slot:prepend><v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon></template>
        </v-alert>
        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />

        <v-skeleton-loader v-if="loading" type="article, table" />
        <template v-else-if="order">
          <v-card elevation="0" class="border rounded-md mb-4">
            <v-card-text>
              <v-row>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Supplier</div><div class="font-weight-semibold">{{ order.supplier?.name }}</div><div class="text-caption">{{ order.supplier?.phone }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Deliver To</div><div class="font-weight-semibold">{{ order.clientstore?.store_name }}</div><div class="text-caption">{{ order.clientstore?.address }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Order Date</div><div class="font-weight-semibold">{{ formatDate(order.order_date) }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Expected</div><div class="font-weight-semibold">{{ formatDate(order.expected_date) }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Created</div><div class="font-weight-semibold">{{ formatDate(order.created_at) }}</div><div class="text-caption">{{ order.created_by?.full_name }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Approved</div><div class="font-weight-semibold">{{ order.approved_at ? formatDate(order.approved_at) : '-' }}</div><div class="text-caption">{{ order.approved_by?.full_name }}</div></v-col>
                <v-col v-if="order.note" cols="12" md="6"><div class="text-caption text-lightText">Note</div><div class="font-weight-semibold">{{ order.note }}</div></v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <div class="border rounded-md overflow-x-auto">
            <v-table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>ORDERED</th>
                  <th style="min-width: 160px">RECEIVED</th>
                  <th class="text-right">UNIT COST</th>
                  <th class="text-right">TAX</th>
                  <th class="text-right">DISCOUNT</th>
                  <th class="text-right">LINE TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in order.items" :key="item.id">
                  <td>
                    <div class="text-subtitle-2">{{ item.product_variant.product.name }} - {{ item.product_variant.name }}</div>
                    <div class="text-caption text-lightText">{{ item.product_variant.sku }}</div>
                  </td>
                  <td>{{ formatNumber(item.quantity, 3) }}</td>
                  <td>
                    <div class="d-flex align-center gap-2">
                      <v-progress-linear :model-value="(item.received_quantity / item.quantity) * 100" :color="item.received_quantity >= item.quantity ? 'successdark' : 'orange'" height="6" rounded />
                      <span class="text-caption">{{ formatNumber(item.received_quantity, 3) }}</span>
                    </div>
                  </td>
                  <td class="text-right">{{ formatMoney(item.unit_cost) }}</td>
                  <td class="text-right">{{ formatMoney(item.tax_amount) }} <span class="text-caption">({{ item.tax_rate }}%)</span></td>
                  <td class="text-right">{{ formatMoney(item.discount_amount) }}</td>
                  <td class="text-right font-weight-semibold">{{ formatMoney(item.line_total) }}</td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <div class="d-flex mt-6">
            <LineTotals :subtotal="order.subtotal" :discount="order.discount_amount" :tax="order.tax_amount" :total="order.total_amount" />
          </div>

          <h4 class="text-h5 mt-8 mb-3">Goods Receipts</h4>
          <div class="border rounded-md overflow-x-auto">
            <v-table>
              <thead>
                <tr><th>GRN</th><th>RECEIVED</th><th>STATUS</th><th class="text-right">AMOUNT</th></tr>
              </thead>
              <tbody>
                <tr v-for="receipt in order.receipts" :key="receipt.id">
                  <td><router-link :to="`/goods-receipts/${receipt.id}`" class="text-primary font-weight-semibold text-decoration-none">{{ receipt.grn_number }}</router-link></td>
                  <td>{{ formatDate(receipt.received_date) }}</td>
                  <td><StatusChip :status="receipt.status" /></td>
                  <td class="text-right">{{ formatMoney(receipt.total_amount) }}</td>
                </tr>
                <tr v-if="!order.receipts?.length">
                  <td colspan="4" class="text-center text-lightText py-6">Nothing has been received against this order yet</td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </template>
      </UiParentCard>
    </v-col>
  </v-row>

  <DeleteDialog v-model="confirmOpen"
    :message="confirmAction === 'approve' ? `Approve purchase order ${order?.po_number}?` : `Cancel purchase order ${order?.po_number}?`"
    :hint="confirmAction === 'approve' ? 'After approval the order can be received but no longer edited.' : 'A cancelled order cannot be received or reopened.'"
    :confirm-label="confirmAction === 'approve' ? 'Yes, Approve' : 'Yes, Cancel'"
    :icon="confirmAction === 'approve' ? 'mdi-check-decagram-outline' : 'mdi-close-octagon-outline'"
    :tone="confirmAction === 'approve' ? 'primary' : 'error'"
    @confirm="run(confirmAction)" />
</template>
