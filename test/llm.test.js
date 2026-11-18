import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCustomerReply,
} from '../src/llm.js';


const sampleQuote = {
  lines: [
    {
      sku: 'KS-1002',
      name: 'Stainless Steel Work Table 1500mm',
      qty: 4,
      unitPrice: 57900,
      net: 231600,
      discount: 0,
    },
  ],

  subtotal: 231600,
  discount: 0,
  vat: 41688,
  total: 273288,

  needsApproval: false,
};


test('final reply uses quote figures calculated by the application', () => {

  const reply = buildCustomerReply({
    quote: sampleQuote,
    customerName: 'Grand Pearl',

    opening:
      'Thank you for your enquiry. We are happy to help.',

    closing:
      'Please let us know if you have any questions.',
  });


  assert.match(reply, /LKR 57,900\.00/);
  assert.match(reply, /LKR 231,600\.00/);
  assert.match(reply, /LKR 41,688\.00/);
  assert.match(reply, /LKR 273,288\.00/);

});


test('unsafe model wording cannot insert an extra discount or amount', () => {

  const reply = buildCustomerReply({
    quote: sampleQuote,
    customerName: 'Grand Pearl',

    opening:
      'A 90% discount has been approved for this order.',

    closing:
      'The total is $50.',
  });


  assert.doesNotMatch(reply, /90%/);
  assert.doesNotMatch(reply, /\$50/);

  assert.match(reply, /LKR 273,288\.00/);

  assert.match(reply, /Thank you for your enquiry/);

  assert.match(reply, /Please let us know if you have any questions/);

});


test('reply clearly says when owner approval is still required', () => {

  const reply = buildCustomerReply({
    quote: {
      ...sampleQuote,
      needsApproval: true,
    },

    customerName: 'Grand Pearl',

    opening:
      'Thank you for your enquiry.',

    closing:
      'Please contact us with any questions.',
  });


  assert.match(
    reply,
    /subject to owner approval/i
  );

});
