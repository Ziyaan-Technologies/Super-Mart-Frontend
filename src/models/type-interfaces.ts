export interface Header {
    title: string;
    key: string;
    align?: 'start' | 'end' | 'center';
    sortable?: boolean;
    width?: string | number;
}

export interface Country {
    id: number;
    name: string;
    currency_short_name?: string;
    currency_symbol?: string;
}

export interface Clientstore {
    id: number;
    store_name: string;
    store_code: string;
    is_pos_active?: boolean;
    is_active?: boolean;
    city?: { id: number; name: string };
    address?: string;
}

export interface Permission {
    id: number;
    name: string;
    permission_key: string;
    module_name: string;
}

export interface Role {
    id: number;
    name: string;
    is_system?: boolean;
    permissions?: Permission[];
}

export interface CartLine {
    product_variant_id: number;
    product_name: string;
    variant_name: string;
    sku: string;
    barcode?: string | null;
    image_url?: string | null;
    unit_price: number;
    quantity: number;
    discount_percent: number | string;
    flat_discount: number | string;
    tax_rate: number;
    price_includes_tax: boolean;
    is_weighted: boolean;
    unit_short_name?: string;
    stock_quantity?: number;
}
