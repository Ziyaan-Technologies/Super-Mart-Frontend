<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RouterView } from 'vue-router';
import BranchSwitcher from './BranchSwitcher.vue';
import UserMenu from './UserMenu.vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const now = ref(new Date());
const isFullscreen = ref(false);
let timer: ReturnType<typeof setInterval> | undefined;

const clock = computed(() => now.value.toLocaleString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }));

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => undefined);
    } else {
        document.exitFullscreen();
    }
}

function updateFullscreen() {
    isFullscreen.value = !!document.fullscreenElement;
}

onMounted(() => {
    timer = setInterval(() => (now.value = new Date()), 15000);
    document.addEventListener('fullscreenchange', updateFullscreen);
});

onBeforeUnmount(() => {
    clearInterval(timer);
    document.removeEventListener('fullscreenchange', updateFullscreen);
});
</script>

<template>
    <v-locale-provider>
        <v-app>
            <div class="desk-app">
                <header class="desk-titlebar">
                    <div class="desk-titlebar__brand">
                        <v-icon size="20">mdi-storefront</v-icon>
                        <span>SUPER MART</span>
                    </div>
                    <span class="desk-titlebar__business">{{ authStore.client?.vendor?.business_name }}</span>
                    <BranchSwitcher dark />
                    <span class="desk-titlebar__spacer" />
                    <span v-if="authStore.roleName" class="desk-role">{{ authStore.roleName }}</span>
                    <button class="desk-titlebar__item" :title="isFullscreen ? 'Exit full screen' : 'Full screen'" @click="toggleFullscreen">
                        <v-icon size="18">{{ isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen' }}</v-icon>
                    </button>
                    <UserMenu dark />
                </header>
                <main class="desk-content">
                    <RouterView />
                </main>
                <footer class="desk-statusbar">
                    <span>User: <strong>{{ authStore.client?.full_name }}</strong></span>
                    <span class="desk-hide-sm">Role: {{ authStore.roleName || '-' }}</span>
                    <span>Branch: {{ authStore.storeName || 'Not selected' }}</span>
                    <span class="desk-statusbar__spacer" />
                    <span class="desk-hide-sm">Ready</span>
                    <span>{{ clock }}</span>
                </footer>
            </div>
        </v-app>
    </v-locale-provider>
</template>
