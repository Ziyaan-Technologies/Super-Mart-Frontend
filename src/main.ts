import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import vuetify from './plugins/vuetify';
import '@/scss/style.scss';
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar';
import VueApexCharts from 'vue3-apexcharts';
import VueTablerIcons from 'vue-tabler-icons';
import { vMaska } from "maska/vue";
import CaslPlugin from '../src/plugins/casl'
import VueScrollTo from 'vue-scrollto';
import axios from 'axios';
import { useAuthStore } from './stores/auth';

axios.defaults.baseURL = import.meta.env.VITE_API_URL;
axios.defaults.headers.common['Cache-Control'] = 'no-cache';
axios.defaults.headers.common['Pragma'] = 'no-cache';

axios.interceptors.request.use((config) => {
    const authStore = useAuthStore();
    const token = authStore.jwt;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axios.interceptors.response.use(
    response => response,
    error => {
        const authStore = useAuthStore();
        if (error.response?.status === 401 && authStore.jwt) {
            authStore.logout(false);
        }
        return Promise.reject(error);
    }
);

const app = createApp(App).directive("maska", vMaska);
app.use(createPinia());
app.use(router);
app.use(PerfectScrollbarPlugin);
app.use(VueTablerIcons);
app.use(VueApexCharts);
app.use(vuetify);
app.use(CaslPlugin);

(window as any).$app = app;

app.mount('#app');

app.use(VueScrollTo, {
    duration: 1000,
    easing: "ease"
})
