import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildQuote } from '../src/quote.js';

test('a small order has no discount', () => {
  const q = buildQuote([{ sku: 'KS-5001', name: 'Chef Knife', qty: 2, unitPrice: 6450 }]);
  assert.equal(q.discount, 0);
  assert.equal(q.subtotal, 12900);
});

test('exactly ten of one item earns the bulk discount', () => {
  const q = buildQuote([{ sku: 'KS-7002', name: 'Chafing Dish', qty: 10, unitPrice: 16900 }]);
  assert.equal(q.discount, 8450);
});

test('VAT is charged on the price after discount', () => {
  const q = buildQuote([{ sku: 'KS-2211', name: 'GN Pan 1/1 100mm', qty: 20, unitPrice: 6200 }]);
  // 124,000 gross, 6,200 discount, 117,800 net, 18% VAT on the net
  assert.equal(q.total, 139004);
});
