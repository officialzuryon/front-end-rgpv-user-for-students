/**
 * SEO Page Generator — Creates static landing pages for INDIVIDUAL PAPERS
 * 
 * Run: node seo/generate-papers.js
 * Output: paper/[id].html (one page per paper)
 * 
 * Generates massive amounts of perfectly optimized SEO pages directly linked
 * to Vercel's clean routing. Requires the Firebase Admin SDK inside `back/`.
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Ensure correct path to the downloaded service account key
const serviceAccountPath = path.join(__dirname, '../../..', 'rrpv-papers-firebase-adminsdk-fbsvc-6283f2a950.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('ERROR: Firebase Admin JSON not found at', serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const DOMAIN = 'https://rgpvpyq.co.in';

const outDir = path.join(__dirname, '..', 'paper');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Ensure the source template exists
const templatePath = path.join(__dirname, '..', 'paper.html');
if (!fs.existsSync(templatePath)) {
  console.error('ERROR: Missing paper.html template at', templatePath);
  process.exit(1);
}
const templateHtml = fs.readFileSync(templatePath, 'utf-8');

async function generateAllPapers() {
  console.log('Connecting to Firebase and fetching papers...');
  const snapshot = await db.collection('papers').get();
  const papers = [];
  
  snapshot.forEach(doc => {
    papers.push({ id: doc.id, ...doc.data() });
  });

  console.log(`Found ${papers.length} papers. Generating static HTML pages...`);

  let sitemapEntries = '';

  papers.forEach(p => {
    const titleText = `${(p.title || p.subject || 'Question Paper').replace(/"/g, '')} - RGPV Previous Year Paper`.replace(/\s+/g, ' ');
    const descText = `Download or view the ${p.year || ''} ${p.title || p.subject || ''} (${p.code || ''}) question paper for ${p.branch || ''}, Semester ${p.semester || ''}. Free RGPV previous year paper.`.replace(/"/g, '').replace(/\s+/g, ' ');
    const canonicalUrl = `${DOMAIN}/paper/${p.id}`;

    let html = templateHtml;

    // Fix relative paths for assets
    html = html.replace(/href="css\//g, 'href="../css/');
    html = html.replace(/src="js\//g, 'src="../js/');
    html = html.replace(/href="index\.html"/g, 'href="../index.html"');
    html = html.replace(/href="papers\.html"/g, 'href="../papers.html"');
    html = html.replace(/href="blog\.html"/g, 'href="../blog.html"');
    html = html.replace(/href="about\.html"/g, 'href="../about.html"');
    html = html.replace(/href="contact\.html"/g, 'href="../contact.html"');
    html = html.replace(/href="privacy-policy\.html"/g, 'href="../privacy-policy.html"');
    html = html.replace(/href="\/favicon\.png"/g, 'href="../favicon.png"');

    // Fix meta tags
    html = html.replace(/<title>.*?<\/title>/s, `<title>${titleText}</title>`);
    html = html.replace(/name="description"\s*content="[^"]*"/, `name="description" content="${descText}"`);
    
    // Remove the JS canonical setter block that paper.html uses and replace it with strict canonical link
    html = html.replace(/<link rel="canonical" id="pageCanonical" href="[^"]*"\s*\/>\s*<script>[\s\S]*?<\/script>/, `<link rel="canonical" href="${canonicalUrl}" />`);
    
    // Open Graph
    html = html.replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${titleText}" />`);
    html = html.replace(/<meta property="og:description"\s*content="[^"]*"\s*\/>/s, `<meta property="og:description" content="${descText}" />`);
    html = html.replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${canonicalUrl}" />`);

    // Schema
    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": titleText,
      "description": descText,
      "url": canonicalUrl
    };
    html = html.replace(/<script type="application\/ld\+json">.*?<\/script>/s, `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n  </script>`);

    // Write file
    const filePath = path.join(outDir, `${p.id}.html`);
    fs.writeFileSync(filePath, html, 'utf-8');

    // Build sitemap entry
    const lastMod = p.createdAt ? new Date(p.createdAt._seconds * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    sitemapEntries += `\n  <url>\n    <loc>${canonicalUrl}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.65</priority>\n  </url>`;
  });

  console.log(`Successfully generated ${papers.length} HTML files in front/paper/`);

  // Update sitemap.xml
  const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    let sitemap = fs.readFileSync(sitemapPath, 'utf-8');
    sitemap = sitemap.replace(/\n  <!-- INDIVIDUAL PAPERS -->[\s\S]*?<!-- \/INDIVIDUAL PAPERS -->/g, '');
    sitemap = sitemap.replace('</urlset>', `\n  <!-- INDIVIDUAL PAPERS -->${sitemapEntries}\n  <!-- /INDIVIDUAL PAPERS -->\n\n</urlset>`);
    fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
    console.log(`Updated sitemap.xml with ${papers.length} individual paper entries.`);
  }

  console.log('All individual paper SEO generation complete!');
  process.exit(0);
}

generateAllPapers().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
