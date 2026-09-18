import { computed, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import { downloadExport } from '@/utils/api';
import { useAuthStore } from '@/stores/auth';

interface ListPageOptions {
    filters?: () => Record<string, any>;
    kpis?: boolean;
    exportName?: string;
    listPath?: string;
    immediate?: boolean;
    storeScoped?: boolean;
    onError?: (error: any) => void;
}

export function useListPage(resource: string, options: ListPageOptions = {}) {
    const authStore = useAuthStore();
    const items = ref<any[]>([]);
    const kpis = ref<Record<string, any>>({});
    const loading = ref(false);
    const exporting = ref<string | null>(null);
    const totalItems = ref(0);
    const currentPage = ref(1);
    const itemsPerPage = ref(10);
    const search = ref('');

    const pageCount = computed(() => Math.max(1, Math.ceil(totalItems.value / itemsPerPage.value)));

    const itemsPerPageInput = computed({
        get: () => itemsPerPage.value.toString(),
        set: (value: string) => {
            const parsed = parseInt(value, 10);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
                itemsPerPage.value = parsed;
            }
        },
    });

    const payload = () => ({
        page: currentPage.value,
        take: itemsPerPage.value,
        search: search.value || undefined,
        ...(options.storeScoped ? { clientstore_id: authStore.clientstoreId || undefined } : {}),
        ...(options.filters ? options.filters() : {}),
    });

    async function fetchData() {
        loading.value = true;
        try {
            const response = await axios.post(options.listPath || `${resource}/v1/list`, payload());
            items.value = response.data.data;
            totalItems.value = response.data.meta?.total || 0;
        } catch (error) {
            options.onError?.(error);
            console.error('Failed to fetch data', error);
        } finally {
            loading.value = false;
        }
    }

    async function fetchKpis() {
        if (options.kpis === false) {
            return;
        }
        try {
            const response = await axios.post(`${resource}/v1/kpis`, payload());
            kpis.value = response.data;
        } catch (error) {
            console.error('Failed to fetch KPIs', error);
        }
    }

    function refresh() {
        fetchData();
        fetchKpis();
    }

    function reload() {
        if (currentPage.value === 1) {
            refresh();
        } else {
            currentPage.value = 1;
            fetchKpis();
        }
    }

    function onSearch(key: string) {
        search.value = key;
        reload();
    }

    async function exportFile(format: 'excel' | 'pdf') {
        exporting.value = format;
        try {
            await downloadExport(`${resource}/export/${format}`, { ...payload(), page: 1 }, `${options.exportName || resource}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
        } catch (error) {
            options.onError?.(error);
        } finally {
            exporting.value = null;
        }
    }

    watch([currentPage, itemsPerPage], () => fetchData());

    if (options.storeScoped) {
        watch(() => authStore.clientstoreId, () => reload());
    }

    if (options.immediate !== false) {
        onMounted(refresh);
    }

    return {
        items,
        kpis,
        loading,
        exporting,
        totalItems,
        currentPage,
        itemsPerPage,
        itemsPerPageInput,
        pageCount,
        search,
        payload,
        fetchData,
        fetchKpis,
        refresh,
        reload,
        onSearch,
        exportFile,
    };
}
