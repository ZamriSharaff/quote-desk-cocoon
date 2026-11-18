export const VAT_RATE = 0.18;
export const BULK_QTY = 10;        // ten or more of one item earns the bulk discount
export const BULK_DISCOUNT = 0.05;

/*
 * lines: [{ sku, name, qty, unitPrice }]
 * Returns the priced lines and the totals, in LKR.
 * Business rule (from the client): the discount comes off before VAT is added.
 */
export function buildQuote(lines) {
  const priced = lines.map((l) => {
    const gross = l.qty * l.unitPrice;
    const discount = l.qty >= BULK_QTY ? gross * BULK_DISCOUNT : 0;
    return { ...l, gross, discount, net: gross - discount };
  });
  const subtotal = priced.reduce((a, l) => a + l.gross, 0);
  const discount = priced.reduce((a, l) => a + l.discount, 0);
  const netSubtotal = subtotal - discount;
  const vat = netSubtotal * VAT_RATE;
  const total = netSubtotal + vat;
  return { lines: priced, subtotal, discount, vat, total };
}
