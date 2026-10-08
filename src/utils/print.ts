export function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] as string);
}

// Prints a complete HTML document through a hidden iframe, so the current page stays as it is.
export function printDocument(html: string) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.onload = () => {
        const frame = iframe.contentWindow;
        if (!frame) return;
        frame.addEventListener('afterprint', () => setTimeout(() => iframe.remove(), 500));
        frame.focus();
        frame.print();
    };
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
}
