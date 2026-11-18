# Quote Desk

A lightweight quotation tool for Lakeside Kitchen Supply, built as part of the Cocoon engineering exercise.

Quote Desk helps salespeople search products, prepare quotations and draft customer replies using Google's Gemini API.

## Features

- Search products by name or SKU.
- Add products and quantities to quotations.
- Calculate bulk discounts, VAT and totals in application code.
- Flag quotations requiring owner approval.
- Generate AI-assisted WhatsApp replies.
- Edit and copy messages without automatically sending them.
- Responsive interface with larger mobile touch controls.

## Requirements

- Node.js 20.6 or newer.
- A Gemini API key for AI-generated replies.

## Run locally with Node.js

Clone the repository:

```bash
git clone https://github.com/ZamriSharaff/quote-desk-cocoon.git
cd quote-desk-cocoon
```

Create `.env` from the example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Add your Gemini API key to `.env`, then run:

```bash
npm test
npm start
```

Open http://localhost:8787.

## Test Cloudflare Pages locally

Create a `.dev.vars` file in the project root containing your Gemini API key.

Then run:

```bash
npm run build
npm run pages:dev
```

Open http://localhost:8788.

## Cloudflare Pages deployment

The project is connected to GitHub for automatic deployments.

Build command:

```bash
npm run build
```

Build output directory:

```text
public
```

Configure `GEMINI_API_KEY` as an encrypted secret in Cloudflare Pages. The key is never included in frontend code.

## Project structure

| Path | Description |
|---|---|
| `data/` | Source product catalogue and sample enquiries |
| `public/` | Frontend HTML, CSS, JavaScript and published catalogue |
| `functions/` | Cloudflare Pages API endpoints |
| `src/catalogue.js` | Local catalogue loading and search |
| `src/quote.js` | Discount, VAT and quotation calculations |
| `src/llm.js` | Gemini integration and reply generation |
| `src/server.js` | Local Node.js HTTP server |
| `scripts/` | Build preparation scripts |
| `test/` | Automated tests |

## Current limitations

- Meridian live pricing is not integrated.
- Stock information is indicative and requires warehouse confirmation.
- Internet connectivity is required for AI-generated replies.
- Owner approval notifications and desktop integration are not implemented.
- Offline support and user authentication are not implemented.
- WhatsApp messages must be reviewed, copied and sent manually.

Quote Desk is a functional prototype, not a production-ready business system.

## Licence

MIT
