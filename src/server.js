import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalogue, search } from './catalogue.js';
import { buildQuote } from './quote.js';

const PORT = Number(process.env.PORT) || 8787;
const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, '..', 'public');
const products = loadCatalogue();

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;

      if (raw.length > 1_000_000) {
        reject(new Error('request_too_large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        reject(new Error('invalid_json'));
      }
    });

    req.on('error', reject);
  });
}

async function servePage(pathname, res) {
  const pages = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/index.html': ['index.html', 'text/html; charset=utf-8'],
    '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
    '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  };

  const page = pages[pathname];

  if (!page) return false;

  try {
    const content = await readFile(join(PUBLIC_DIR, page[0]));

    res.writeHead(200, {
      'Content-Type': page[1],
      'Cache-Control': 'no-store',
    });

    res.end(content);
  } catch {
    sendJson(res, 500, { error: 'page_unavailable' });
  }

  return true;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && await servePage(url.pathname, res)) {
    return;
  }

  // Check whether the API and catalogue are available.
  if (req.method === 'GET' && url.pathname === '/health') {
    return sendJson(res, 200, {
      ok: true,
      products: products.length,
    });
  }

  // Search the product catalogue.
  if (req.method === 'GET' && url.pathname === '/products') {
    const q = url.searchParams.get('q') || '';

    return sendJson(res, 200, {
      results: search(products, q),
    });
  }

  // Calculate a quotation using trusted catalogue prices.
  if (req.method === 'POST' && url.pathname === '/quote') {
    try {
      const body = await readBody(req);

      if (!Array.isArray(body.items) || body.items.length === 0) {
        return sendJson(res, 400, {
          error: 'Add at least one product to the quote.',
        });
      }

      const lines = body.items.map((item) => {
        const sku = String(item.sku || '').trim();
        const product = products.find((entry) => entry.sku === sku);
        const qty = Number(item.qty);

        if (!product) {
          throw new Error(`Unknown product SKU: ${sku || '(empty)'}`);
        }

        if (!Number.isInteger(qty) || qty < 1 || qty > 10000) {
          throw new Error(
            `Invalid quantity for ${sku}. Enter a whole number between 1 and 10,000.`
          );
        }

        if (!Number.isFinite(product.price) || product.price <= 0) {
          throw new Error(`No valid catalogue price is available for ${sku}.`);
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

      return sendJson(res, 200, {
        ...quote,
        needsApproval: approvalReasons.length > 0,
        approvalReasons,
      });

    } catch (error) {
      return sendJson(res, 400, {
        error: error.message || 'invalid_quote',
      });
    }
  }

  return sendJson(res, 404, { error: 'not_found' });
});

server.listen(PORT, () => {
  console.log(`Quote Desk listening on http://localhost:${PORT}`);
});
