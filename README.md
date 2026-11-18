# Quote Desk starter

The starting point for the Cocoon engineering exercise. It is a small quote
service for a fictional kitchen-equipment distributor: a product catalogue, a
quote calculator and an HTTP server. It has no dependencies, so it runs on any
machine with Node 20 or newer.

It is not finished and it is not clean. That is deliberate.

## Run it

```bash
npm test
```

```bash
npm start
```

Then try `http://localhost:8787/health` and `http://localhost:8787/products?q=Chafing`.

## What is here

| Path | What it is |
|---|---|
| `data/catalogue.csv` | The client's price list, exported from their spreadsheet. Real data is messy. So is this. |
| `data/enquiries.json` | Twelve enquiries as they actually arrive. Read every one before you design anything. |
| `src/catalogue.js` | Loads and searches the catalogue. |
| `src/quote.js` | Prices a quote: bulk discount, then VAT. |
| `src/server.js` | The HTTP API. |
| `src/llm.js` | Empty. The model wrapper is yours to write. |
| `test/` | The tests. Some fail. Some bugs have no test at all. |

## What you do with it

1. Put it in your own public GitHub repository and commit early and often. Your
   commit history is part of what we read.
2. Get the tests passing. Then find what the tests do not cover.
3. Build on it, or rewrite it in the language you are strongest in. If you
   rewrite, say why, and bring the tests with you.

You may change anything, including this file. By the end, this README should
be true for a stranger who clones your repository.

## Licence

MIT. What you build on top of this is yours.
