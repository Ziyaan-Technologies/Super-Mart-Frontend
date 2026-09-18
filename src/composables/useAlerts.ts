import { ref } from 'vue';
import { apiError } from '@/utils/api';

export function useAlerts() {
    const showAlert = ref(false);
    const alertText = ref('');
    const showErrorAlert = ref(false);
    const errorText = ref('');
    let successTimer: ReturnType<typeof setTimeout> | undefined;
    let errorTimer: ReturnType<typeof setTimeout> | undefined;

    function success(message: string, duration = 3000) {
        alertText.value = message;
        showAlert.value = true;
        clearTimeout(successTimer);
        successTimer = setTimeout(() => (showAlert.value = false), duration);
    }

    function fail(error: any, fallback?: string) {
        errorText.value = apiError(error, fallback);
        showErrorAlert.value = true;
        clearTimeout(errorTimer);
        errorTimer = setTimeout(() => (showErrorAlert.value = false), 8000);
    }

    function clear() {
        showAlert.value = false;
        showErrorAlert.value = false;
    }

    return { showAlert, alertText, showErrorAlert, errorText, success, fail, clear };
}
