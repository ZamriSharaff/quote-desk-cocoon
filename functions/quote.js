import {
  json,
  loadProducts,
  calculateQuote,
  readJson,
} from './_lib/utils.js';


export async function onRequestPost(context) {
  try {
    const body = await readJson(context.request);
    const products = await loadProducts(context);

    const quote = calculateQuote(
      body.items,
      products
    );

    return json(quote);

  } catch (error) {
    return json({
      error: error.message,
    }, error.statusCode || 400);
  }
}
