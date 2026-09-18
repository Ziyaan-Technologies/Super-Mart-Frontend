import { createVuetify } from 'vuetify';
import '@mdi/font/css/materialdesignicons.css';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
//DragScroll
import { VueDraggableNext } from 'vue-draggable-next'
import { VDateInput } from 'vuetify/labs/VDateInput'

import { BLUE_THEME } from '@/theme/LightTheme';

export default createVuetify({
    components: {
        draggable: VueDraggableNext,
        VDateInput
    },
    directives,

    theme: {
        defaultTheme: 'BLUE_THEME',
        themes: {
            BLUE_THEME,
        }
    },
    defaults: {
        VCard: {
            rounded: 'md'
        },
        VTextField: {
            variant: 'outlined',
            density: 'comfortable',
            color: 'primary'
        },
        VTextarea: {
            variant: 'outlined',
            density: 'comfortable',
            color: 'primary'
        },
        VSelect: {
            variant: 'outlined',
            density: 'comfortable',
            color: 'primary'
        },
        VAutocomplete: {
            variant: 'outlined',
            density: 'comfortable',
            color: 'primary'
        },
        VListItem: {
            minHeight: '45px'
        },
        VTooltip: {
            location: 'top'
        }
    }
});
