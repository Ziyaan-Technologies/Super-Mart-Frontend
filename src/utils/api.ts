import axios from 'axios';

export function apiError(error: any, fallback = 'Something went wrong') {
    const message = error?.response?.data?.message;
    if (Array.isArray(message)) {
        return message.join(', ');
    }
    return message || error?.message || fallback;
}

export async function uploadImage(folder: string, file: File | null | undefined) {
    if (!file) {
        return null;
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`files/${folder}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url as string;
}

export async function downloadExport(path: string, payload: any, fileName: string) {
    const response = await axios.post(path, payload, { responseType: 'blob' });
    saveBlob(response.data, fileName);
}

export function saveBlob(data: Blob, fileName: string) {
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

export function printPdf(data: Blob) {
    const blob = new Blob([data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    document.body.appendChild(iframe);
    let printed = false;
    const trigger = () => {
        if (printed) return;
        printed = true;
        try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        } catch (error) {
            window.open(url, '_blank')?.print();
        }
        setTimeout(() => {
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
            window.URL.revokeObjectURL(url);
        }, 60000);
    };
    iframe.onload = trigger;
    setTimeout(trigger, 1500);
}

export function formatDate(value?: string | Date | null) {
    if (!value) {
        return 'N/A';
    }
    return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | Date | null) {
    if (!value) {
        return 'N/A';
    }
    return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatNumber(value?: number | string | null, digits = 2) {
    const number = Number(value || 0);
    return number.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function currency() {
    try {
        return JSON.parse(localStorage.getItem('currencyCode') || 'null') || '';
    } catch (error) {
        return '';
    }
}

export function formatMoney(value?: number | string | null) {
    const symbol = currency();
    const amount = Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${symbol ? `${symbol} ` : ''}${amount}`;
}

export function today() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export const rules = {
    required: (v: any) => (v !== null && v !== undefined && String(v).trim() !== '') || 'This field is required',
    requiredSelect: (v: any) => !!v || 'Please choose one',
    email: (v: string) => !v || /.+@.+\..+/.test(v) || 'E-mail must be valid',
    positive: (v: any) => Number(v) > 0 || 'Must be more than zero',
    notNegative: (v: any) => v === '' || v === null || Number(v) >= 0 || 'Cannot be negative',
    minLength: (length: number) => (v: string) => !v || v.length >= length || `At least ${length} characters`,
};
