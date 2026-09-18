import { defineStore } from 'pinia';
import { router } from '@/router';
import axios from 'axios';
import { computed, ref } from 'vue';

const readJson = (key: string) => {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (error) {
        return null;
    }
};

export const useAuthStore = defineStore('auth', () => {
    const jwt = ref<string | null>(localStorage.getItem('jwt'));
    const client = ref<any>(readJson('client'));
    const vendorId = ref<number | null>(readJson('vendorId'));
    const clientstoreId = ref<number | null>(readJson('clientstoreId'));
    const storeName = ref<string | null>(readJson('storeName'));
    const clientstore = ref<any>(readJson('clientstore'));
    const country = ref<any>(readJson('country'));
    const currencyCode = ref<string | null>(readJson('currencyCode'));
    const returnUrl = ref<string | null>(null);

    const isOwner = computed(() => client.value?.client_type === 'Owner');
    const isStoreBound = computed(() => !!client.value?.clientstore_id);
    const roleName = computed(() => client.value?.role?.name || '');

    function saveClient(clientData: any) {
        client.value = clientData;
        vendorId.value = clientData.vendor_id;
        country.value = clientData.vendor?.country || clientData.country || null;
        currencyCode.value = country.value?.currency_symbol || country.value?.currency_short_name || '';
        localStorage.setItem('client', JSON.stringify(clientData));
        localStorage.setItem('userObject', JSON.stringify(clientData));
        localStorage.setItem('vendorId', JSON.stringify(clientData.vendor_id));
        localStorage.setItem('country', JSON.stringify(country.value));
        localStorage.setItem('currencyCode', JSON.stringify(currencyCode.value));
    }

    async function login(email: string, password: string) {
        const response = await axios.post(`client/login`, { email, password });
        const { token, client: clientData } = response.data;

        jwt.value = token;
        localStorage.setItem('jwt', token);
        saveClient(clientData);

        if (clientData.clientstore_id) {
            await storeLogin(clientData.clientstore_id, clientData.clientstore?.store_name, true);
        } else {
            clearStore();
        }

        localStorage.removeItem('permissions');
        await (window as any).$app.config.globalProperties.$getAbilities(true);

        router.push(returnUrl.value || '/');
        returnUrl.value = null;
    }

    async function refreshClient() {
        if (!jwt.value) return;
        const response = await axios.get('auth/me');
        saveClient(response.data);
    }

    function clearStore() {
        clientstore.value = null;
        clientstoreId.value = null;
        storeName.value = null;
        localStorage.removeItem('clientstoreId');
        localStorage.removeItem('storeName');
        localStorage.removeItem('clientstore');
    }

    async function storeLogin(store_id: number, store_name: string, noRedirect: boolean = false) {
        if (client.value?.clientstore_id && client.value.clientstore_id !== store_id) {
            return;
        }
        const response = await axios.get(`clientstores/${store_id}`);
        clientstore.value = response.data;
        clientstoreId.value = store_id;
        storeName.value = store_name || response.data.store_name;

        localStorage.setItem('clientstore', JSON.stringify(response.data));
        localStorage.setItem('clientstoreId', JSON.stringify(store_id));
        localStorage.setItem('storeName', JSON.stringify(storeName.value));

        if (!noRedirect) {
            router.push('/');
        }
    }

    async function logout(callApi: boolean = true) {
        if (callApi && jwt.value) {
            try {
                await axios.delete(`auth/logout`);
            } catch (error) {
                console.error('Logout request failed', error);
            }
        }
        jwt.value = null;
        client.value = null;
        vendorId.value = null;
        country.value = null;
        currencyCode.value = null;
        clearStore();
        localStorage.clear();
        await (window as any).$app?.config.globalProperties.$getAbilities(true);
        router.push({ name: 'Login' });
    }

    return {
        jwt,
        client,
        vendorId,
        clientstoreId,
        storeName,
        clientstore,
        country,
        currencyCode,
        returnUrl,
        isOwner,
        isStoreBound,
        roleName,
        login,
        refreshClient,
        storeLogin,
        clearStore,
        logout,
    };
});
