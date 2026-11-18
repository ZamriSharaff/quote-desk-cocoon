import {
  json,
  loadProducts,
} from './_lib/utils.js';


export async function onRequestGet(context) {
  try {
    const products = await loadProducts(context);

    return json({
      ok: true,
      products: products.length,
      aiConfigured: Boolean(context.env.GEMINI_API_KEY),
    });

  } catch (error) {
    return json({
      error: error.message,
    }, error.statusCode || 500);
  }
}
