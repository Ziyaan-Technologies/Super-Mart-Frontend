<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import UiParentCard from '@/components/shared/UiParentCard.vue';
import BtnFilled from '@/components/shared/BtnFilled.vue';
import BtnOutlined from '@/components/shared/BtnOutlined.vue';
import DeleteDialog from '@/components/shared/DeleteDialog.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import { useAuthStore } from '@/stores/auth';
import { useAlerts } from '@/composables/useAlerts';
import { can } from '@/utils/permissions';
import { formatDate, formatMoney, formatNumber } from '@/utils/api';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const alerts = useAlerts();
const transfer = ref<any>(null);
const loading = ref(true);
const working = ref(false);
const receiving = ref(false);
const received = ref<Record<number, number>>({});
const receiveNote = ref('');
const confirmOpen = ref(false);
const confirmAction = ref<'dispatch' | 'cancel'>('dispatch');

const atSource = computed(() => authStore.clientstoreId === transfer.value?.from_clientstore_id);
const atDestination = computed(() => authStore.clientstoreId === transfer.value?.to_clientstore_id);
const canDispatch = computed(() => transfer.value?.status === 'Draft' && atSource.value && can('stock_transfers_dispatch', 'Stock Transfer'));
const canReceive = computed(() => transfer.value?.status === 'Dispatched' && atDestination.value && can('stock_transfers_receive', 'Stock Transfer'));

async function load() {
  loading.value = true;
  try {
    transfer.value = (await axios.get(`stock-transfers/${route.params.id}`)).data;
    received.value = Object.fromEntries(transfer.value.items.map((item: any) => [item.id, item.quantity]));
  } catch (error) {
    alerts.fail(error);
  } finally {
    loading.value = false;
  }
}

function ask(action: 'dispatch' | 'cancel') {
  confirmAction.value = action;
  confirmOpen.value = true;
}

async function run(action: 'dispatch' | 'cancel') {
  working.value = true;
  try {
    transfer.value = (await axios.put(`stock-transfers/${transfer.value.id}/${action}`)).data;
    alerts.success(action === 'dispatch' ? 'Transfer dispatched. Stock has left this branch!' : 'Transfer has been cancelled!');
  } catch (error) {
    alerts.fail(error);
  } finally {
    working.value = false;
  }
}

async function receive() {
  const invalid = transfer.value.items.find((item: any) => Number(received.value[item.id]) < 0 || Number(received.value[item.id]) > item.quantity);
  if (invalid) {
    alerts.fail(null, `Received quantity for ${invalid.product_variant.product.name} must be between 0 and ${invalid.quantity}`);
    return;
  }
  working.value = true;
  try {
    transfer.value = (await axios.put(`stock-transfers/${transfer.value.id}/receive`, {
      items: transfer.value.items.map((item: any) => ({ id: item.id, received_quantity: Number(received.value[item.id]) || 0 })),
      receive_note: receiveNote.value || undefined,
    })).data;
    receiving.value = false;
    const shortage = transfer.value.items.some((item: any) => item.received_quantity < item.quantity);
    alerts.success(shortage ? 'Transfer received with a shortfall. Check the receiving notes.' : 'Transfer received. Stock added to this branch!');
  } catch (error) {
    alerts.fail(error);
  } finally {
    working.value = false;
  }
}

onMounted(load);
</script>

<template>
  <v-row>
    <v-col cols="12">
      <UiParentCard :title="transfer ? `Stock Transfer ${transfer.transfer_number}` : 'Stock Transfer'" icon="mdi-swap-horizontal-bold">
        <template #action>
          <div v-if="transfer" class="d-flex align-center flex-wrap gap-2">
            <StatusChip :status="transfer.status" />
            <v-btn v-if="transfer.status === 'Draft' && atSource && can('stock_transfers_edit', 'Stock Transfer')" variant="outlined" color="primary"
              prepend-icon="mdi-pencil-outline" :to="`/stock-transfers/${transfer.id}/edit`">Edit</v-btn>
            <v-btn v-if="transfer.status === 'Draft' && atSource && can('stock_transfers_edit', 'Stock Transfer')" variant="tonal" color="error" :loading="working"
              @click="ask('cancel')">Cancel Transfer</v-btn>
            <v-btn v-if="canDispatch" color="primary" prepend-icon="mdi-truck-fast-outline" :loading="working" @click="ask('dispatch')">Dispatch</v-btn>
            <v-btn v-if="canReceive && !receiving" color="primary" prepend-icon="mdi-package-down" @click="receiving = true">Receive</v-btn>
            <v-btn variant="text" color="primary" prepend-icon="mdi-arrow-left" @click="router.push('/stock-transfers')">Back</v-btn>
          </div>
        </template>

        <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="mb-4 single-line-alert" closable>
          <template v-slot:prepend><v-icon class="text-24">mdi-checkbox-marked-circle-outline</v-icon></template>
        </v-alert>
        <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="mb-4 single-line-alert" closable />

        <v-skeleton-loader v-if="loading" type="article, table" />
        <template v-else-if="transfer">
          <v-alert v-if="transfer.status === 'Dispatched' && !atDestination" type="info" variant="tonal" density="compact" class="mb-4">
            Switch to {{ transfer.to_clientstore?.store_name }} from the branch picker to receive this transfer.
          </v-alert>

          <v-card elevation="0" class="border rounded-md mb-4">
            <v-card-text>
              <div class="d-flex align-center flex-wrap gap-4 mb-4">
                <div>
                  <div class="text-caption text-lightText">From</div>
                  <div class="text-h5">{{ transfer.from_clientstore?.store_name }}</div>
                </div>
                <v-icon size="28" color="primary">mdi-arrow-right-bold</v-icon>
                <div>
                  <div class="text-caption text-lightText">To</div>
                  <div class="text-h5">{{ transfer.to_clientstore?.store_name }}</div>
                </div>
              </div>
              <v-row>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Transfer Date</div><div class="font-weight-semibold">{{ formatDate(transfer.transfer_date) }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Created By</div><div class="font-weight-semibold">{{ transfer.created_by?.full_name || '-' }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Dispatched</div><div class="font-weight-semibold">{{ transfer.dispatched_at ? formatDate(transfer.dispatched_at) : '-' }}</div><div class="text-caption">{{ transfer.dispatched_by?.full_name }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Received</div><div class="font-weight-semibold">{{ transfer.received_at ? formatDate(transfer.received_at) : '-' }}</div><div class="text-caption">{{ transfer.received_by?.full_name }}</div></v-col>
                <v-col cols="6" md="3"><div class="text-caption text-lightText">Value at Cost</div><div class="font-weight-semibold">{{ transfer.status === 'Draft' ? 'Set on dispatch' : formatMoney(transfer.total_value) }}</div></v-col>
                <v-col v-if="transfer.note" cols="12" md="3"><div class="text-caption text-lightText">Note</div><div class="font-weight-semibold">{{ transfer.note }}</div></v-col>
                <v-col v-if="transfer.receive_note" cols="12" md="6"><div class="text-caption text-lightText">Receiving Notes</div><div class="font-weight-semibold" style="white-space: pre-line">{{ transfer.receive_note }}</div></v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <v-alert v-if="receiving" type="info" variant="tonal" density="compact" class="mb-4">
            Enter what actually arrived. Any shortfall is written into the receiving notes.
          </v-alert>

          <div class="border rounded-md overflow-x-auto">
            <v-table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>SENT</th>
                  <th>{{ receiving ? 'RECEIVED NOW' : 'RECEIVED' }}</th>
                  <th class="text-right">UNIT COST</th>
                  <th>BATCHES</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in transfer.items" :key="item.id">
                  <td>
                    <div class="text-subtitle-2">{{ item.product_variant.product.name }} - {{ item.product_variant.name }}</div>
                    <div class="text-caption text-lightText">{{ item.product_variant.sku }}</div>
                  </td>
                  <td>{{ formatNumber(item.quantity, 3) }}</td>
                  <td style="width: 170px">
                    <v-text-field v-if="receiving" v-model.number="received[item.id]" type="number" min="0" :max="item.quantity" density="compact" hide-details />
                    <span v-else-if="item.received_quantity !== null" :class="item.received_quantity < item.quantity ? 'text-error font-weight-bold' : ''">{{ formatNumber(item.received_quantity, 3) }}</span>
                    <span v-else class="text-lightText">-</span>
                  </td>
                  <td class="text-right">{{ transfer.status === 'Draft' ? '-' : formatMoney(item.unit_cost) }}</td>
                  <td>
                    <div v-for="(batch, index) in item.batch_allocations || []" :key="index" class="text-caption">
                      {{ batch.batch_number || 'No batch' }}<span v-if="batch.expiry_date"> · exp {{ formatDate(batch.expiry_date) }}</span> · {{ formatNumber(batch.quantity, 3) }}
                    </div>
                    <span v-if="!(item.batch_allocations || []).length" class="text-lightText">-</span>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <template v-if="receiving">
            <v-label class="text-subtitle-1 pb-2 pt-4 text-lightText">Receiving Note</v-label>
            <v-textarea v-model="receiveNote" rows="2" auto-grow placeholder="e.g. one carton damaged" hide-details />
            <div class="d-flex justify-end gap-2 mt-4">
              <BtnOutlined type="button" outline="Back" @click="receiving = false" />
              <BtnFilled type="button" filled="Confirm Receipt" :loading="working" @click="receive" />
            </div>
          </template>
        </template>
      </UiParentCard>
    </v-col>
  </v-row>

  <DeleteDialog v-model="confirmOpen"
    :message="confirmAction === 'dispatch' ? `Dispatch ${transfer?.transfer_number}?` : `Cancel ${transfer?.transfer_number}?`"
    :hint="confirmAction === 'dispatch' ? 'Stock leaves this branch now and is in transit until the other branch receives it.' : 'A cancelled transfer cannot be reopened.'"
    :confirm-label="confirmAction === 'dispatch' ? 'Yes, Dispatch' : 'Yes, Cancel'"
    :icon="confirmAction === 'dispatch' ? 'mdi-truck-fast-outline' : 'mdi-close-octagon-outline'"
    :tone="confirmAction === 'dispatch' ? 'primary' : 'error'"
    @confirm="run(confirmAction)" />
</template>
