<script setup lang="ts">
import { onMounted, ref } from 'vue';
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
const receipt = ref<any>(null);
const loading = ref(true);
const posting = ref(false);
const confirmOpen = ref(false);

async function load() {
  loading.value = true;
  try {
    receipt.value = (await axios.get(`goods-receipts/${route.params.id}`)).data;
  } catch (error) {
    alerts.fail(error);
  } finally {
    loading.value = false;
  }
}

async function post() {
  posting.value = true;
  try {
    receipt.value = (await axios.put(`goods-receipts/${receipt.value.id}/post`)).data;
    alerts.success('Posted. Stock has been updated!');
  } catch (error) {
    alerts.fail(error);
  } finally {
    posting.value = false;
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
      <UiParentCard :title="receipt ? `Goods Receipt ${receipt.grn_number}` : 'Goods Receipt'" icon="mdi-truck-delivery-outline">
        <template #action>
          <div v-if="receipt" class="d-flex align-center flex-wrap gap-2 no-print">
            <StatusChip :status="receipt.status" />
            <v-btn variant="outlined" color="primary" prepend-icon="mdi-printer-outline" @click="printPage">Print</v-btn>
            <v-btn v-if="receipt.status === 'Draft' && can('goods_receipts_edit', 'Goods Receipt')" variant="outlined" color="primary" prepend-icon="mdi-pencil-outline"
              :to="`/goods-receipts/${receipt.id}/edit`">Edit</v-btn>
            <v-btn v-if="receipt.status === 'Draft' && can('goods_receipts_post', 'Goods Receipt')" color="primary" prepend-icon="mdi-check-decagram-outline"
              :loading="posting" @click="confirmOpen = true">Post to Stock</v-btn>
            <v-btn variant="text" color="primary" prepend-icon="mdi-arrow-left" @click="router.push('/goods-receipts')">Back</v-btn>
          </div>
        </template>

        <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-4 single-line-alert" closable>
          <template v-slot:prepend><v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon></template>
        </v-alert>
        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />

        <v-skeleton-loader v-if="loading" type="article, table" />
        <template v-else-if="receipt">
          <v-alert v-if="receipt.status === 'Draft'" type="warning" variant="tonal" density="compact" class="mb-4">
            This receipt is a draft. Stock does not change until it is posted.
          </v-alert>

          <v-card elevation="0" class="border rounded-md mb-4">
            <v-card-text>
              <v-row>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Supplier</div><div class="font-weight-semibold">{{ receipt.supplier?.name }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Branch</div><div class="font-weight-semibold">{{ receipt.clientstore?.store_name }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Received On</div><div class="font-weight-semibold">{{ formatDate(receipt.received_date) }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Supplier Invoice</div><div class="font-weight-semibold">{{ receipt.supplier_invoice_number || '-' }}</div></v-col>
                <v-col cols="6" md="3">
                  <div class="text-caption text-lightText">Purchase Order</div>
                  <router-link v-if="receipt.purchase_order" :to="`/purchase-orders/${receipt.purchase_order.id}`" class="text-primary font-weight-semibold text-decoration-none">{{ receipt.purchase_order.po_number }}</router-link>
                  <div v-else class="font-weight-semibold">Direct receipt</div>
                </v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Created</div><div class="font-weight-semibold">{{ formatDate(receipt.created_at) }}</div><div class="text-caption">{{ receipt.created_by?.full_name }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Posted</div><div class="font-weight-semibold">{{ receipt.posted_at ? formatDate(receipt.posted_at) : '-' }}</div><div class="text-caption">{{ receipt.posted_by?.full_name }}</div></v-col>
                <v-col v-if="receipt.note" cols="12" md="3"><div class="text-caption text-lightText">Note</div><div class="font-weight-semibold">{{ receipt.note }}</div></v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <div class="border rounded-md overflow-x-auto">
            <v-table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>QTY</th>
                  <th>FREE</th>
                  <th class="text-right">UNIT COST</th>
                  <th>BATCH / EXPIRY</th>
                  <th class="text-right">TAX</th>
                  <th class="text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in receipt.items" :key="item.id">
                  <td>
                    <div class="text-subtitle-2">{{ item.product_variant.product.name }} - {{ item.product_variant.name }}</div>
                    <div class="text-caption text-lightText">{{ item.product_variant.sku }}</div>
                  </td>
                  <td>{{ formatNumber(item.quantity, 3) }}</td>
                  <td>{{ item.free_quantity ? formatNumber(item.free_quantity, 3) : '-' }}</td>
                  <td class="text-right">{{ formatMoney(item.unit_cost) }}</td>
                  <td>
                    <div>{{ item.batch_number || '-' }}</div>
                    <div class="text-caption text-lightText">{{ item.expiry_date ? `Exp ${formatDate(item.expiry_date)}` : '' }}</div>
                  </td>
                  <td class="text-right">{{ formatMoney(item.tax_amount) }}</td>
                  <td class="text-right font-weight-semibold">{{ formatMoney(item.line_total) }}</td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <div class="d-flex mt-6">
            <LineTotals :subtotal="receipt.subtotal" :discount="receipt.discount_amount" :tax="receipt.tax_amount" :total="receipt.total_amount" />
          </div>
        </template>
      </UiParentCard>
    </v-col>
  </v-row>

  <DeleteDialog v-model="confirmOpen" :message="`Post ${receipt?.grn_number} to stock?`" hint="Stock and average costs update right away. A posted receipt cannot be edited."
    confirm-label="Yes, Post" icon="mdi-check-decagram-outline" tone="primary" @confirm="post" />
</template>
