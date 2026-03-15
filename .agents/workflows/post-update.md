---
description: Commands to run after updating papers, blogs, or website content to keep SEO optimized
---

# Post-Update SEO & Deployment Workflow

Run these commands from the **frontend root folder**:
`a:\anti gravity projects\New folder\back\front`

---

## 1. After Uploading New Papers (from Admin Panel)

If you've only uploaded new papers via the Admin Panel, **no commands are needed** — the papers are stored in Firebase and served dynamically. The existing SEO landing pages will automatically pick up new papers that match their codes.

However, if you've added papers for a **new subject** that doesn't have a landing page yet, proceed to Step 2.

---

## 2. After Adding a New Subject

**a) Add the subject to `seo/subjects.json`**

Open `seo/subjects.json` and add a new entry with all required fields (slug, title, codes, semester, branch, keywords, description, topics, faq).

**b) Regenerate SEO landing pages + update sitemap**

// turbo
```powershell
node seo/generate-pages.js
```

This will:
- Generate a new static HTML page in `papers/` for the subject
- Automatically update `sitemap.xml` with the new page entry

---

## 3. After Any Website Code Change

Push to GitHub, Vercel auto-deploys:

```powershell
git add .
git commit -m "describe your changes here"
git push origin main
```

---

## 4. After Major Content Changes (Optional)

If you've made significant SEO changes (new pages, restructured content), resubmit the sitemap to search engines:

1. Go to [Google Search Console](https://search.google.com/search-console) → Sitemaps → Submit `https://rgpvpyq.co.in/sitemap.xml`
2. Go to [Bing Webmaster Tools](https://www.bing.com/webmasters) → Sitemaps → Submit the same URL

---

## Quick Reference Cheat Sheet

| Scenario | Commands |
|---|---|
| Uploaded papers via Admin | **None** — Firebase handles it |
| Added a new subject | `node seo/generate-pages.js` → then git push |
| Changed website code/styling | `git add . && git commit -m "msg" && git push origin main` |
| Major SEO update | Resubmit sitemap to Google/Bing |
