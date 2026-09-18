<script setup>
const props = defineProps({
    title: String,
    subtitle: String,
    breadcrumbs: Array,
    icon: String,
    text: String,
});
</script>

<template>
    <div class="page-breadcrumb mt-3 mb-4">
        <div class="d-flex justify-space-between">
            <div class="d-flex py-0 align-center">
                <div>
                    <v-breadcrumbs :items="breadcrumbs" class="text-h6 font-weight-regular pa-0 ml-n1" v-if="breadcrumbs && breadcrumbs.length">
                        <template v-slot:divider>
                            <v-icon>mdi-chevron-right</v-icon>
                        </template>
                        <template v-slot:item="{ item }">
                            <li class="v-breadcrumbs-item d-inline-flex align-center" v-if="!item.disabled && !(item.href?.includes('#') || item.href == '' || !item.href)">
                                <router-link class="v-breadcrumbs-item--link d-inline-flex align-center" :to="item.href">
                                    <v-icon v-if="item.icon || item.text === 'Dashboard' || item.text === 'Home'" size="18" class="mr-1">
                                        {{ item.icon || 'mdi-home-outline' }}
                                    </v-icon>
                                    <h6 v-if="(item.text || item.title) && item.text !== 'Dashboard' && item.text !== 'Home'" class="text-h6">
                                        {{ item.text || item.title }}
                                    </h6>
                                </router-link>
                            </li>
                            <li class="v-breadcrumbs-item d-inline-flex align-center" v-else-if="!item.disabled">
                                <v-icon v-if="item.icon || item.text === 'Dashboard' || item.text === 'Home'" size="18" class="mr-1">
                                    {{ item.icon || 'mdi-home-outline' }}
                                </v-icon>
                                <h6 v-if="(item.text || item.title) && item.text !== 'Dashboard' && item.text !== 'Home'" class="text-h6">
                                    {{ item.text || item.title }}
                                </h6>
                            </li>
                            <li class="v-breadcrumbs-item v-breadcrumbs-item--disabled d-inline-flex align-center" v-if="item.disabled">
                                <v-icon v-if="item.icon || item.text === 'Dashboard' || item.text === 'Home'" size="18" class="mr-1">
                                    {{ item.icon || 'mdi-home-outline' }}
                                </v-icon>
                                <h6 v-if="(item.text || item.title) && item.text !== 'Dashboard' && item.text !== 'Home'" class="text-h6">
                                    {{ item.text || item.title }}
                                </h6>
                            </li>
                        </template>
                    </v-breadcrumbs>
                    <h3 v-if="title" class="text-h3 mb-2">{{ title }}</h3>
                    <p v-if="subtitle" class="page-breadcrumb__subtitle">{{ subtitle }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
.page-breadcrumb {
    .v-toolbar {
        background: transparent;
    }

    .v-breadcrumbs,
    .v-breadcrumbs-item,
    .v-breadcrumbs-item--link,
    .v-breadcrumbs-item h6,
    .v-icon {
        color: #5b12d8;
    }

    h3 {
        color: #111111;
    }

    .page-breadcrumb__subtitle {
        color: #8a8d93;
        font-size: 15px;
        margin: 0;
    }
}
</style>
