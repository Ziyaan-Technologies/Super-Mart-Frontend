export interface EditableLine {
    quantity: number;
    unit_cost: number;
    tax_rate?: number;
    discount_amount?: number;
}

const round = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export function lineTotal(line: EditableLine) {
    const gross = round((Number(line.quantity) || 0) * (Number(line.unit_cost) || 0));
    const discount = round(Number(line.discount_amount) || 0);
    const tax = round((gross - discount) * (Number(line.tax_rate) || 0) / 100);
    return { gross, discount, tax, total: round(gross - discount + tax) };
}

export function documentTotals(lines: EditableLine[]) {
    return lines.reduce((sum, line) => {
        const totals = lineTotal(line);
        return {
            subtotal: round(sum.subtotal + totals.gross),
            discount: round(sum.discount + totals.discount),
            tax: round(sum.tax + totals.tax),
            total: round(sum.total + totals.total),
        };
    }, { subtotal: 0, discount: 0, tax: 0, total: 0 });
}
