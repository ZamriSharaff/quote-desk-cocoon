const productSearch = document.querySelector('#product-search');
const productResults = document.querySelector('#product-results');
const productCount = document.querySelector('#product-count');
const quoteLines = document.querySelector('#quote-lines');
const quoteCount = document.querySelector('#quote-count');
const quoteError = document.querySelector('#quote-error');
const approvalNotice = document.querySelector('#approval-notice');
const replyPreview = document.querySelector('#reply-preview');
const copyReplyButton = document.querySelector('#copy-reply');
const createMessageButton = document.querySelector('#create-message');
const replyStatus = document.querySelector('#reply-status');
const customerName = document.querySelector('#customer-name');

const state = {
  products: [],
  items: [],
  quote: null,
};


// Format amounts as Sri Lankan rupees.
const money = (amount) => new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(amount) || 0);


// Escape HTML before inserting product information into the page.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}


// Retrieve products from the backend.
async function loadProducts(query = '') {
  productResults.innerHTML =
    '<p class="empty-message">Searching catalogue…</p>';

  try {
    const response = await fetch(
      `/products?q=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      throw new Error('Could not load the product catalogue.');
    }

    const data = await response.json();

    state.products = Array.isArray(data.results)
      ? data.results
      : [];

    productCount.textContent =
      `${state.products.length} products found`;

    renderProducts(query);

  } catch (error) {
    productCount.textContent = 'Catalogue unavailable';

    productResults.innerHTML = `
      <p class="empty-message">
        ${escapeHtml(error.message)}
      </p>
    `;
  }
}


// Display the products returned by the backend.
function renderProducts(query = '') {
  const products = query.trim()
    ? state.products
    : state.products.slice(0, 8);

  if (!products.length) {
    productResults.innerHTML = `
      <p class="empty-message">
        No matching products. Try another name or SKU.
      </p>
    `;
    return;
  }

  productResults.innerHTML = products.map((product) => `
    <article class="product-card">

      <div class="product-info">

        <span class="product-name">
          ${escapeHtml(product.name)}
        </span>

        <div class="product-meta">
          ${escapeHtml(product.sku)}
          · ${escapeHtml(product.category)}
          · Updated ${escapeHtml(product.updated)}
        </div>

        <span class="product-price">
          ${money(product.price)} / ${escapeHtml(product.unit)}
        </span>

      </div>

      <div class="product-actions">

        <span class="stock-label">
          Catalogue stock: ${escapeHtml(product.stock)}
        </span>

        <button
          class="button button-secondary button-small"
          type="button"
          data-add-sku="${escapeHtml(product.sku)}"
        >
          ＋ Add
        </button>

      </div>

    </article>
  `).join('');
}


// Add a product to the quotation.
function addProduct(sku) {
  const product = state.products.find(
    (item) => item.sku === sku
  );

  if (!product) return;

  const existing = state.items.find(
    (item) => item.sku === sku
  );

  if (existing) {
    existing.qty += 1;
  } else {
    state.items.push({
      sku,
      qty: 1,
    });
  }

  updateQuote();
}


// Display the current quotation and totals.
function renderQuote() {
  const itemCount = state.items.reduce(
    (sum, item) => sum + item.qty,
    0
  );

  quoteCount.textContent =
    `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;


  if (!state.quote || !state.quote.lines.length) {

    quoteLines.innerHTML = `
      <div class="empty-quote">
        <span class="empty-icon">＋</span>
        <strong>Your quote is empty</strong>
        <span>Search for a product and add it to get started.</span>
      </div>
    `;

    document.querySelector('#subtotal').textContent = money(0);
    document.querySelector('#discount').textContent = `− ${money(0)}`;
    document.querySelector('#vat').textContent = money(0);
    document.querySelector('#total').textContent = money(0);

    approvalNotice.hidden = true;

    replyPreview.value = '';

    copyReplyButton.disabled = true;
    createMessageButton.disabled = true;

    return;
  }


  quoteLines.innerHTML = state.quote.lines.map((line) => `
    <article class="quote-line">

      <div class="quote-line-top">

        <div>

          <div class="quote-line-name">
            ${escapeHtml(line.name)}
          </div>

          <div class="quote-line-meta">
            ${escapeHtml(line.sku)}
            · ${money(line.unitPrice)} each
          </div>

        </div>

        <button
          class="remove-line"
          type="button"
          aria-label="Remove ${escapeHtml(line.name)}"
          data-remove-sku="${escapeHtml(line.sku)}"
        >
          ×
        </button>

      </div>


      <div class="quote-line-bottom">

        <label class="qty-control">
          Qty

          <input
            type="number"
            min="1"
            max="10000"
            step="1"
            value="${line.qty}"
            data-qty-sku="${escapeHtml(line.sku)}"
          >
        </label>

        <div class="line-total">

          <strong>${money(line.net)}</strong>

          <small>
            ${line.discount > 0
              ? `Includes ${money(line.discount)} bulk discount`
              : 'No bulk discount'}
          </small>

        </div>

      </div>

    </article>
  `).join('');


  // Update the financial summary using backend calculations.
  document.querySelector('#subtotal').textContent =
    money(state.quote.subtotal);

  document.querySelector('#discount').textContent =
    `− ${money(state.quote.discount)}`;

  document.querySelector('#vat').textContent =
    money(state.quote.vat);

  document.querySelector('#total').textContent =
    money(state.quote.total);


  // Show whether owner approval is required.
  const reasons = state.quote.approvalReasons || [];

  approvalNotice.hidden = !state.quote.needsApproval;

  approvalNotice.textContent = state.quote.needsApproval
    ? `Owner approval required before this quote is sent: ${reasons.join('; ')}. This app flags the approval requirement; it does not send an approval request yet.`
    : 'This quote is within the stated approval limits. The salesperson must still review it before sending.';


  copyReplyButton.disabled = false;
  createMessageButton.disabled = false;
}


// Send the selected products to the backend for calculation.
async function updateQuote() {
  quoteError.hidden = true;

  if (!state.items.length) {
    state.quote = null;
    renderQuote();
    return;
  }

  try {
    const response = await fetch('/quote', {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        items: state.items,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Could not calculate this quote.');
    }

    state.quote = data;

    renderQuote();

    replyPreview.value = '';

    replyStatus.textContent =
      'Quote updated. Prepare and review a message before copying.';

  } catch (error) {
    quoteError.textContent = error.message;
    quoteError.hidden = false;
  }
}


// Generate a basic editable WhatsApp message.
function createMessage() {
  if (!state.quote) return;

  const name = customerName.value.trim() || 'there';

  const lineText = state.quote.lines.map((line) => {

    const discountText = line.discount > 0
      ? ` (includes ${money(line.discount)} bulk discount)`
      : '';

    return `• ${line.name} (${line.sku}) — ${line.qty} × ${money(line.unitPrice)} = ${money(line.net)}${discountText}`;

  }).join('\n');


  replyPreview.value =
`Hi ${name},

Thank you for your enquiry. Please find your quotation below:

${lineText}

Subtotal: ${money(state.quote.subtotal)}
Bulk discount: -${money(state.quote.discount)}
VAT (18%): ${money(state.quote.vat)}
Total: ${money(state.quote.total)}

Please review the quotation and let us know if you would like to proceed. Prices and stock are subject to confirmation.

Lakeside Kitchen Supply`;


  replyStatus.textContent =
    'Basic template created. Check all details and confirm the price before copying.';

  replyPreview.focus();
}


// Search products as the user types.
let searchTimer;

productSearch.addEventListener('input', () => {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    loadProducts(productSearch.value.trim());
  }, 220);
});


// Handle adding products.
productResults.addEventListener('click', (event) => {
  const button = event.target.closest('[data-add-sku]');

  if (button) {
    addProduct(button.dataset.addSku);
  }
});


// Handle removing products.
quoteLines.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-sku]');

  if (!button) return;

  state.items = state.items.filter(
    (item) => item.sku !== button.dataset.removeSku
  );

  updateQuote();
});


// Handle quantity changes.
quoteLines.addEventListener('change', (event) => {
  const input = event.target.closest('[data-qty-sku]');

  if (!input) return;

  const qty = Number(input.value);

  if (!Number.isInteger(qty) || qty < 1 || qty > 10000) {

    input.value = state.items.find(
      (item) => item.sku === input.dataset.qtySku
    )?.qty || 1;

    return;
  }

  const item = state.items.find(
    (entry) => entry.sku === input.dataset.qtySku
  );

  if (item) {
    item.qty = qty;
  }

  updateQuote();
});


// Create the WhatsApp message preview.
createMessageButton.addEventListener('click', createMessage);


// Copy the message to the clipboard.
copyReplyButton.addEventListener('click', async () => {

  if (!replyPreview.value.trim()) {
    replyStatus.textContent = 'Create a message preview first.';
    return;
  }

  try {
    await navigator.clipboard.writeText(replyPreview.value);

    replyStatus.textContent =
      'Message copied. Review it in WhatsApp before sending.';

  } catch {
    replyPreview.select();

    replyStatus.textContent =
      'Select and copy the message manually.';
  }
});


// Load the catalogue and initialise the quotation.
loadProducts();
renderQuote();
