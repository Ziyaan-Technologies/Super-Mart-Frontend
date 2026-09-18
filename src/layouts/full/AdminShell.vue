<script setup lang="ts">
import { ref } from 'vue';
import { RouterView } from 'vue-router';
import { useDisplay } from 'vuetify';
import AppSidebar from './AppSidebar.vue';
import PageHeader from './PageHeader.vue';
import BranchSwitcher from './BranchSwitcher.vue';
import UserMenu from './UserMenu.vue';

const { mobile } = useDisplay();
const drawer = ref(true);
const mini = ref(false);
const isFullscreen = ref(false);

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => undefined);
  } else {
    document.exitFullscreen();
  }
  isFullscreen.value = !document.fullscreenElement;
}
</script>

<template>
  <v-locale-provider>
    <v-app :class="mini ? 'mini-sidebar' : ''">
      <AppSidebar v-model="drawer" :mini="mini" @toggle-mini="mini = !mini" />

      <v-app-bar height="70" elevation="0" id="top" class="border-bottom">
        <v-btn icon variant="text" color="primary" @click="mobile ? (drawer = !drawer) : (mini = !mini)">
          <v-icon>mdi-menu</v-icon>
        </v-btn>
        <BranchSwitcher class="ms-2" />
        <v-spacer />
        <v-btn icon variant="text" color="primary" class="mr-1" @click="toggleFullscreen">
          <v-icon>{{ isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen' }}</v-icon>
        </v-btn>
        <UserMenu />
      </v-app-bar>

      <v-main>
        <v-container fluid class="page-wrapper">
          <PageHeader />
          <RouterView />
        </v-container>
      </v-main>
    </v-app>
  </v-locale-provider>
</template>
