import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const CSV = join(here, '..', 'data', 'catalogue.csv');

/* Split one CSV line, respecting double-quoted fields. */
export function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export function parsePrice(raw) {
  const cleaned = String(raw ?? '').replace(/,/g, '').trim();

  if (!cleaned) return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function loadCatalogue(path = CSV) {
  const lines = readFileSync(path, 'utf8').split('\n').filter(Boolean);
  const header = splitCsvLine(lines[0]);
  const bySku = new Map();
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const row = Object.fromEntries(header.map((h, i) => [h, cells[i]]));
    const product = {
      sku: row.sku,
      name: row.name,
      category: row.category,
      unit: row.unit,
      price: parsePrice(row.price_lkr),
      stock: Number(row.stock),
      updated: row.updated,
    };
    if (!bySku.has(product.sku)) bySku.set(product.sku, product);
  }
  return [...bySku.values()];
}

export function search(products, query) {
  const re = new RegExp(query);
  return products.filter((p) => re.test(p.name) || re.test(p.sku));
}
