import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalogue, search } from './catalogue.js';
import { buildQuote } from './quote.js';
import {
  draftReply,
  buildCustomerReply,
} from './llm.js';


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
        const error = new Error('request_too_large');
        error.statusCode = 413;
        reject(error);
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        const error = new Error('invalid_json');
        error.statusCode = 400;
        reject(error);
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
    const content = await readFile(
      join(PUBLIC_DIR, page[0])
    );

    res.writeHead(200, {
      'Content-Type': page[1],
      'Cache-Control': 'no-store',
    });

    res.end(content);

  } catch {
    sendJson(res, 500, {
      error: 'page_unavailable',
    });
  }

  return true;
}


// Always retrieve prices from the server-side catalogue.
// Never trust prices or totals sent by the browser.
function calculateQuote(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error(
      'Add at least one product to the quote.'
    );

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
      const error = new Error(
        `Unknown product SKU: ${sku || '(empty)'}`
      );

      error.statusCode = 400;
      throw error;
    }

    if (
      !Number.isInteger(qty) ||
      qty < 1 ||
      qty > 10000
    ) {
      const error = new Error(
        `Invalid quantity for ${sku}. Enter a whole number between 1 and 10,000.`
      );

      error.statusCode = 400;
      throw error;
    }

    if (
      !Number.isFinite(product.price) ||
      product.price <= 0
    ) {
      const error = new Error(
        `No valid catalogue price is available for ${sku}.`
      );

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


  // Financial calculations are performed by our own code.
  const quote = buildQuote(lines);

  const discountRate = quote.subtotal > 0
    ? (quote.discount / quote.subtotal) * 100
    : 0;

  const approvalReasons = [];

  if (quote.total > 500000) {
    approvalReasons.push(
      'quote total exceeds LKR 500,000'
    );
  }

  if (discountRate > 5) {
    approvalReasons.push(
      'discount exceeds 5%'
    );
  }

  return {
    ...quote,
    needsApproval: approvalReasons.length > 0,
    approvalReasons,
  };
}


const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');


  // Serve the frontend.
  if (
    req.method === 'GET' &&
    await servePage(url.pathname, res)
  ) {
    return;
  }


  // Health check.
  if (
    req.method === 'GET' &&
    url.pathname === '/health'
  ) {
    return sendJson(res, 200, {
      ok: true,
      products: products.length,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    });
  }


  // Product catalogue search.
  if (
    req.method === 'GET' &&
    url.pathname === '/products'
  ) {
    const q = url.searchParams.get('q') || '';

    return sendJson(res, 200, {
      results: search(products, q),
    });
  }


  // Calculate a quotation.
  if (
    req.method === 'POST' &&
    url.pathname === '/quote'
  ) {
    try {
      const body = await readBody(req);

      const quote = calculateQuote(body.items);

      return sendJson(res, 200, quote);

    } catch (error) {
      return sendJson(
        res,
        error.statusCode || 400,
        {
          error: error.message || 'invalid_quote',
        }
      );
    }
  }


  // Generate an AI assisted WhatsApp reply.
  if (
    req.method === 'POST' &&
    url.pathname === '/draft-reply'
  ) {
    try {
      const body = await readBody(req);

      // Recalculate the quote before drafting.
      const quote = calculateQuote(body.items);

      // Gemini writes wording only.
      const wording = await draftReply(body.enquiry || '', {
        apiKey: process.env.GEMINI_API_KEY,
        model: process.env.GEMINI_MODEL,
        productNames: quote.lines.map((line) => line.name),
      });

      // The application inserts all financial information.
      const draft = buildCustomerReply({
        quote,
        customerName: body.customerName,
        opening: wording.opening,
        closing: wording.closing,
      });

      return sendJson(res, 200, {
        draft,
        model: wording.model,
      });

    } catch (error) {
      return sendJson(
        res,
        error.statusCode || 502,
        {
          error: error.message ||
            'Could not draft the reply.',
        }
      );
    }
  }


  // Unknown endpoint.
  return sendJson(res, 404, {
    error: 'not_found',
  });
});


server.listen(PORT, () => {
  console.log(
    `Quote Desk listening on http://localhost:${PORT}`
  );
});
