import {
  json,
  loadProducts,
  searchProducts,
} from './_lib/utils.js';


export async function onRequestGet(context) {
  try {
    const products = await loadProducts(context);

    const url = new URL(context.request.url);
    const query = url.searchParams.get('q') || '';

    return json({
      results: searchProducts(products, query),
    });

  } catch (error) {
    return json({
      error: error.message,
    }, error.statusCode || 500);
  }
}
