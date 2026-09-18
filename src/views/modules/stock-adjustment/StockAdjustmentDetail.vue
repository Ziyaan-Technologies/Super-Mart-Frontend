<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import DeleteDialog from '@/components/shared/DeleteDialog.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import { useAlerts } from '@/composables/useAlerts';
import { can } from '@/utils/permissions';
import { formatDate, formatMoney, formatNumber } from '@/utils/api';

const route = useRoute();
const router = useRouter();
const alerts = useAlerts();
const adjustment = ref<any>(null);
const loading = ref(true);
const posting = ref(false);
const confirmOpen = ref(false);

const isCount = computed(() => adjustment.value?.reason === 'Count Correction');
const posted = computed(() => adjustment.value?.status === 'Posted');

async function load() {
  loading.value = true;
  try {
    adjustment.value = (await axios.get(`stock-adjustments/${route.params.id}`)).data;
  } catch (error) {
    alerts.fail(error);
  } finally {
    loading.value = false;
  }
}

async function post() {
  posting.value = true;
  try {
    adjustment.value = (await axios.put(`stock-adjustments/${adjustment.value.id}/post`)).data;
    alerts.success('Adjustment has been posted!');
  } catch (error) {
    alerts.fail(error);
  } finally {
    posting.value = false;
  }
}

onMounted(load);
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard :title="adjustment ? `Stock Adjustment ${adjustment.adjustment_number}` : 'Stock Adjustment'" icon="mdi-scale-balance">
        <template #action>
          <div v-if="adjustment" class="d-flex align-center flex-wrap gap-2">
            <StatusChip :status="adjustment.status" />
            <v-btn v-if="!posted && can('stock_adjustments_edit', 'Stock Adjustment')" variant="outlined" color="primary" prepend-icon="mdi-pencil-outline"
              :to="`/stock-adjustments/${adjustment.id}/edit`">Edit</v-btn>
            <v-btn v-if="!posted && can('stock_adjustments_post', 'Stock Adjustment')" color="primary" prepend-icon="mdi-check-decagram-outline" :loading="posting"
              @click="confirmOpen = true">Post</v-btn>
            <v-btn variant="text" color="primary" prepend-icon="mdi-arrow-left" @click="router.push('/stock-adjustments')">Back</v-btn>
          </div>
        </template>

        <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-4 single-line-alert" closable>
          <template v-slot:prepend><v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon></template>
        </v-alert>
        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />

        <v-skeleton-loader v-if="loading" type="article, table" />
        <template v-else-if="adjustment">
          <v-alert v-if="!posted" type="warning" variant="tonal" density="compact" class="mb-4">
            Draft. {{ isCount ? 'Differences are calculated from stock at the moment you post.' : 'Stock does not change until this is posted.' }}
          </v-alert>

          <v-card elevation="0" class="border rounded-md mb-4">
            <v-card-text>
              <v-row>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Reason</div><div class="font-weight-semibold">{{ adjustment.reason }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Branch</div><div class="font-weight-semibold">{{ adjustment.clientstore?.store_name }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Date</div><div class="font-weight-semibold">{{ formatDate(adjustment.adjustment_date) }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Created By</div><div class="font-weight-semibold">{{ adjustment.created_by?.full_name || '-' }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Posted</div><div class="font-weight-semibold">{{ adjustment.posted_at ? formatDate(adjustment.posted_at) : '-' }}</div><div class="text-caption">{{ adjustment.posted_by?.full_name }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Net Value</div><div class="font-weight-semibold" :class="adjustment.total_value < 0 ? 'text-error' : ''">{{ posted ? formatMoney(adjustment.total_value) : '-' }}</div></v-col>
                <v-col v-if="adjustment.note" cols="12" md="6"><div class="text-caption text-lightText">Note</div><div class="font-weight-semibold">{{ adjustment.note }}</div></v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <div class="border rounded-md overflow-x-auto">
            <v-table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th v-if="isCount">COUNTED</th>
                  <th v-if="isCount">SYSTEM</th>
                  <th>{{ isCount ? 'DIFFERENCE' : 'QUANTITY' }}</th>
                  <th>BATCH</th>
                  <th class="text-right">UNIT COST</th>
                  <th class="text-right">VALUE</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in adjustment.items" :key="item.id">
                  <td>
                    <div class="text-subtitle-2">{{ item.product_variant.product.name }} - {{ item.product_variant.name }}</div>
                    <div class="text-caption text-lightText">{{ item.product_variant.sku }}</div>
                  </td>
                  <td v-if="isCount">{{ formatNumber(item.counted_quantity, 3) }}</td>
                  <td v-if="isCount">{{ item.system_quantity === null ? 'At posting' : formatNumber(item.system_quantity, 3) }}</td>
                  <td>
                    <span v-if="isCount && !posted" class="text-lightText">At posting</span>
                    <span v-else :class="item.quantity < 0 ? 'text-error font-weight-bold' : item.quantity > 0 ? 'text-successdark font-weight-bold' : ''">
                      {{ item.quantity > 0 ? '+' : '' }}{{ formatNumber(item.quantity, 3) }}
                    </span>
                  </td>
                  <td>
                    <span v-if="item.stock_batch">{{ item.stock_batch.batch_number || 'No batch' }}<span v-if="item.stock_batch.expiry_date" class="text-caption"> · exp {{ formatDate(item.stock_batch.expiry_date) }}</span></span>
                    <span v-else-if="item.batch_number || item.expiry_date">{{ item.batch_number || 'No batch' }}<span v-if="item.expiry_date" class="text-caption"> · exp {{ formatDate(item.expiry_date) }}</span></span>
                    <span v-else class="text-lightText">{{ item.quantity < 0 ? 'Earliest expiry first' : '-' }}</span>
                  </td>
                  <td class="text-right">{{ posted ? formatMoney(item.unit_cost) : '-' }}</td>
                  <td class="text-right font-weight-semibold">{{ posted ? formatMoney(item.line_value) : '-' }}</td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </template>
      </UiParentCard>
    </v-col>
  </v-row>

  <DeleteDialog v-model="confirmOpen" :message="`Post ${adjustment?.adjustment_number}?`" hint="Stock changes right away. A posted adjustment cannot be edited."
    confirm-label="Yes, Post" icon="mdi-check-decagram-outline" tone="primary" @confirm="post" />
</template>
