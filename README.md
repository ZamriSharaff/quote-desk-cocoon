# Quote Desk

A lightweight quotation tool for Lakeside Kitchen Supply, built as part of the Cocoon engineering exercise.

Quote Desk helps salespeople find products, prepare quotations and draft customer replies without manually calculating prices.

## Features

- Search products by name or SKU from the local catalogue.
- Add products and quantities to a quotation.
- Automatically calculate bulk discounts, VAT and totals.
- Flag quotations that require owner's approval.
- Generate WhatsApp reply drafts using Google's Gemini API.
- Edit and copy the generated message before sending it manually.

All financial calculations are handled by the application, not the AI model.

## Requirements

- Node.js 20.6 or newer.
- A Gemini API key for AI generated replies.

## Getting started

Clone the repository:

```bash
git clone https://github.com/ZamriSharaff/quote-desk-cocoon.git
cd quote-desk-cocoon
```

Create your local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Add your Gemini API key to `.env`:

```env
PORT=8787
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
```

## Running the application

Run the tests:

```bash
npm test
```

Start the server:

```bash
npm start
```

Open the application at:

http://localhost:8787

## Project structure

| Path | Description |
|---|---|
| `data/` | Product catalogue and sample enquiries |
| `public/` | Frontend HTML, CSS and JavaScript |
| `src/catalogue.js` | Catalogue loading and product search |
| `src/quote.js` | Discount, VAT and quotation calculations |
| `src/server.js` | HTTP server and API endpoints |
| `src/llm.js` | Gemini API integration and reply generation |
| `test/` | Automated tests |

## Current limitations

- Product prices come from a local catalogue; live Meridian pricing is not integrated.
- Stock information is indicative and requires warehouse confirmation.
- Internet connectivity is required for AI generated replies.
- Quotes requiring approval are flagged, but approval notifications and workflows are not implemented.
- WhatsApp messages must be reviewed, copied and sent manually.
- Offline functionality and user authentication are not implemented.

This is a functional prototype and is not yet intended for production use.

## Licence

MIT
