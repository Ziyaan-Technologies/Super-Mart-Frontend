const MainRoutes = {
    path: '/main',
    meta: {
        requiresAuth: true
    },
    redirect: '/main',
    component: () => import('@/layouts/full/FullLayout.vue'),
    children: [
        {
            path: '/',
            redirect: '/dashboard/analytical'
        },
        {
            name: 'UpdateProfile',
            path: '/profile/update-details',
            component: () => import('@/views/profile/Profile.vue')
        },
        {
            name: 'UpdatePassword',
            path: '/auth/update-password',
            component: () => import('@/views/profile/BoxedUpdatePassword.vue')
        },
        {
            name: 'Dashboard',
            path: '/dashboard/analytical',
            component: () => import('@/views/dashboard/analytical/Analytical.vue'),
            meta: {
                requiresAuth: true,
                action: ['home_view'],
                subject: 'Home'
            }
        },
        {
            name: 'Pos',
            path: '/pos',
            component: () => import('@/views/modules/pos/Pos.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                requiresPOSModule: true,
                action: ['pos_sell'],
                subject: 'POS'
            }
        },
        {
            name: 'Sales',
            path: '/sales',
            component: () => import('@/views/modules/sales/Sales.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['sales_view'],
                subject: 'Sales'
            }
        },
        {
            name: 'SaleDetail',
            path: '/sales/:id',
            component: () => import('@/views/modules/sales/SaleDetail.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['sales_view'],
                subject: 'Sales'
            }
        },
        {
            name: 'Registers',
            path: '/registers',
            component: () => import('@/views/modules/register/Registers.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['pos_manage'],
                subject: 'POS'
            }
        },
        {
            name: 'Stock',
            path: '/stock',
            component: () => import('@/views/modules/stock/Stock.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['stock_view'],
                subject: 'Stock'
            }
        },
        {
            name: 'StockMovements',
            path: '/stock/movements',
            component: () => import('@/views/modules/stock/StockMovements.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['stock_view'],
                subject: 'Stock'
            }
        },
        {
            name: 'OpeningStock',
            path: '/stock/opening',
            component: () => import('@/views/modules/stock/OpeningStock.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['stock_opening'],
                subject: 'Stock'
            }
        },
        {
            name: 'PurchaseOrders',
            path: '/purchase-orders',
            component: () => import('@/views/modules/purchase-order/PurchaseOrder.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['purchase_orders_view'],
                subject: 'Purchase Order'
            }
        },
        {
            name: 'PurchaseOrderCreate',
            path: '/purchase-orders/create',
            component: () => import('@/views/modules/purchase-order/PurchaseOrderForm.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['purchase_orders_create'],
                subject: 'Purchase Order'
            }
        },
        {
            name: 'PurchaseOrderEdit',
            path: '/purchase-orders/:id/edit',
            component: () => import('@/views/modules/purchase-order/PurchaseOrderForm.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['purchase_orders_edit'],
                subject: 'Purchase Order'
            }
        },
        {
            name: 'PurchaseOrderDetail',
            path: '/purchase-orders/:id',
            component: () => import('@/views/modules/purchase-order/PurchaseOrderDetail.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['purchase_orders_view'],
                subject: 'Purchase Order'
            }
        },
        {
            name: 'GoodsReceipts',
            path: '/goods-receipts',
            component: () => import('@/views/modules/goods-receipt/GoodsReceipt.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['goods_receipts_view'],
                subject: 'Goods Receipt'
            }
        },
        {
            name: 'GoodsReceiptCreate',
            path: '/goods-receipts/create',
            component: () => import('@/views/modules/goods-receipt/GoodsReceiptForm.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['goods_receipts_create'],
                subject: 'Goods Receipt'
            }
        },
        {
            name: 'GoodsReceiptEdit',
            path: '/goods-receipts/:id/edit',
            component: () => import('@/views/modules/goods-receipt/GoodsReceiptForm.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['goods_receipts_edit'],
                subject: 'Goods Receipt'
            }
        },
        {
            name: 'GoodsReceiptDetail',
            path: '/goods-receipts/:id',
            component: () => import('@/views/modules/goods-receipt/GoodsReceiptDetail.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['goods_receipts_view'],
                subject: 'Goods Receipt'
            }
        },
        {
            name: 'StockTransfers',
            path: '/stock-transfers',
            component: () => import('@/views/modules/stock-transfer/StockTransfer.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['stock_transfers_view'],
                subject: 'Stock Transfer'
            }
        },
        {
            name: 'StockTransferCreate',
            path: '/stock-transfers/create',
            component: () => import('@/views/modules/stock-transfer/StockTransferForm.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['stock_transfers_create'],
                subject: 'Stock Transfer'
            }
        },
        {
            name: 'StockTransferEdit',
            path: '/stock-transfers/:id/edit',
            component: () => import('@/views/modules/stock-transfer/StockTransferForm.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['stock_transfers_edit'],
                subject: 'Stock Transfer'
            }
        },
        {
            name: 'StockTransferDetail',
            path: '/stock-transfers/:id',
            component: () => import('@/views/modules/stock-transfer/StockTransferDetail.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['stock_transfers_view'],
                subject: 'Stock Transfer'
            }
        },
        {
            name: 'StockAdjustments',
            path: '/stock-adjustments',
            component: () => import('@/views/modules/stock-adjustment/StockAdjustment.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['stock_adjustments_view'],
                subject: 'Stock Adjustment'
            }
        },
        {
            name: 'StockAdjustmentCreate',
            path: '/stock-adjustments/create',
            component: () => import('@/views/modules/stock-adjustment/StockAdjustmentForm.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['stock_adjustments_create'],
                subject: 'Stock Adjustment'
            }
        },
        {
            name: 'StockAdjustmentEdit',
            path: '/stock-adjustments/:id/edit',
            component: () => import('@/views/modules/stock-adjustment/StockAdjustmentForm.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['stock_adjustments_edit'],
                subject: 'Stock Adjustment'
            }
        },
        {
            name: 'StockAdjustmentDetail',
            path: '/stock-adjustments/:id',
            component: () => import('@/views/modules/stock-adjustment/StockAdjustmentDetail.vue'),
            meta: {
                requiresAuth: true,
                requiresStore: true,
                action: ['stock_adjustments_view'],
                subject: 'Stock Adjustment'
            }
        },
        {
            name: 'Products',
            path: '/products',
            component: () => import('@/views/modules/product/Product.vue'),
            meta: {
                requiresAuth: true,
                action: ['products_view'],
                subject: 'Product'
            }
        },
        {
            name: 'ProductCreate',
            path: '/products/create',
            component: () => import('@/views/modules/product/ProductForm.vue'),
            meta: {
                requiresAuth: true,
                action: ['products_create'],
                subject: 'Product'
            }
        },
        {
            name: 'ProductEdit',
            path: '/products/:id/edit',
            component: () => import('@/views/modules/product/ProductForm.vue'),
            meta: {
                requiresAuth: true,
                action: ['products_edit'],
                subject: 'Product'
            }
        },
        {
            name: 'Categories',
            path: '/categories',
            component: () => import('@/views/modules/category/Category.vue'),
            meta: {
                requiresAuth: true,
                action: ['categories_view'],
                subject: 'Category'
            }
        },
        {
            name: 'Brands',
            path: '/brands',
            component: () => import('@/views/modules/brand/Brand.vue'),
            meta: {
                requiresAuth: true,
                action: ['brands_view'],
                subject: 'Brand'
            }
        },
        {
            name: 'Taxes',
            path: '/taxes',
            component: () => import('@/views/modules/tax/Tax.vue'),
            meta: {
                requiresAuth: true,
                action: ['taxes_view'],
                subject: 'Tax'
            }
        },
        {
            name: 'Banks',
            path: '/banks',
            component: () => import('@/views/modules/bank/Bank.vue'),
            meta: {
                requiresAuth: true,
                action: ['banks_view'],
                subject: 'Bank'
            }
        },
        {
            name: 'Suppliers',
            path: '/suppliers',
            component: () => import('@/views/modules/supplier/Supplier.vue'),
            meta: {
                requiresAuth: true,
                action: ['suppliers_view'],
                subject: 'Supplier'
            }
        },
        {
            name: 'Customers',
            path: '/customers',
            component: () => import('@/views/modules/customer/Customer.vue'),
            meta: {
                requiresAuth: true,
                action: ['customers_view'],
                subject: 'Customers'
            }
        },
        {
            name: 'Users',
            path: '/users',
            component: () => import('@/views/modules/supervisor/Supervisor.vue'),
            meta: {
                requiresAuth: true,
                action: ['supervisor_view'],
                subject: 'Supervisor'
            }
        },
        {
            name: 'Store',
            path: '/store',
            component: () => import('@/views/modules/store/Store.vue'),
            meta: {
                requiresAuth: true,
                action: ['store_view'],
                subject: 'Store'
            }
        },
        {
            name: 'BusinessSettings',
            path: '/business-settings',
            component: () => import('@/views/modules/business/BusinessSettings.vue'),
            meta: {
                requiresAuth: true,
                action: ['store_edit'],
                subject: 'Store'
            }
        },
    ]
};

export default MainRoutes;
