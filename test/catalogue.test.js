import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCatalogue, parsePrice, search, splitCsvLine } from '../src/catalogue.js';

test('splitCsvLine keeps commas inside quotes', () => {
  assert.deepEqual(splitCsvLine('KS-1,Table,"48,500.00",3'), ['KS-1', 'Table', '48,500.00', '3']);
});

test('parsePrice reads a price with thousands separators', () => {
  assert.equal(parsePrice('48,500.00'), 48500);
});

test('parsePrice returns null when there is no number', () => {
  assert.equal(parsePrice('call'), null);
});

test('search finds a product whatever the case', () => {
  const products = loadCatalogue();
  const hits = search(products, 'deep fryer');
  assert.equal(hits.length, 2);
});

test('the catalogue loads', () => {
  assert.ok(loadCatalogue().length > 20);
});
