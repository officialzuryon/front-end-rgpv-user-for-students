# RGPV Papers - SEO & Static Data Generation

To ensure **Googlebot** can crawl and rank your papers, the site now uses a pre-rendering system. Instead of loading the papers dynamically from Firebase on each individual paper page (e.g., `chemistry.html`), the papers are downloaded into a static `papers.json` and then injected as pure HTML into the `.html` files.

This makes your site load instantly and makes all papers 100% visible to Google Search.

## When to run these scripts
You only need to run these scripts **after you add new papers** to your Firebase database.

## How to run the scripts

Open your terminal in the `front/` directory and run these commands:

### Step 1: Download latest data from Firebase
```bash
node scripts/generate-static-data.js
```
*What it does: Fetches all papers, universities, branches, and degrees using the public Firestore REST API and saves them to `js/papers-data.json`.*

### Step 2: Inject HTML into `papers/*.html`
```bash
node scripts/build-static-pages.js
```
*What it does: Reads `js/papers-data.json`, matches papers to their respective subject codes, and generates the raw HTML directly inside the `papers/*.html` files.*

## Pushing to Production
After you run the two commands above, simply commit your changes and push to GitHub (or deploy to Vercel). The updated static HTML will go live immediately.
