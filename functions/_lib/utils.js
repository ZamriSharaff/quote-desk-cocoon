import { buildQuote } from '../../src/quote.js';
import {
  draftReply,
  buildCustomerReply,
} from '../../src/llm.js';


export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}


function splitCsvLine(line) {
  const out = [];
  let current = '';
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      out.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  out.push(current);
  return out;
}


function parsePrice(raw) {
  const cleaned = String(raw ?? '').replace(/,/g, '').trim();

  if (!cleaned) return null;

  const price = Number(cleaned);

  return Number.isFinite(price) ? price : null;
}


// Read the catalogue from the deployed static assets.
export async function loadProducts(context) {
  const assetUrl = new URL(
    '/data/catalogue.csv',
    context.request.url
  );

  const response = await context.env.ASSETS.fetch(assetUrl);

  if (!response.ok) {
    const error = new Error('Could not load the product catalogue.');
    error.statusCode = 500;
    throw error;
  }

  const csv = (await response.text()).replace(/^\uFEFF/, '');

  const lines = csv.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]);
  const bySku = new Map();

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);

    const row = Object.fromEntries(
      headers.map((header, index) => [
        header,
        cells[index] ?? '',
      ])
    );

    const product = {
      sku: row.sku,
      name: row.name,
      category: row.category,
      unit: row.unit,
      price: parsePrice(row.price_lkr),
      stock: Number(row.stock || 0),
      updated: row.updated,
    };

    // Preserve the newest entry for duplicate SKUs.
    const existing = bySku.get(product.sku);

    if (!existing || product.updated > existing.updated) {
      bySku.set(product.sku, product);
    }
  }

  return [...bySku.values()];
}


// Case-insensitive product search.
export function searchProducts(products, query) {
  const term = String(query || '').trim().toLowerCase();

  if (!term) return products;

  return products.filter((product) =>
    product.name.toLowerCase().includes(term) ||
    product.sku.toLowerCase().includes(term)
  );
}


// Validate and calculate every quote using catalogue prices.
export function calculateQuote(items, products) {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('Add at least one product to the quote.');
    error.statusCode = 400;
    throw error;
  }

  const lines = items.map((item) => {
    const sku = String(item.sku || '').trim();

    const product = products.find(
      (entry) => entry.sku === sku
    );

    const qty = Number(item.qty);

    if (!product) {
      const error = new Error(`Unknown product SKU: ${sku || '(empty)'}`);
      error.statusCode = 400;
      throw error;
    }

    if (!Number.isInteger(qty) || qty < 1 || qty > 10000) {
      const error = new Error(`Invalid quantity for ${sku}.`);
      error.statusCode = 400;
      throw error;
    }

    if (!Number.isFinite(product.price) || product.price <= 0) {
      const error = new Error(`No valid price is available for ${sku}.`);
      error.statusCode = 400;
      throw error;
    }

    return {
      sku: product.sku,
      name: product.name,
      qty,
      unitPrice: product.price,
      priceUpdated: product.updated,
      stock: product.stock,
    };
  });


  // All financial calculations remain in application code.
  const quote = buildQuote(lines);

  const discountRate = quote.subtotal > 0
    ? (quote.discount / quote.subtotal) * 100
    : 0;

  const approvalReasons = [];

  if (quote.total > 500000) {
    approvalReasons.push('quote total exceeds LKR 500,000');
  }

  if (discountRate > 5) {
    approvalReasons.push('discount exceeds 5%');
  }

  return {
    ...quote,
    needsApproval: approvalReasons.length > 0,
    approvalReasons,
  };
}


// Read and validate incoming JSON.
export async function readJson(request) {
  const raw = await request.text();

  if (raw.length > 1_000_000) {
    const error = new Error('Request is too large.');
    error.statusCode = 413;
    throw error;
  }

  try {
    return JSON.parse(raw || '{}');
  } catch {
    const error = new Error('Invalid JSON request.');
    error.statusCode = 400;
    throw error;
  }
}


// Ask Gemini to draft wording, then insert application-calculated figures.
export async function createDraft(body, products, env) {
  const quote = calculateQuote(body.items, products);

  const wording = await draftReply(
    body.enquiry || '',
    {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      productNames: quote.lines.map((line) => line.name),
    }
  );

  const draft = buildCustomerReply({
    quote,
    customerName: body.customerName,
    opening: wording.opening,
    closing: wording.closing,
  });

  return {
    draft,
    model: wording.model,
  };
}
