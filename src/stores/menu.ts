import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

export interface MenuItem {
  title: string;
  icon: string;
  to: string;
  action?: string;
  subject?: string;
}

export interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export const useMenuStore = defineStore('menu', () => {
  const authStore = useAuthStore();

  const groups = computed<MenuGroup[]>(() => {
    if (!authStore.client) {
      return [];
    }

    if (!authStore.clientstoreId) {
      return [
        {
          title: 'Setup',
          items: [
            { title: 'Summary', icon: 'mdi-view-dashboard-outline', to: '/dashboard/analytical', action: 'home_view', subject: 'Home' },
            { title: 'Branches', icon: 'mdi-store-outline', to: '/store', action: 'store_view', subject: 'Store' },
            { title: 'Banks', icon: 'mdi-bank-outline', to: '/banks', action: 'banks_view', subject: 'Bank' },
          ],
        },
      ];
    }

    const posActive = authStore.clientstore?.is_pos_active !== false;

    return [
      {
        title: 'Sale',
        items: [
          { title: 'Summary', icon: 'mdi-view-dashboard-outline', to: '/dashboard/analytical', action: 'home_view', subject: 'Home' },
          ...(posActive ? [{ title: 'Sale Counter', icon: 'mdi-cash-register', to: '/pos', action: 'pos_sell', subject: 'POS' }] : []),
          { title: 'Sales List', icon: 'mdi-receipt-text-outline', to: '/sales', action: 'sales_view', subject: 'Sales' },
          { title: 'Counters', icon: 'mdi-counter', to: '/registers', action: 'pos_manage', subject: 'POS' },
        ],
      },
      {
        title: 'Stock',
        items: [
          { title: 'Stock', icon: 'mdi-warehouse', to: '/stock', action: 'stock_view', subject: 'Stock' },
          { title: 'Stock In', icon: 'mdi-truck-delivery-outline', to: '/goods-receipts', action: 'goods_receipts_view', subject: 'Goods Receipt' },
          { title: 'Purchase Orders', icon: 'mdi-clipboard-text-outline', to: '/purchase-orders', action: 'purchase_orders_view', subject: 'Purchase Order' },
          { title: 'Opening Stock', icon: 'mdi-archive-arrow-down-outline', to: '/stock/opening', action: 'stock_opening', subject: 'Stock' },
          { title: 'Transfers', icon: 'mdi-swap-horizontal-bold', to: '/stock-transfers', action: 'stock_transfers_view', subject: 'Stock Transfer' },
          { title: 'Adjustments', icon: 'mdi-scale-balance', to: '/stock-adjustments', action: 'stock_adjustments_view', subject: 'Stock Adjustment' },
          { title: 'Stock Ledger', icon: 'mdi-book-open-page-variant-outline', to: '/stock/movements', action: 'stock_view', subject: 'Stock' },
        ],
      },
      {
        title: 'Items',
        items: [
          { title: 'Products', icon: 'mdi-package-variant-closed', to: '/products', action: 'products_view', subject: 'Product' },
          { title: 'Categories', icon: 'mdi-shape-outline', to: '/categories', action: 'categories_view', subject: 'Category' },
          { title: 'Brands', icon: 'mdi-tag-multiple-outline', to: '/brands', action: 'brands_view', subject: 'Brand' },
          { title: 'Taxes', icon: 'mdi-percent-outline', to: '/taxes', action: 'taxes_view', subject: 'Tax' },
        ],
      },
      {
        title: 'Party',
        items: [
          { title: 'Customers', icon: 'mdi-account-group-outline', to: '/customers', action: 'customers_view', subject: 'Customers' },
          { title: 'Suppliers', icon: 'mdi-truck-outline', to: '/suppliers', action: 'suppliers_view', subject: 'Supplier' },
        ],
      },
      {
        title: 'Setup',
        items: [
          { title: 'Users', icon: 'mdi-account-key-outline', to: '/users', action: 'supervisor_view', subject: 'Supervisor' },
          { title: 'Branches', icon: 'mdi-store-outline', to: '/store', action: 'store_view', subject: 'Store' },
          { title: 'Banks', icon: 'mdi-bank-outline', to: '/banks', action: 'banks_view', subject: 'Bank' },
          { title: 'Business', icon: 'mdi-cog-outline', to: '/business-settings', action: 'store_edit', subject: 'Store' },
        ],
      },
    ];
  });

  return { groups };
});
