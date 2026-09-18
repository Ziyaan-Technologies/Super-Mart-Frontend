<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import DeskDialog from '@/components/shared/DeskDialog.vue';
import DeleteDialog from '@/components/shared/DeleteDialog.vue';
import StatusChip from '@/components/shared/StatusChip.vue';
import ReceiptButtons from '@/components/shared/ReceiptButtons.vue';
import RegisterDialog from '@/views/modules/pos/RegisterDialog.vue';
import ReturnDialog from '@/views/modules/pos/ReturnDialog.vue';
import ReceiptPreview from '@/views/modules/pos/ReceiptPreview.vue';
import { useAuthStore } from '@/stores/auth';
import { useAlerts } from '@/composables/useAlerts';
import { formatDate, formatDateTime, formatMoney, formatNumber, today } from '@/utils/api';
import { can } from '@/utils/permissions';
import type { CartLine } from '@/models/type-interfaces';

const authStore = useAuthStore();
const alerts = useAlerts();

const paymentMethods = [
  { value: 'Cash', icon: 'mdi-cash-multiple', hint: 'Alt+1' },
  { value: 'Card', icon: 'mdi-credit-card-outline', hint: 'Alt+2' },
  { value: 'Online', icon: 'mdi-cellphone-nfc', hint: 'Alt+3' },
];

const tabs = [
  { value: 'detail', title: 'Detail', icon: 'mdi-cart-outline' },
  { value: 'list', title: 'List', icon: 'mdi-format-list-bulleted' },
  { value: 'report', title: 'Report', icon: 'mdi-file-document-outline' },
];

const tab = ref('detail');

const registerLoading = ref(true);
const session = ref<any>(null);
const openElsewhere = ref<string | null>(null);
const openingCash = ref<number | string>(0);
const openingRegister = ref(false);

const barcode = ref('');
const barcodeInput = ref<any>(null);
const scanning = ref(false);
const tableWrap = ref<HTMLElement | null>(null);
const selectedIndex = ref(-1);

const cart = ref<CartLine[]>([]);
const customerPhone = ref('');
const customerName = ref('');
const customer = ref<any>(null);
const customerInput = ref<any>(null);
const customerLookupLoading = ref(false);
const note = ref('');
const billDiscountPercent = ref<number | string>('');
const billFlatDiscount = ref<number | string>('');

const paymentMethod = ref('Cash');
const cashReceived = ref<number | string>('');
const paymentReference = ref('');
const paymentInput = ref<any>(null);
const autoPrint = ref(localStorage.getItem('posAutoPrint') !== '0');
const placing = ref(false);

const lastSale = ref<any>(null);
const justPaid = ref(false);
const receiptButtons = ref<any>(null);

const findDialog = ref(false);
const findQuery = ref('');
const findCategory = ref<number | null>(null);
const findResults = ref<any[]>([]);
const findIndex = ref(0);
const findLoading = ref(false);
const findTable = ref<HTMLElement | null>(null);
const categories = ref<any[]>([]);
const pendingMultiplier = ref<number | null>(null);
let findTimer: ReturnType<typeof setTimeout> | undefined;

const weightDialog = ref(false);
const weightVariant = ref<any>(null);
const weightValue = ref<number | string>('');
const deleteDialog = ref(false);
const deleteIndex = ref(-1);
const voidDialog = ref(false);
const registerDialog = ref(false);
const returnDialog = ref(false);
const returnSaleId = ref<number | null>(null);
const heldDialog = ref(false);
const heldBills = ref<any[]>([]);

const bills = ref<any[]>([]);
const billsLoading = ref(false);
const billsScope = ref('counter');
const billsSort = ref('Newest');
const billsSearch = ref('');
const billsFrom = ref(today());
const billsTo = ref(today());
const selectedBill = ref<any>(null);

const reportSale = ref<any>(null);
const reportLoading = ref(false);
const reportBillNumber = ref('');

const canDiscount = computed(() => can('pos_discount', 'POS'));
const canReturn = computed(() => can('pos_return', 'POS'));
const heldKey = computed(() => `posHeld:${authStore.clientstoreId}`);
const counterName = computed(() => (authStore.client?.full_name || '').toUpperCase());
const dialogOpen = computed(() => findDialog.value || weightDialog.value || deleteDialog.value || voidDialog.value
  || heldDialog.value || registerDialog.value || returnDialog.value);

const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;
const roundQuantity = (value: number) => Math.round((Number(value) || 0) * 1000) / 1000;

function lineGross(line: CartLine) {
  return round(Number(line.quantity) * line.unit_price);
}

function lineDiscount(line: CartLine) {
  const gross = lineGross(line);
  const discount = gross * (Number(line.discount_percent) || 0) / 100 + (Number(line.flat_discount) || 0);
  return round(Math.min(Math.max(discount, 0), gross));
}

function lineNet(line: CartLine) {
  return round(lineGross(line) - lineDiscount(line));
}

const totals = computed(() => {
  const net = round(cart.value.reduce((sum, line) => sum + lineNet(line), 0));
  const requested = net * (Number(billDiscountPercent.value) || 0) / 100 + (Number(billFlatDiscount.value) || 0);
  const billDiscount = round(Math.min(Math.max(requested, 0), net));
  let allocated = 0;
  let tax = 0;
  let total = 0;
  cart.value.forEach((line, index) => {
    const lineAmount = lineNet(line);
    const share = index === cart.value.length - 1 ? round(billDiscount - allocated) : net > 0 ? round(billDiscount * lineAmount / net) : 0;
    allocated = round(allocated + share);
    const taxable = round(lineAmount - share);
    const rate = Number(line.tax_rate) || 0;
    if (line.price_includes_tax) {
      tax += round(taxable * rate / (100 + rate));
      total += taxable;
    } else {
      const lineTax = round(taxable * rate / 100);
      tax += lineTax;
      total += taxable + lineTax;
    }
  });
  const gross = round(cart.value.reduce((sum, line) => sum + lineGross(line), 0));
  const itemDiscount = round(cart.value.reduce((sum, line) => sum + lineDiscount(line), 0));
  return {
    lines: cart.value.length,
    quantity: roundQuantity(cart.value.reduce((sum, line) => sum + (line.is_weighted ? 1 : Number(line.quantity) || 0), 0)),
    gross,
    itemDiscount,
    billDiscount,
    totalDiscount: round(itemDiscount + billDiscount),
    tax: round(tax),
    total: round(total),
    excludingTax: round(total - tax),
    inclusive: cart.value.every((line) => line.price_includes_tax),
  };
});

const isCash = computed(() => paymentMethod.value === 'Cash');
const cashValue = computed(() => (cashReceived.value === '' ? totals.value.total : Number(cashReceived.value) || 0));
const change = computed(() => (isCash.value ? round(Math.max(cashValue.value - totals.value.total, 0)) : 0));
const due = computed(() => (isCash.value ? round(Math.max(totals.value.total - cashValue.value, 0)) : 0));
const quickCash = computed(() => {
  const total = totals.value.total;
  const options = new Set<number>([Math.ceil(total)]);
  [100, 500, 1000, 5000].forEach((step) => options.add(Math.ceil(total / step) * step));
  return Array.from(options).filter((value) => value > 0).sort((a, b) => a - b).slice(0, 4);
});

const functionKeys = computed(() => [
  { key: 'F2', label: 'Barcode', icon: 'mdi-barcode-scan', action: focusScanner, show: true, disabled: false, tone: '' },
  { key: 'F3', label: 'Find Item', icon: 'mdi-magnify', action: () => openFind(), show: true, disabled: false, tone: '' },
  { key: 'F4', label: 'Party', icon: 'mdi-account-search-outline', action: focusCustomer, show: true, disabled: false, tone: '' },
  { key: 'Del', label: 'Remove Line', icon: 'mdi-minus-box-outline', action: () => askRemove(selectedIndex.value), show: true, disabled: selectedIndex.value < 0, tone: '' },
  { key: 'F6', label: 'Hold', icon: 'mdi-pause-circle-outline', action: holdBill, show: true, disabled: !cart.value.length, tone: '' },
  { key: 'F7', label: 'Un Hold', icon: 'mdi-play-circle-outline', action: openHeld, show: true, disabled: false, tone: '' },
  { key: 'F8', label: 'Return', icon: 'mdi-keyboard-return', action: () => openReturn(null), show: canReturn.value, disabled: false, tone: '' },
  { key: 'F9', label: 'Save', icon: 'mdi-content-save-outline', action: startPayment, show: true, disabled: !cart.value.length, tone: '' },
  { key: 'F10', label: 'Print Last', icon: 'mdi-printer-outline', action: printLast, show: true, disabled: !lastSale.value, tone: '' },
  { key: '', label: 'Clear Bill', icon: 'mdi-delete-sweep-outline', action: () => (voidDialog.value = true), show: true, disabled: !cart.value.length, tone: 'desk-fn--red' },
  { key: '', label: 'Close Counter', icon: 'mdi-lock-outline', action: () => (registerDialog.value = true), show: true, disabled: false, tone: 'desk-fn--grey' },
].filter((item) => item.show));

function focusScanner() {
  nextTick(() => barcodeInput.value?.focus());
}

function focusCustomer() {
  nextTick(() => customerInput.value?.focus());
}

function scrollToSelected() {
  nextTick(() => {
    const rows = tableWrap.value?.querySelectorAll('tbody tr');
    rows?.[selectedIndex.value]?.scrollIntoView({ block: 'nearest' });
  });
}

async function loadRegister() {
  if (!authStore.clientstoreId) return;
  registerLoading.value = true;
  try {
    const response = await axios.get('pos/registers/current', { params: { clientstore_id: authStore.clientstoreId } });
    session.value = response.data.session;
    openElsewhere.value = response.data.open_elsewhere || null;
    if (session.value) {
      focusScanner();
      loadLastSale();
    }
  } catch (error) {
    alerts.fail(error);
  } finally {
    registerLoading.value = false;
  }
}

async function loadLastSale() {
  try {
    const response = await axios.post('pos/sales/v1/list', { clientstore_id: authStore.clientstoreId, register_session_id: session.value.id, take: 1 });
    lastSale.value = response.data.data[0] || null;
  } catch (error) {
    lastSale.value = null;
  }
}

async function openRegister() {
  openingRegister.value = true;
  try {
    session.value = (await axios.post('pos/registers/open', { clientstore_id: authStore.clientstoreId, opening_cash: Number(openingCash.value) || 0 })).data;
    lastSale.value = null;
    alerts.success(`Counter ${session.value.session_number} opened`);
    focusScanner();
  } catch (error) {
    alerts.fail(error);
  } finally {
    openingRegister.value = false;
  }
}

function addToCart(variant: any, quantity: number) {
  justPaid.value = false;
  const existingIndex = variant.is_weighted ? -1 : cart.value.findIndex((line) => line.product_variant_id === variant.id);
  if (existingIndex >= 0) {
    const existing = cart.value[existingIndex];
    existing.quantity = roundQuantity(Number(existing.quantity) + quantity);
    selectedIndex.value = existingIndex;
  } else {
    cart.value.push({
      product_variant_id: variant.id,
      product_name: variant.product_name,
      variant_name: variant.name,
      sku: variant.sku,
      barcode: variant.barcode,
      image_url: variant.image_url,
      unit_price: Number(variant.sale_price),
      quantity,
      discount_percent: '',
      flat_discount: '',
      tax_rate: Number(variant.tax_rate) || 0,
      price_includes_tax: variant.price_includes_tax !== false && variant.price_includes_tax !== 0,
      is_weighted: !!variant.is_weighted,
      unit_short_name: variant.unit_short_name,
      stock_quantity: Number(variant.stock_quantity),
    });
    selectedIndex.value = cart.value.length - 1;
  }
  cashReceived.value = '';
  scrollToSelected();
}

function askWeight(variant: any) {
  weightVariant.value = variant;
  weightValue.value = '';
  weightDialog.value = true;
}

function addVariant(variant: any, multiplier: number | null) {
  if (variant.is_weighted) {
    if (multiplier && multiplier > 0) addToCart(variant, roundQuantity(multiplier));
    else askWeight(variant);
    return;
  }
  addToCart(variant, Math.max(1, Math.round(multiplier || 1)));
}

function confirmWeight() {
  const weight = roundQuantity(Number(weightValue.value));
  if (weight <= 0) return;
  addToCart(weightVariant.value, weight);
  weightDialog.value = false;
  focusScanner();
}

async function scan() {
  const raw = barcode.value.trim();
  if (!raw) return;
  const match = raw.match(/^(\d+(?:\.\d+)?)\s*\*\s*(.+)$/);
  const multiplier = match ? Number(match[1]) : null;
  const code = match ? match[2].trim() : raw;
  barcode.value = '';
  scanning.value = true;
  try {
    const { data } = await axios.get(`pos/scan/${encodeURIComponent(code)}`, { params: { clientstore_id: authStore.clientstoreId } });
    if (data.quantity) addToCart(data.variant, data.quantity);
    else addVariant(data.variant, multiplier);
  } catch (error: any) {
    if (error?.response?.status === 404 && !/^\d+$/.test(code)) {
      openFind(code, multiplier);
    } else {
      alerts.fail(error, 'Product not found');
    }
  } finally {
    scanning.value = false;
    if (!dialogOpen.value) focusScanner();
  }
}

function onScanKeydown(event: KeyboardEvent) {
  const empty = !barcode.value.trim();
  if (event.key === 'Enter') {
    event.preventDefault();
    if (empty && cart.value.length) startPayment();
    else scan();
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault();
    if (!cart.value.length) return;
    const step = event.key === 'ArrowUp' ? -1 : 1;
    selectedIndex.value = Math.min(Math.max((selectedIndex.value < 0 ? cart.value.length : selectedIndex.value) + step, 0), cart.value.length - 1);
    scrollToSelected();
  } else if (empty && (event.key === '+' || event.key === '-')) {
    event.preventDefault();
    const line = cart.value[selectedIndex.value];
    if (line) changeQuantity(line, event.key === '+' ? 1 : -1);
  } else if (empty && event.key === 'Delete') {
    event.preventDefault();
    askRemove(selectedIndex.value);
  } else if (event.key === 'Escape') {
    barcode.value = '';
  }
}

function changeQuantity(line: CartLine, step: number) {
  const next = roundQuantity(Number(line.quantity) + step);
  if (next <= 0) return;
  line.quantity = next;
}

function normalizeQuantity(line: CartLine) {
  const value = roundQuantity(Number(line.quantity));
  line.quantity = line.is_weighted ? (value > 0 ? value : 0.001) : Math.max(1, Math.round(value));
}

function normalizeDiscount(line: CartLine) {
  const percent = Number(line.discount_percent) || 0;
  line.discount_percent = percent > 0 ? Math.min(percent, 100) : '';
  const flat = Number(line.flat_discount) || 0;
  line.flat_discount = flat > 0 ? flat : '';
}

function askRemove(index: number) {
  if (index < 0 || !cart.value[index]) return;
  deleteIndex.value = index;
  deleteDialog.value = true;
}

function removeLine() {
  cart.value.splice(deleteIndex.value, 1);
  selectedIndex.value = Math.min(deleteIndex.value, cart.value.length - 1);
  focusScanner();
}

function voidBill() {
  resetSale();
  alerts.success('Bill cleared');
  focusScanner();
}

async function loadCategories() {
  if (categories.value.length) return;
  try {
    categories.value = (await axios.get('categories/list')).data;
  } catch (error) {
    categories.value = [];
  }
}

async function searchItems() {
  findLoading.value = true;
  try {
    const response = await axios.get('pos/items', {
      params: {
        clientstore_id: authStore.clientstoreId,
        category_id: findCategory.value || undefined,
        q: findQuery.value.trim() || undefined,
        limit: 40,
      },
    });
    findResults.value = response.data;
    findIndex.value = 0;
  } catch (error) {
    alerts.fail(error);
  } finally {
    findLoading.value = false;
  }
}

function openFind(query = barcode.value.trim(), multiplier: number | null = null) {
  pendingMultiplier.value = multiplier;
  findQuery.value = query;
  barcode.value = '';
  findDialog.value = true;
  loadCategories();
  searchItems();
}

watch([findQuery, findCategory], () => {
  if (!findDialog.value) return;
  clearTimeout(findTimer);
  findTimer = setTimeout(searchItems, 250);
});

function chooseFound(item: any) {
  if (!item) return;
  findDialog.value = false;
  addVariant(item, pendingMultiplier.value);
  pendingMultiplier.value = null;
  if (!weightDialog.value) focusScanner();
}

function onFindKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    const step = event.key === 'ArrowUp' ? -1 : 1;
    findIndex.value = Math.min(Math.max(findIndex.value + step, 0), Math.max(findResults.value.length - 1, 0));
    nextTick(() => findTable.value?.querySelectorAll('tbody tr')[findIndex.value]?.scrollIntoView({ block: 'nearest' }));
  } else if (event.key === 'Enter') {
    event.preventDefault();
    chooseFound(findResults.value[findIndex.value]);
  }
}

watch(findDialog, (open) => {
  if (!open && !weightDialog.value) focusScanner();
});

async function lookupCustomer() {
  const phone = customerPhone.value.trim();
  customer.value = null;
  if (phone.length < 3) return;
  customerLookupLoading.value = true;
  try {
    const results = (await axios.get('pos/customers', { params: { q: phone } })).data;
    const match = results.find((row: any) => row.phone === phone) || (results.length === 1 ? results[0] : null);
    if (match) {
      customer.value = match;
      customerPhone.value = match.phone;
      customerName.value = match.full_name;
    }
  } catch (error) {
    alerts.fail(error);
  } finally {
    customerLookupLoading.value = false;
  }
}

function clearCustomer() {
  customer.value = null;
  customerPhone.value = '';
  customerName.value = '';
}

function selectPayment(method: string) {
  paymentMethod.value = method;
  cashReceived.value = '';
  paymentReference.value = '';
  if (cart.value.length) focusPayment();
}

function focusPayment() {
  nextTick(() => {
    const element = paymentInput.value?.$el?.querySelector('input');
    element?.focus();
    element?.select();
  });
}

function startPayment() {
  if (!cart.value.length) return;
  const element = paymentInput.value?.$el?.querySelector('input');
  if (element && document.activeElement === element) {
    placeOrder();
    return;
  }
  focusPayment();
}

function resetSale() {
  cart.value = [];
  selectedIndex.value = -1;
  clearCustomer();
  note.value = '';
  billDiscountPercent.value = '';
  billFlatDiscount.value = '';
  paymentMethod.value = 'Cash';
  cashReceived.value = '';
  paymentReference.value = '';
}

async function placeOrder() {
  if (!cart.value.length || placing.value) return;
  cart.value.forEach((line) => normalizeQuantity(line));
  const total = totals.value.total;
  const amount = isCash.value ? cashValue.value : total;
  if (amount < total) {
    alerts.fail(null, `Cash is short by ${formatMoney(total - amount)}`);
    focusPayment();
    return;
  }
  placing.value = true;
  try {
    const response = await axios.post('pos/sales', {
      clientstore_id: authStore.clientstoreId,
      user_id: customer.value?.id || undefined,
      customer_phone: customer.value ? undefined : customerPhone.value.trim() || undefined,
      customer_name: customer.value ? undefined : customerName.value.trim() || undefined,
      bill_discount: totals.value.billDiscount,
      note: note.value.trim() || undefined,
      items: cart.value.map((line) => ({
        product_variant_id: line.product_variant_id,
        quantity: Number(line.quantity),
        discount_amount: lineDiscount(line),
      })),
      payments: [{
        method: paymentMethod.value,
        amount: round(amount),
        reference: isCash.value ? undefined : paymentReference.value.trim() || undefined,
      }],
    });
    lastSale.value = response.data;
    reportSale.value = response.data;
    reportBillNumber.value = response.data.bill_number;
    justPaid.value = true;
    resetSale();
    alerts.clear();
    if (autoPrint.value) {
      nextTick(() => receiptButtons.value?.printReceipt());
    }
    if (bills.value.length) loadBills();
  } catch (error) {
    alerts.fail(error);
  } finally {
    placing.value = false;
    focusScanner();
  }
}

function printLast() {
  receiptButtons.value?.printReceipt();
}

function openReturn(saleId: number | null) {
  if (!canReturn.value) return;
  returnSaleId.value = saleId;
  returnDialog.value = true;
}

function holdBill() {
  if (!cart.value.length) return;
  const held = JSON.parse(localStorage.getItem(heldKey.value) || '[]');
  held.unshift({
    id: Date.now(),
    at: new Date().toISOString(),
    customerName: customerName.value,
    customerPhone: customerPhone.value,
    cart: cart.value,
    billDiscountPercent: billDiscountPercent.value,
    billFlatDiscount: billFlatDiscount.value,
    note: note.value,
    total: totals.value.total,
  });
  localStorage.setItem(heldKey.value, JSON.stringify(held.slice(0, 20)));
  resetSale();
  alerts.success('Bill held. Press F7 to bring it back.');
  focusScanner();
}

function openHeld() {
  heldBills.value = JSON.parse(localStorage.getItem(heldKey.value) || '[]');
  heldDialog.value = true;
}

function resumeHeld(bill: any) {
  if (cart.value.length) holdBill();
  cart.value = bill.cart.map((line: any) => ({
    ...line,
    discount_percent: line.discount_percent ?? '',
    flat_discount: line.flat_discount ?? line.discount_amount ?? '',
  }));
  selectedIndex.value = cart.value.length - 1;
  customerName.value = bill.customerName || '';
  customerPhone.value = bill.customerPhone || '';
  billDiscountPercent.value = bill.billDiscountPercent ?? '';
  billFlatDiscount.value = bill.billFlatDiscount ?? bill.billDiscount ?? '';
  note.value = bill.note || '';
  discardHeld(bill);
  heldDialog.value = false;
  focusScanner();
}

function discardHeld(bill: any) {
  heldBills.value = heldBills.value.filter((row) => row.id !== bill.id);
  localStorage.setItem(heldKey.value, JSON.stringify(heldBills.value));
}

function onRegisterClosed(closed: any) {
  session.value = null;
  lastSale.value = null;
  reportSale.value = null;
  bills.value = [];
  resetSale();
  const difference = Number(closed.cash_difference) || 0;
  const result = difference === 0 ? 'Drawer is balanced.' : difference < 0 ? `Drawer is short by ${formatMoney(-difference)}.` : `Drawer is over by ${formatMoney(difference)}.`;
  alerts.success(`Counter ${closed.session_number} closed. Expected ${formatMoney(closed.expected_cash)}, counted ${formatMoney(closed.closing_cash)}. ${result}`, 15000);
}

function onReturned() {
  alerts.success('Return processed and refund recorded');
  if (bills.value.length) loadBills();
  if (reportSale.value) showReport(reportSale.value.id);
}

async function loadBills() {
  if (!session.value) return;
  billsLoading.value = true;
  try {
    const range = billsScope.value === 'counter'
      ? { register_session_id: session.value.id }
      : { startDate: billsFrom.value || undefined, endDate: billsTo.value || billsFrom.value || undefined };
    const response = await axios.post('pos/sales/v1/list', {
      clientstore_id: authStore.clientstoreId,
      take: 100,
      sortBy: billsSort.value,
      search: billsSearch.value.trim() || undefined,
      ...range,
    });
    bills.value = response.data.data;
    if (selectedBill.value) {
      selectedBill.value = bills.value.find((bill) => bill.id === selectedBill.value.id) || null;
    }
  } catch (error) {
    alerts.fail(error);
  } finally {
    billsLoading.value = false;
  }
}

function paidBy(bill: any) {
  return (bill.payments || []).map((payment: any) => payment.method).join(' + ') || '-';
}

async function showReport(id: number) {
  tab.value = 'report';
  reportLoading.value = true;
  try {
    reportSale.value = (await axios.get(`pos/sales/${id}`)).data;
    reportBillNumber.value = reportSale.value.bill_number;
  } catch (error) {
    alerts.fail(error);
  } finally {
    reportLoading.value = false;
  }
}

async function findReport() {
  const number = reportBillNumber.value.trim();
  if (!number) return;
  reportLoading.value = true;
  try {
    reportSale.value = (await axios.get(`pos/sales/lookup/${encodeURIComponent(number)}`)).data;
  } catch (error) {
    alerts.fail(error);
  } finally {
    reportLoading.value = false;
  }
}

watch(tab, (value) => {
  if (value === 'detail') focusScanner();
  if (value === 'list') loadBills();
  if (value === 'report' && !reportSale.value && lastSale.value) showReport(lastSale.value.id);
});

function onKeydown(event: KeyboardEvent) {
  if (!session.value || dialogOpen.value || tab.value !== 'detail') return;
  if (event.altKey && ['Digit1', 'Digit2', 'Digit3'].includes(event.code)) {
    event.preventDefault();
    selectPayment(paymentMethods[Number(event.code.slice(-1)) - 1].value);
    return;
  }
  const actions: Record<string, () => void> = {
    F2: focusScanner,
    F3: () => openFind(),
    F4: focusCustomer,
    F6: holdBill,
    F7: openHeld,
    F8: () => openReturn(null),
    F9: startPayment,
    F10: printLast,
  };
  const action = actions[event.key];
  if (action) {
    event.preventDefault();
    action();
  }
}

watch(autoPrint, (value) => localStorage.setItem('posAutoPrint', value ? '1' : '0'));

watch(() => authStore.clientstoreId, () => {
  resetSale();
  lastSale.value = null;
  reportSale.value = null;
  bills.value = [];
  tab.value = 'detail';
  loadRegister();
});

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  loadRegister();
});

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <section class="desk-window pos-window">
    <div class="desk-window__caption">
      <span class="desk-window__title">
        <v-icon size="16">mdi-cash-register</v-icon>Sale: {{ counterName }}
        <span class="desk-window__subtitle">{{ authStore.storeName }}</span>
      </span>
      <template v-if="session">
        <span class="pos-caption-chip pos-caption-chip--open"><v-icon size="14">mdi-circle</v-icon>Counter {{ session.session_number }}</span>
        <span class="pos-caption-chip"><v-icon size="14">mdi-calendar</v-icon>{{ formatDate(new Date()) }}</span>
      </template>
    </div>

    <div v-if="alerts.showAlert.value || alerts.showErrorAlert.value" class="px-2 pt-2">
      <v-alert v-model="alerts.showAlert.value" :text="alerts.alertText.value" type="success" density="compact" class="single-line-alert" closable />
      <v-alert v-model="alerts.showErrorAlert.value" :text="alerts.errorText.value" type="error" density="compact" class="single-line-alert" closable />
    </div>

    <div v-if="registerLoading" class="pa-4">
      <v-skeleton-loader type="table" />
    </div>

    <div v-else-if="!session" class="open-counter">
      <section class="desk-window desk-dialog">
        <div class="desk-window__caption">
          <span class="desk-window__title"><v-icon size="16">mdi-lock-open-variant-outline</v-icon>Open Counter</span>
        </div>
        <div class="desk-dialog__body">
          <div class="open-counter__info">
            <span class="desk-label">Cashier</span><span class="desk-value text-left">{{ authStore.client?.full_name }}</span>
            <span class="desk-label">Branch</span><span class="desk-value text-left">{{ authStore.storeName }}</span>
            <span class="desk-label">Date</span><span class="desk-value text-left">{{ formatDate(new Date()) }}</span>
          </div>
          <p v-if="openElsewhere" class="mt-4 mb-0">
            You already have a counter open at <strong>{{ openElsewhere }}</strong>. Switch to that branch or close it there first.
          </p>
          <template v-else>
            <label class="desk-field-label mt-4">Opening Cash in Drawer ({{ authStore.currencyCode }})</label>
            <v-text-field v-model="openingCash" type="number" min="0" hide-details autofocus class="big-input" @keyup.enter="openRegister" />
            <p class="text-caption text-lightText mt-1 mb-0">Count the cash in the drawer before you start billing.</p>
          </template>
        </div>
        <div v-if="!openElsewhere" class="desk-dialog__footer">
          <button class="desk-btn desk-btn--success" :disabled="openingRegister" @click="openRegister">
            <v-progress-circular v-if="openingRegister" indeterminate size="14" width="2" color="white" />
            <v-icon v-else size="16">mdi-lock-open-variant</v-icon>Open Counter
          </button>
        </div>
      </section>
    </div>

    <template v-else>
      <div class="desk-tabs">
        <button v-for="item in tabs" :key="item.value" type="button" class="desk-tab" :class="{ 'desk-tab--active': tab === item.value }" @click="tab = item.value">
          <v-icon size="15">{{ item.icon }}</v-icon>{{ item.title }}
        </button>
      </div>

      <div v-show="tab === 'detail'" class="pos-detail">
        <div class="pos-left">
          <div class="desk-group">
            <span class="desk-group__legend">Header Info</span>
            <div class="header-info">
              <div style="width: 100px">
                <label class="desk-field-label">Bill No</label>
                <div class="desk-value field-box">NEW</div>
              </div>
              <div style="width: 120px">
                <label class="desk-field-label">Date</label>
                <div class="desk-value field-box">{{ formatDate(new Date()) }}</div>
              </div>
              <div style="width: 150px">
                <label class="desk-field-label">Party Phone (F4)</label>
                <v-text-field ref="customerInput" v-model="customerPhone" hide-details placeholder="03XXXXXXXXX" :loading="customerLookupLoading"
                  :readonly="!!customer" @blur="lookupCustomer" @keydown.enter.prevent="lookupCustomer(); focusScanner()" />
              </div>
              <div class="flex-grow-1" style="min-width: 200px">
                <label class="desk-field-label">Party Name</label>
                <v-text-field v-model="customerName" hide-details placeholder="CASH SALE - WALK-IN CUSTOMER" :readonly="!!customer"
                  @keydown.enter.prevent="focusScanner">
                  <template v-if="customer" #append-inner>
                    <span class="text-caption text-primary font-weight-bold mr-1">{{ customer.loyalty_points || 0 }} pts</span>
                    <v-icon size="16" class="cursor-pointer" @click="clearCustomer">mdi-close</v-icon>
                  </template>
                </v-text-field>
              </div>
              <div class="flex-grow-1" style="min-width: 160px">
                <label class="desk-field-label">Remarks</label>
                <v-text-field v-model="note" hide-details @keydown.enter.prevent="focusScanner" />
              </div>
            </div>
          </div>

          <div class="scan-bar">
            <label class="scan-bar__label"><v-icon size="22">mdi-barcode-scan</v-icon>Barcode</label>
            <v-text-field ref="barcodeInput" v-model="barcode" hide-details autofocus :loading="scanning" class="scan-input"
              placeholder="Scan barcode or type item name, then Enter" @keydown="onScanKeydown" />
            <button type="button" class="desk-btn" @click="openFind()"><v-icon size="16">mdi-magnify</v-icon>Find (F3)</button>
          </div>

          <div ref="tableWrap" class="desk-grid-wrap pos-grid">
            <v-table fixed-header height="100%" class="bill-table pick-table">
              <thead>
                <tr>
                  <th class="text-center" style="width: 40px">No</th>
                  <th style="width: 130px">Barcode</th>
                  <th>Item Name</th>
                  <th class="text-center" style="width: 110px">Qty</th>
                  <th class="text-right" style="width: 92px">Sale Price</th>
                  <th class="text-center" style="width: 72px">Disc %</th>
                  <th class="text-center" style="width: 84px">Flat Disc</th>
                  <th class="text-right" style="width: 100px">Total</th>
                  <th style="width: 32px"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(line, index) in cart" :key="`${line.product_variant_id}-${index}`"
                  :class="{ 'selected-row': index === selectedIndex }" @click="selectedIndex = index">
                  <td class="row-number">{{ index + 1 }}</td>
                  <td>{{ line.barcode || line.sku }}</td>
                  <td>
                    <div class="font-weight-bold text-truncate text-uppercase">{{ line.product_name }} {{ line.variant_name }}</div>
                    <div v-if="line.is_weighted || (line.stock_quantity !== undefined && Number(line.quantity) > line.stock_quantity)" class="row-note">
                      <span v-if="line.is_weighted">{{ formatMoney(line.unit_price) }}/{{ line.unit_short_name }}</span>
                      <span v-if="line.stock_quantity !== undefined && Number(line.quantity) > line.stock_quantity" class="row-warning">
                        only {{ formatNumber(line.stock_quantity, 3) }} in stock
                      </span>
                    </div>
                  </td>
                  <td>
                    <v-text-field v-model="line.quantity" type="number" min="0" :step="line.is_weighted ? 0.001 : 1" hide-details
                      class="cell-input" :suffix="line.is_weighted ? line.unit_short_name : undefined"
                      @change="normalizeQuantity(line)" @keydown.enter.prevent="normalizeQuantity(line); focusScanner()" />
                  </td>
                  <td class="text-right">{{ formatNumber(line.unit_price, 2) }}</td>
                  <template v-if="canDiscount">
                    <td>
                      <v-text-field v-model="line.discount_percent" type="number" min="0" max="100" hide-details class="cell-input"
                        placeholder="0" @change="normalizeDiscount(line)" @keydown.enter.prevent="focusScanner" />
                    </td>
                    <td>
                      <v-text-field v-model="line.flat_discount" type="number" min="0" hide-details class="cell-input"
                        placeholder="0" @change="normalizeDiscount(line)" @keydown.enter.prevent="focusScanner" />
                    </td>
                  </template>
                  <template v-else>
                    <td class="text-center">{{ formatNumber(line.discount_percent, 2) }}</td>
                    <td class="text-center">{{ formatNumber(line.flat_discount, 2) }}</td>
                  </template>
                  <td class="text-right font-weight-bold">{{ formatNumber(lineNet(line), 2) }}</td>
                  <td class="text-center">
                    <button type="button" class="remove-btn" title="Remove" @click.stop="askRemove(index)"><v-icon size="16">mdi-close</v-icon></button>
                  </td>
                </tr>
                <tr v-if="!cart.length" class="empty-row">
                  <td colspan="9" class="text-center">
                    <v-icon size="64" color="grey-lighten-1">mdi-barcode-scan</v-icon>
                    <div class="text-body-1 font-weight-bold mt-1">Scan the first item to start the bill</div>
                    <div class="text-caption text-lightText">↑ ↓ select a line · + / − change qty · Del removes it · Enter on empty barcode or F9 to pay</div>
                  </td>
                </tr>
              </tbody>
            </v-table>
          </div>

          <div class="desk-group">
            <span class="desk-group__legend">Footer Info</span>
            <div class="footer-info">
              <div><label class="desk-field-label">Lines</label><div class="desk-value">{{ totals.lines }}</div></div>
              <div><label class="desk-field-label">Total Qty</label><div class="desk-value">{{ formatNumber(totals.quantity, 3) }}</div></div>
              <div><label class="desk-field-label">Total Excl. Tax</label><div class="desk-value">{{ formatNumber(totals.excludingTax, 2) }}</div></div>
              <div><label class="desk-field-label">G.S.T Value</label><div class="desk-value">{{ formatNumber(totals.tax, 2) }}</div></div>
              <div><label class="desk-field-label">Total Incl. Tax</label><div class="desk-value">{{ formatNumber(totals.total, 2) }}</div></div>
            </div>
          </div>
        </div>

        <div class="desk-group total-panel">
          <span class="desk-group__legend">Total</span>
          <div class="total-panel__scroll">
            <div class="total-row"><span class="desk-label">Gross Sale</span><div class="desk-value">{{ formatNumber(totals.gross, 2) }}</div></div>
            <div class="total-row"><span class="desk-label">Item Disc</span><div class="desk-value">{{ formatNumber(totals.itemDiscount, 2) }}</div></div>
            <template v-if="canDiscount">
              <div class="total-row">
                <span class="desk-label">Disc %</span>
                <v-text-field v-model="billDiscountPercent" type="number" min="0" max="100" hide-details class="total-input"
                  :disabled="!cart.length" placeholder="0" />
              </div>
              <div class="total-row">
                <span class="desk-label">Flat Disc</span>
                <v-text-field v-model="billFlatDiscount" type="number" min="0" hide-details class="total-input"
                  :disabled="!cart.length" placeholder="0" />
              </div>
            </template>
            <div class="total-row"><span class="desk-label">Total Disc</span><div class="desk-value">{{ formatNumber(totals.totalDiscount, 2) }}</div></div>
            <div class="total-row"><span class="desk-label">{{ totals.inclusive ? 'G.S.T (incl.)' : 'G.S.T' }}</span><div class="desk-value">{{ formatNumber(totals.tax, 2) }}</div></div>

            <div class="net-value">
              <span class="desk-label">Net Value</span>
              <div class="net-value__amount">{{ formatMoney(totals.total) }}</div>
            </div>

            <span class="desk-label d-block mt-2 mb-1">Payment Type</span>
            <div class="pay-types">
              <button v-for="method in paymentMethods" :key="method.value" type="button" class="pay-type"
                :class="{ 'pay-type--active': paymentMethod === method.value }" :title="method.hint" @click="selectPayment(method.value)">
                <v-icon size="22">{{ method.icon }}</v-icon>
                <span>{{ method.value }}</span>
              </button>
            </div>

            <template v-if="isCash">
              <label class="desk-field-label mt-2">Cash Received (F9)</label>
              <v-text-field ref="paymentInput" v-model="cashReceived" type="number" min="0" hide-details class="big-input"
                :prefix="authStore.currencyCode || ''" :placeholder="String(totals.total)" @keydown.enter.prevent="placeOrder" />
              <div v-if="cart.length" class="d-flex flex-wrap ga-1 mt-1">
                <button v-for="value in quickCash" :key="value" type="button" class="desk-btn desk-btn--small" @click="cashReceived = value">
                  {{ formatNumber(value, 0) }}
                </button>
              </div>
            </template>
            <template v-else>
              <label class="desk-field-label mt-2">{{ paymentMethod }} Reference / Txn ID (F9)</label>
              <v-text-field ref="paymentInput" v-model="paymentReference" hide-details class="big-input" placeholder="Optional"
                @keydown.enter.prevent="placeOrder" />
              <p class="text-caption text-lightText mt-1 mb-0">Charge {{ formatMoney(totals.total) }} on the {{ paymentMethod === 'Card' ? 'card machine' : 'online account' }}.</p>
            </template>

            <div class="total-row mt-2">
              <span class="desk-label">{{ due > 0 ? 'Still Due' : 'Cash Back' }}</span>
              <div class="cash-back" :class="{ 'cash-back--due': due > 0 }">{{ formatMoney(due > 0 ? due : change) }}</div>
            </div>

            <v-checkbox v-model="autoPrint" label="Print receipt after saving" hide-details density="compact" color="primary" />
            <button type="button" class="desk-btn desk-btn--success save-btn" :disabled="!cart.length || due > 0 || placing" @click="placeOrder">
              <v-progress-circular v-if="placing" indeterminate size="16" width="2" color="white" />
              <v-icon v-else size="20">mdi-content-save-check-outline</v-icon>Save &amp; Print (F9)
            </button>

            <div v-if="lastSale" class="last-bill" :class="{ 'last-bill--new': justPaid }">
              <div class="d-flex justify-space-between align-center">
                <span class="text-caption">{{ justPaid ? 'Bill saved' : 'Last bill' }}</span>
                <a class="text-primary font-weight-bold cursor-pointer" @click="showReport(lastSale.id)">{{ lastSale.bill_number }}</a>
              </div>
              <div class="d-flex justify-space-between text-caption">
                <span>Total {{ formatMoney(lastSale.total_amount) }}</span>
                <span>{{ paidBy(lastSale) }}</span>
              </div>
              <div v-if="justPaid && lastSale.change_amount > 0" class="text-center">
                <span class="text-caption">Give change </span>
                <span class="give-change">{{ formatMoney(lastSale.change_amount) }}</span>
              </div>
              <div class="d-flex justify-center mt-1">
                <ReceiptButtons ref="receiptButtons" :sale-id="lastSale.id" :bill-number="lastSale.bill_number" variant="button"
                  @printed="lastSale.print_count = (lastSale.print_count || 0) + 1" @error="(error: any) => alerts.fail(error)" />
              </div>
            </div>
          </div>
        </div>

        <div class="function-bar">
          <div class="function-bar__title">Functions</div>
          <button v-for="item in functionKeys" :key="item.label" type="button" class="desk-fn" :class="item.tone" :disabled="item.disabled"
            @click="item.action">
            <v-icon size="22">{{ item.icon }}</v-icon>
            <span class="desk-fn__label">{{ item.label }}</span>
            <span v-if="item.key" class="desk-fn__key">{{ item.key }}</span>
          </button>
        </div>
      </div>

      <div v-if="tab === 'list'" class="pos-list">
        <div class="list-criteria">
          <div class="desk-group">
            <span class="desk-group__legend">Show</span>
            <v-radio-group v-model="billsScope" inline hide-details density="compact" @update:model-value="loadBills">
              <v-radio label="This counter" value="counter" />
              <v-radio label="Date range" value="dates" />
            </v-radio-group>
          </div>
          <div class="desk-group">
            <span class="desk-group__legend">Sort Criteria</span>
            <v-radio-group v-model="billsSort" inline hide-details density="compact" @update:model-value="loadBills">
              <v-radio label="Newest" value="Newest" />
              <v-radio label="Oldest" value="Oldest" />
            </v-radio-group>
          </div>
          <div class="desk-group flex-grow-1">
            <span class="desk-group__legend">Filter Criteria</span>
            <div class="d-flex flex-wrap align-center ga-2">
              <template v-if="billsScope === 'dates'">
                <v-text-field v-model="billsFrom" type="date" hide-details style="max-width: 150px" />
                <span class="text-caption">to</span>
                <v-text-field v-model="billsTo" type="date" hide-details style="max-width: 150px" />
              </template>
              <v-text-field v-model="billsSearch" prepend-inner-icon="mdi-magnify" placeholder="Bill no, party name or phone" hide-details
                style="min-width: 220px" @keydown.enter.prevent="loadBills" />
              <button type="button" class="desk-btn desk-btn--primary" @click="loadBills"><v-icon size="16">mdi-filter-outline</v-icon>Filter</button>
            </div>
          </div>
        </div>

        <div class="d-flex flex-wrap align-center ga-2 my-2">
          <button type="button" class="desk-btn" :disabled="!selectedBill" @click="showReport(selectedBill.id)">
            <v-icon size="16">mdi-file-eye-outline</v-icon>Show Receipt
          </button>
          <ReceiptButtons v-if="selectedBill" :sale-id="selectedBill.id" :bill-number="selectedBill.bill_number" variant="button"
            @error="(error: any) => alerts.fail(error)" />
          <button v-if="canReturn" type="button" class="desk-btn" :disabled="!selectedBill || selectedBill.status === 'Returned'"
            @click="openReturn(selectedBill.id)">
            <v-icon size="16">mdi-keyboard-return</v-icon>Return
          </button>
          <span class="ml-auto text-caption">
            Bills: <strong>{{ bills.length }}</strong> · Total:
            <strong class="text-primary">{{ formatMoney(bills.reduce((sum, bill) => sum + Number(bill.total_amount), 0)) }}</strong>
          </span>
        </div>

        <div class="desk-grid-wrap pos-list__grid">
          <v-progress-linear v-if="billsLoading" indeterminate color="primary" height="2" />
          <v-table fixed-header height="100%" class="pick-table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Party</th>
                <th>Date</th>
                <th class="text-right">Items</th>
                <th class="text-right">Invoice Total</th>
                <th>Paid By</th>
                <th>User</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="bill in bills" :key="bill.id" class="cursor-pointer" :class="{ 'selected-row': selectedBill?.id === bill.id }"
                @click="selectedBill = bill" @dblclick="showReport(bill.id)">
                <td class="font-weight-bold">{{ bill.bill_number }}</td>
                <td class="text-uppercase">{{ bill.customer_name || 'Cash Sale - Walk-in Customer' }}</td>
                <td>{{ formatDateTime(bill.created_at) }}</td>
                <td class="text-right">{{ formatNumber(bill.item_count, 3) }}</td>
                <td class="text-right font-weight-bold">{{ formatNumber(bill.total_amount, 2) }}</td>
                <td>{{ paidBy(bill) }}</td>
                <td class="text-uppercase">{{ bill.cashier?.full_name }}</td>
                <td><StatusChip :status="bill.status" /></td>
              </tr>
              <tr v-if="!bills.length && !billsLoading">
                <td colspan="8" class="text-center text-lightText py-8">No bills found</td>
              </tr>
            </tbody>
          </v-table>
        </div>
        <p class="text-caption text-lightText mt-1 mb-0">Click a bill to select it · double-click to open its receipt</p>
      </div>

      <div v-if="tab === 'report'" class="pos-report">
        <div class="report-toolbar">
          <label class="desk-field-label mb-0">Bill No</label>
          <v-text-field v-model="reportBillNumber" hide-details placeholder="e.g. MAIN-2609-00001" style="max-width: 220px"
            @keydown.enter.prevent="findReport" />
          <button type="button" class="desk-btn" @click="findReport"><v-icon size="16">mdi-magnify</v-icon>Load</button>
          <span class="report-toolbar__sep" />
          <ReceiptButtons v-if="reportSale" :sale-id="reportSale.id" :bill-number="reportSale.bill_number" variant="button"
            @error="(error: any) => alerts.fail(error)" />
          <button v-if="reportSale && canReturn && reportSale.status !== 'Returned'" type="button" class="desk-btn" @click="openReturn(reportSale.id)">
            <v-icon size="16">mdi-keyboard-return</v-icon>Return
          </button>
        </div>
        <div class="report-viewer">
          <v-progress-circular v-if="reportLoading" indeterminate color="primary" class="mt-8" />
          <ReceiptPreview v-else-if="reportSale" :sale="reportSale" />
          <div v-else class="text-center text-lightText mt-8">
            <v-icon size="56">mdi-file-document-outline</v-icon>
            <div>No bill selected. Save a bill or pick one from the List tab.</div>
          </div>
        </div>
      </div>
    </template>
  </section>

  <DeskDialog v-model="findDialog" title="Find Item" icon="mdi-magnify" max-width="880" :persistent="false">
    <div class="d-flex flex-wrap ga-2">
      <v-text-field v-model="findQuery" autofocus prepend-inner-icon="mdi-magnify" placeholder="Item name, SKU or barcode" hide-details
        :loading="findLoading" class="flex-grow-1" @keydown="onFindKeydown" />
      <v-autocomplete v-model="findCategory" :items="categories" item-title="path" item-value="id" clearable placeholder="All categories"
        hide-details style="max-width: 260px; min-width: 200px" />
    </div>
    <p v-if="pendingMultiplier" class="text-caption text-primary mt-2 mb-0">Quantity {{ pendingMultiplier }} will be added.</p>
    <div ref="findTable" class="desk-grid-wrap mt-2">
      <v-table fixed-header height="400" class="pick-table">
        <thead>
          <tr>
            <th>Item Name</th>
            <th>Barcode</th>
            <th>SKU</th>
            <th class="text-right">Sale Price</th>
            <th class="text-right">In Stock</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in findResults" :key="item.id" class="cursor-pointer" :class="{ 'selected-row': index === findIndex }"
            @click="chooseFound(item)" @mouseenter="findIndex = index">
            <td>
              <span class="font-weight-bold text-uppercase">{{ item.product_name }} {{ item.name }}</span>
              <span v-if="item.is_weighted" class="text-caption"> · sold by {{ item.unit_short_name }}</span>
            </td>
            <td>{{ item.barcode || '-' }}</td>
            <td>{{ item.sku }}</td>
            <td class="text-right">{{ formatNumber(item.sale_price, 2) }}<span v-if="item.is_weighted" class="text-caption">/{{ item.unit_short_name }}</span></td>
            <td class="text-right" :class="{ 'text-error font-weight-bold': item.stock_quantity <= 0 }">{{ formatNumber(item.stock_quantity, 3) }} {{ item.stock_unit }}</td>
          </tr>
          <tr v-if="!findResults.length && !findLoading">
            <td colspan="5" class="text-center text-lightText py-8">No items found</td>
          </tr>
        </tbody>
      </v-table>
    </div>
    <template #footer>
      <span class="text-caption mr-auto align-self-center">↑ ↓ move · Enter add · Esc close</span>
      <button type="button" class="desk-btn desk-btn--primary" :disabled="!findResults.length" @click="chooseFound(findResults[findIndex])">Add Item</button>
      <button type="button" class="desk-btn" @click="findDialog = false">Close</button>
    </template>
  </DeskDialog>

  <DeskDialog v-model="weightDialog" :title="weightVariant?.product_name || 'Weight'" icon="mdi-scale" max-width="400">
    <p class="mb-2">{{ formatMoney(weightVariant?.sale_price) }} per {{ weightVariant?.unit_short_name }}. Enter the weight from the scale.</p>
    <v-text-field v-model="weightValue" type="number" min="0" step="0.001" :suffix="weightVariant?.unit_short_name" autofocus hide-details
      class="big-input" @keyup.enter="confirmWeight" />
    <div class="total-row mt-2">
      <span class="desk-label">Amount</span>
      <div class="desk-value">{{ formatMoney((Number(weightValue) || 0) * (weightVariant?.sale_price || 0)) }}</div>
    </div>
    <template #footer>
      <button type="button" class="desk-btn desk-btn--primary" @click="confirmWeight">Add</button>
      <button type="button" class="desk-btn" @click="weightDialog = false; focusScanner()">Cancel</button>
    </template>
  </DeskDialog>

  <DeleteDialog v-model="deleteDialog" message="Remove this item from the bill?" :hint="cart[deleteIndex] ? `${cart[deleteIndex].product_name} · ${cart[deleteIndex].variant_name}` : ''"
    confirm-label="Yes, Remove" @confirm="removeLine" />
  <DeleteDialog v-model="voidDialog" message="Clear the whole bill?" hint="All scanned items will be removed." confirm-label="Yes, Clear" @confirm="voidBill" />

  <DeskDialog v-model="heldDialog" title="Held Bills" icon="mdi-pause-circle-outline" max-width="620" :persistent="false">
    <div class="desk-grid-wrap">
      <v-table>
        <thead>
          <tr><th>Time</th><th>Party</th><th class="text-right">Lines</th><th class="text-right">Total</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="bill in heldBills" :key="bill.id">
            <td>{{ new Date(bill.at).toLocaleTimeString() }}</td>
            <td class="text-uppercase">{{ bill.customerName || 'Walk-in customer' }}</td>
            <td class="text-right">{{ bill.cart.length }}</td>
            <td class="text-right font-weight-bold">{{ formatNumber(bill.total, 2) }}</td>
            <td class="text-right">
              <button type="button" class="desk-btn desk-btn--primary desk-btn--small mr-1" @click="resumeHeld(bill)">Resume</button>
              <button type="button" class="desk-btn desk-btn--small" @click="discardHeld(bill)">Discard</button>
            </td>
          </tr>
          <tr v-if="!heldBills.length">
            <td colspan="5" class="text-center text-lightText py-6">No held bills</td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </DeskDialog>

  <RegisterDialog v-if="session" v-model="registerDialog" :session-id="session.id" @closed="onRegisterClosed" />
  <ReturnDialog v-model="returnDialog" :sale-id="returnSaleId" @returned="onReturned" />
</template>

<style scoped>
.pos-window {
  height: 100%;
  min-height: 620px;
}

.pos-caption-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 600;
  background: #fff;
  border: 1px solid #aeb9c7;
}

.pos-caption-chip--open .v-icon {
  color: #1b7f3b;
}

.open-counter {
  display: flex;
  justify-content: center;
  padding: 40px 16px;
}

.open-counter > .desk-window {
  width: 100%;
  max-width: 440px;
}

.open-counter__info {
  display: grid;
  grid-template-columns: 90px 1fr;
  gap: 6px;
  align-items: center;
}

.pos-detail {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 290px 86px;
  gap: 8px;
  padding: 10px 8px 8px;
}

.pos-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.header-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.scan-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: #fffde7;
  border: 1px solid #e0c95a;
}

.scan-bar__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  color: #9b1c1c;
  white-space: nowrap;
}

.scan-input {
  flex: 1;
}

.scan-input :deep(input),
.big-input :deep(input) {
  font-size: 18px;
  font-weight: 700;
}

.pos-grid {
  flex: 1;
  min-height: 220px;
  overflow: hidden;
}

.bill-table :deep(td) {
  vertical-align: middle;
}

.row-number {
  width: 40px;
  text-align: center;
  font-weight: 700;
  color: #fff !important;
  background: #4a5566 !important;
}

.row-note {
  font-size: 11px;
  color: #5f6b7a;
}

.row-warning {
  color: #c62828;
  font-weight: 700;
  margin-left: 4px;
}

.pick-table tbody tr.selected-row > td {
  background: #2d3a4b !important;
  color: #fff !important;
}

.pick-table tbody tr.selected-row .v-chip {
  background: #fff;
}

.pick-table tbody tr.selected-row .row-note {
  color: #cfd8e3;
}

.pick-table tbody tr.selected-row > td.row-number {
  background: #1565c0 !important;
}

.field-box {
  min-height: 34px;
  display: flex;
  align-items: center;
}

.pos-window :deep(input[type="number"]) {
  -moz-appearance: textfield;
}

.pos-window :deep(input[type="number"]::-webkit-inner-spin-button),
.pos-window :deep(input[type="number"]::-webkit-outer-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}

.empty-row td {
  height: 240px;
  background: #fff !important;
}

.cell-input :deep(.v-field) {
  --v-field-padding-start: 4px;
  --v-field-padding-end: 4px;
}

.cell-input :deep(.v-field__input) {
  min-height: 26px;
  padding-top: 2px;
  padding-bottom: 2px;
  text-align: center;
  font-weight: 700;
}

.cell-input :deep(.v-text-field__suffix) {
  padding-left: 2px;
  font-size: 11px;
}

.remove-btn {
  width: 22px;
  height: 22px;
  border-radius: 2px;
  color: #c62828;
  background: #fdecea;
  border: 1px solid #e8a3a3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.footer-info {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.total-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-right: 2px;
}

.total-panel__scroll {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.total-panel__scroll > * {
  flex: none;
}

.total-row {
  display: grid;
  grid-template-columns: 96px 1fr;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}

.total-input :deep(input) {
  text-align: right;
  font-weight: 700;
}

.net-value {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #9faab8;
}

.net-value__amount {
  margin-top: 2px;
  padding: 6px 8px;
  text-align: right;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.1;
  color: #0d47a1;
  background: #fffde7;
  border: 2px solid #0f3460;
  font-variant-numeric: tabular-nums;
}

.pay-types {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.pay-type {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 2px;
  font-size: 12px;
  font-weight: 700;
  color: #1f2630;
  border: 1px solid #8795a8;
  border-radius: 3px;
  background: linear-gradient(180deg, #fdfdfe 0%, #e3e8ef 100%);
  cursor: pointer;
}

.pay-type .v-icon {
  color: #1565c0;
}

.pay-type--active {
  color: #fff;
  border-color: #0d4a94;
  background: linear-gradient(180deg, #2a7bd6 0%, #1256a8 100%);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

.pay-type--active .v-icon {
  color: #fff;
}

.cash-back {
  padding: 2px 8px;
  text-align: right;
  font-size: 20px;
  font-weight: 800;
  color: #1b7f3b;
  background: #fff;
  border: 1px solid #9faab8;
}

.cash-back--due {
  color: #c62828;
}

.save-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  margin-top: 2px;
}

.last-bill {
  margin-top: 8px;
  padding: 6px 8px;
  background: #fff;
  border: 1px solid #c3ccd8;
}

.last-bill--new {
  background: #e8f5e9;
  border-color: #1b7f3b;
}

.give-change {
  font-size: 20px;
  font-weight: 800;
  color: #1b7f3b;
}

.function-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  min-height: 0;
}

.function-bar__title {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #0f3460;
}

.pos-list,
.pos-report {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 8px 8px;
}

.list-criteria {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pos-list__grid {
  flex: 1;
  min-height: 240px;
  overflow: hidden;
  position: relative;
}

.report-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: #f4f6f9;
  border: 1px solid #c3ccd8;
}

.report-toolbar__sep {
  width: 1px;
  height: 24px;
  background: #c3ccd8;
  margin: 0 4px;
}

.report-viewer {
  flex: 1;
  min-height: 300px;
  overflow: auto;
  padding: 16px;
  text-align: center;
  background: #8a96a6;
  border: 1px solid #6f7b8b;
  border-top: none;
}

@media (max-width: 1279px) {
  .pos-window {
    height: auto;
  }

  .pos-detail {
    grid-template-columns: minmax(0, 1fr) 280px;
  }

  .pos-grid {
    min-height: 360px;
  }

  .function-bar {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  }

  .function-bar__title {
    display: none;
  }
}

@media (max-width: 959px) {
  .pos-detail {
    grid-template-columns: 1fr;
  }

  .footer-info {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
