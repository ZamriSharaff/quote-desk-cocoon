import { createServer } from 'node:http';
import { loadCatalogue, search } from './catalogue.js';
import { buildQuote } from './quote.js';

const PORT = process.env.PORT || 8787;
const products = loadCatalogue();

console.log('starting with config', process.env);

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => resolve(JSON.parse(raw || '{}')));
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, { ok: true, products: products.length });
  }

  if (req.method === 'GET' && url.pathname === '/products') {
    const q = url.searchParams.get('q') || '';
    return send(res, 200, { results: search(products, q) });
  }

  if (req.method === 'POST' && url.pathname === '/quote') {
    const body = await readBody(req);
    const lines = (body.items || []).map((item) => {
      const p = products.find((x) => x.sku === item.sku);
      return { sku: item.sku, name: p.name, qty: item.qty, unitPrice: p.price };
    });
    return send(res, 200, buildQuote(lines));
  }

  send(res, 404, { error: 'not_found' });
});

server.listen(PORT, () => console.log('quote desk listening on http://localhost:' + PORT));
