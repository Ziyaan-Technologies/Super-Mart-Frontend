import { computed, ref } from 'vue';
import axios from 'axios';

export const WAREHOUSE = 'Warehouse';

// The vendor's Warehouse (where purchases land) and Mart (where sales happen).
// Stores saved without a type count as a Mart.
const stores = ref<any[]>([]);
let loading: Promise<void> | null = null;

export function useLocations() {
    const warehouse = computed(() => stores.value.find((store) => store.store_type === WAREHOUSE) || null);
    const mart = computed(() => stores.value.find((store) => store.store_type !== WAREHOUSE) || null);
    const hasWarehouse = computed(() => !!warehouse.value);

    const loadLocations = (force = false) => {
        if (!loading || force) {
            loading = axios.get('clientstores/directory')
                .then((response) => { stores.value = response.data; })
                .catch(() => { loading = null; });
        }
        return loading;
    };

    return { stores, warehouse, mart, hasWarehouse, loadLocations };
}
