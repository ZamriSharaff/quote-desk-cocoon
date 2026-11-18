import {
  json,
  loadProducts,
  readJson,
  createDraft,
} from './_lib/utils.js';


export async function onRequestPost(context) {
  try {
    const body = await readJson(context.request);
    const products = await loadProducts(context);

    const result = await createDraft(
      body,
      products,
      context.env
    );

    return json(result);

  } catch (error) {
    return json({
      error: error.message || 'Could not draft the reply.',
    }, error.statusCode || 502);
  }
}
