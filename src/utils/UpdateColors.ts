import { computed } from 'vue';
import { BLUE_THEME } from '@/theme/LightTheme';

const getPrimary = computed(() => {
    return BLUE_THEME.colors.primary;
});

const getLightPrimary = computed(() => {
    return BLUE_THEME.colors.secondary;
});

const getSecondary = computed(() => {
    return BLUE_THEME.colors.lightprimary;
});

const getLightSecondary = computed(() => {
    return BLUE_THEME.colors.lightsecondary;
});

const getLight100 = computed(() => {
    return BLUE_THEME.colors.grey100;
});

export { getPrimary, getSecondary, getLightPrimary, getLightSecondary, getLight100 };
