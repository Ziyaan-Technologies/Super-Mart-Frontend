import JsBarcode from 'jsbarcode';
import { currency } from '@/utils/api';
import { escapeHtml, printDocument } from '@/utils/print';

// All sizes are millimetres. One printed page is one row of labels across the roll;
// the printer's gap sensor advances to the next row.
export interface LabelLayout {
    width: number;
    height: number;
    columns: number;
    gap: number;
    offset: number;
    // Moves the print down (positive) or up (negative) when it isn't centred on the sticker.
    top: number;
}

export interface LabelItem {
    title: string;
    barcode: string;
    // Shelf price the customer pays; left off the label when not set.
    price?: number | null;
    copies: number;
}

export const defaultLayout: LabelLayout = { width: 28, height: 19, columns: 3, gap: 3, offset: 6, top: -0.75 };

// Bumped when the default roll changes, so layouts saved for the old roll are dropped.
const layoutKey = 'labelLayout.v3';

export function loadLayout(): LabelLayout {
    try {
        return { ...defaultLayout, ...JSON.parse(localStorage.getItem(layoutKey) || '{}') };
    } catch (error) {
        return { ...defaultLayout };
    }
}

export function saveLayout(layout: LabelLayout) {
    try {
        localStorage.setItem(layoutKey, JSON.stringify(layout));
    } catch (error) {
        // Settings just won't be remembered on this machine.
    }
}

export function pageWidth(layout: LabelLayout) {
    return layout.offset * 2 + layout.columns * layout.width + (layout.columns - 1) * layout.gap;
}

// Labels only have room for the first two words, e.g. "Rainbow Premium - NO 4 Large- 50 Pices" -> "Rainbow Premium".
export function labelName(name: string) {
    return (name || '').split(/[\s\-–—,/|]+/).filter(Boolean).slice(0, 2).join(' ');
}

export function labelPrice(price?: number | null) {
    if (price === null || price === undefined || !Number.isFinite(Number(price))) return '';
    const amount = Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const symbol = currency();
    return symbol ? `${symbol} ${amount}` : amount;
}

function validCheckDigit(code: string) {
    const digits = code.split('').map(Number);
    const check = digits.pop() as number;
    const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 ? 1 : 3), 0);
    return (10 - (sum % 10)) % 10 === check;
}

function barcodeFormat(code: string) {
    if (/^\d{13}$/.test(code) && validCheckDigit(code)) return 'EAN13';
    if (/^\d{12}$/.test(code) && validCheckDigit(code)) return 'UPC';
    if (/^\d{8}$/.test(code) && validCheckDigit(code)) return 'EAN8';
    return 'CODE128';
}

function barcodeSvg(code: string) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, code, { format: barcodeFormat(code), width: 1, height: 50, margin: 0, displayValue: false, flat: true });
    const modules = parseFloat(svg.getAttribute('width') || '0');
    svg.setAttribute('viewBox', `0 0 ${modules} 50`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.removeAttribute('style');
    return { markup: svg.outerHTML, modules };
}

function labelMarkup(item: LabelItem, layout: LabelLayout) {
    const { markup, modules } = barcodeSvg(item.barcode);
    // A 203 dpi head prints 0.125 mm dots. Bars must be a whole number of dots wide or they print
    // unevenly and won't scan, so use 2 dots per module and keep at least 2 mm of quiet zone each side.
    const dot = 0.125;
    const moduleWidth = dot * Math.max(1, Math.min(2, Math.floor((layout.width - 4) / modules / dot)));
    const price = labelPrice(item.price);
    return `<div class="label">
        <div class="name">${escapeHtml(item.title)}</div>
        <div class="bars" style="width:${(modules * moduleWidth).toFixed(2)}mm">${markup}</div>
        <div class="code">${escapeHtml(item.barcode)}</div>
        ${price ? `<div class="price">${escapeHtml(price)}</div>` : ''}
    </div>`;
}

export function labelsDocument(items: LabelItem[], layout: LabelLayout) {
    const top = Math.min(Math.max(-5, Number(layout.top) || 0), 5);
    const labels = items.flatMap((item) => Array.from({ length: Math.max(0, Math.floor(item.copies)) }, () => labelMarkup(item, layout)));
    const rows: string[] = [];
    for (let index = 0; index < labels.length; index += layout.columns) {
        rows.push(`<div class="row">${labels.slice(index, index + layout.columns).join('')}</div>`);
    }
    return `<!doctype html><html><head><meta charset="utf-8"><style>
        @page { size: ${pageWidth(layout)}mm ${layout.height}mm; margin: 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { width: ${pageWidth(layout)}mm; background: #fff; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .row { display: flex; gap: ${layout.gap}mm; padding-left: ${layout.offset}mm; height: ${layout.height}mm; overflow: hidden; break-after: page; page-break-after: always; }
        .row:last-child { break-after: auto; page-break-after: auto; }
        .label { width: ${layout.width}mm; height: ${layout.height}mm; padding: 1mm; transform: translateY(${top}mm); display: grid; grid-template-rows: auto minmax(0, 8mm) auto auto; align-content: center; justify-items: center; overflow: hidden; font-family: Arial, Helvetica, sans-serif; }
        .name { width: 100%; font-size: 7pt; font-weight: 700; line-height: 1.15; text-align: center; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        .bars { height: 100%; min-height: 0; padding: 0.8mm 0 0.3mm; }
        .bars svg { display: block; width: 100%; height: 100%; }
        .code { font-size: 6.5pt; letter-spacing: 0.4pt; line-height: 1.2; }
        .price { font-size: 8pt; font-weight: 700; line-height: 1.1; }
    </style></head><body>${rows.join('')}</body></html>`;
}

export function printLabels(items: LabelItem[], layout: LabelLayout) {
    printDocument(labelsDocument(items, layout));
}
