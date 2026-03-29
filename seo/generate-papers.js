/**
 * SEO Page Generator — Creates static landing pages for INDIVIDUAL PAPERS
 * 
 * Run: node seo/generate-papers.js
 * Output: paper/[id].html (one page per paper)
 * 
 * Generates perfectly optimized SEO pages with:
 * - Paper code in title for long-tail keyword ranking
 * - DigitalDocument schema.org structured data
 * - BreadcrumbList schema for rich snippets
 * - Rich on-page content for crawlers
 * - Proper canonical URLs
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

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsonString(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function generatePaperHtml(p, siblings = []) {
  const code = p.code || '';
  const title = p.title || p.subject || 'Question Paper';
  const year = p.year || '';
  const semester = p.semester || '';
  const branch = p.branch || '';
  const university = p.university || 'RGPV';
  const subject = p.subject || title;
  const canonicalUrl = `${DOMAIN}/paper/${p.id}`;

  // SEO-optimized title: Code first for paper-code searches
  const pageTitle = code
    ? `${code} ${title} (${year}) | ${university} PYQ | Semester ${semester} | Free PDF`
    : `${title} (${year}) | ${university} Previous Year Paper | Semester ${semester}`;

  // Keyword-dense meta description
  const metaDesc = `${university} ${code} ${title} previous year question paper (${year}). Semester ${semester}, ${branch}. View free PYQ PDF online — no download needed. RGPV previous year papers.`.replace(/\s+/g, ' ').trim();

  // Keywords
  const metaKeywords = [
    `${university} ${code}`, `${code} question paper`, `${university} ${title} PYQ`,
    `${title} previous year paper`, `${university} semester ${semester} papers`,
    `${branch} papers`, `${code} ${year}`, `RGPV PYQ`, `RGPV papers`
  ].join(', ');

  // Schema.org: DigitalDocument 
  const documentSchema = {
    "@context": "https://schema.org",
    "@type": "DigitalDocument",
    "name": `${code} ${title} - ${university} Question Paper (${year})`,
    "description": metaDesc,
    "url": canonicalUrl,
    "datePublished": year ? `${year}-01-01` : undefined,
    "educationalLevel": `Semester ${semester}`,
    "about": {
      "@type": "Course",
      "name": subject,
      "courseCode": code,
      "provider": {
        "@type": "Organization",
        "name": university === 'RGPV' ? 'Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV)' : university
      }
    },
    "publisher": {
      "@type": "Organization",
      "name": "RGPV Papers",
      "url": DOMAIN
    },
    "inLanguage": "en",
    "accessMode": "visual",
    "isAccessibleForFree": true
  };

  // Remove undefined values
  Object.keys(documentSchema).forEach(k => documentSchema[k] === undefined && delete documentSchema[k]);

  // Schema.org: BreadcrumbList
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": DOMAIN },
      { "@type": "ListItem", "position": 2, "name": "Papers", "item": `${DOMAIN}/papers` },
      { "@type": "ListItem", "position": 3, "name": branch || "All Branches", "item": `${DOMAIN}/papers?q=${encodeURIComponent(branch)}` },
      { "@type": "ListItem", "position": 4, "name": `${code} ${title} (${year})` }
    ]
  };

  // Static paper data for JS
  const paperDataJson = JSON.stringify(p);

  // Created date
  let createdDate = '—';
  if (p.createdAt) {
    try {
      const d = p.createdAt._seconds ? new Date(p.createdAt._seconds * 1000) : new Date(p.createdAt);
      createdDate = d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch(e) { createdDate = '—'; }
  }

  return `<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDesc)}" />
  <meta name="keywords" content="${escapeHtml(metaKeywords)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- OG -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(metaDesc)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${DOMAIN}/assets/og-image.jpg" />
  <meta property="og:site_name" content="RGPV Papers" />
  <meta property="og:locale" content="en_IN" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(metaDesc)}" />

  <!-- Schema: DigitalDocument -->
  <script type="application/ld+json">
  ${JSON.stringify(documentSchema, null, 2)}
  </script>

  <!-- Schema: BreadcrumbList -->
  <script type="application/ld+json">
  ${JSON.stringify(breadcrumbSchema, null, 2)}
  </script>

  <link rel="icon" type="image/png" sizes="192x192" href="../favicon.png" />
  <link rel="apple-touch-icon" href="../favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="../css/style.css" />
  <link rel="stylesheet" href="../css/papers.css" />
</head>

<body>

  <!-- Navbar -->
  <nav class="navbar" id="navbar" role="navigation" aria-label="Main navigation">
    <div class="container nav-inner">
      <a href="../index.html" class="nav-logo" aria-label="RGPV Papers Home">
        <img src="../assets/logo-icon.png" alt="RGPV Papers Logo" style="width: 32px; height: 32px; object-fit: contain; border-radius: 4px;" />
        <div class="logo-text"><span>RGPV</span> Papers</div>
      </a>
      <ul class="nav-links" role="list">
        <li><a href="../index.html">Home</a></li>
        <li><a href="../papers.html" class="active">Papers</a></li>
        <li><a href="../subjects.html">Subjects</a></li>
        <li><a href="../syllabus.html">Syllabus</a></li>
        <li><a href="../blog.html">Blog</a></li>
        <li><a href="../about.html">About</a></li>
        <li><a href="../contact.html">Contact</a></li>
      </ul>
      <div class="nav-actions">
        <a href="../papers.html" class="btn btn-primary btn-sm">🔍 Search Papers</a>
        <button class="hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </nav>

  <div class="mobile-menu" id="mobileMenu" role="navigation">
    <a href="../index.html">🏠 Home</a>
    <a href="../papers.html">📄 Papers</a>
    <a href="../subjects.html">📚 Subjects</a>
    <a href="../syllabus.html">📑 Syllabus</a>
    <a href="../blog.html">✍️ Blog</a>
    <a href="../about.html">ℹ️ About</a>
    <a href="../contact.html">📧 Contact</a>
  </div>

  <!-- Page Header -->
  <header class="page-header">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="../index.html">Home</a> <span aria-hidden="true">›</span>
        <a href="../papers.html">Papers</a> <span aria-hidden="true">›</span>
        ${branch ? `<a href="../papers.html?q=${encodeURIComponent(branch)}">${escapeHtml(branch)}</a> <span aria-hidden="true">›</span>` : ''}
        <span>${escapeHtml(code)} ${escapeHtml(title)} (${year})</span>
      </nav>
      <h1>📄 ${escapeHtml(university)} ${escapeHtml(code)} ${escapeHtml(title)} — Previous Year Question Paper (${year})</h1>
      <p>${escapeHtml(university)} ${escapeHtml(code)} ${escapeHtml(subject)} question paper for ${escapeHtml(branch)}, Semester ${semester}. View free PYQ online.</p>
    </div>
  </header>

  <!-- Main -->
  <main class="main-content" style="background-color: var(--bg-body); min-height: 100vh; padding: 2rem 0;">
    <style>
      @media (max-width: 768px) {
        .page-header {
          padding: calc(var(--nav-height) + 16px) 0 20px !important;
        }

        .page-header h1 {
          font-size: 1.3rem !important;
        }

        .page-header p {
          display: none;
        }

        .main-content {
          padding: 1rem 0 !important;
        }

        .back-nav {
          margin-bottom: 10px !important;
        }

        .paper-header {
          padding: 16px !important;
          margin-bottom: 12px !important;
        }

        .paper-title {
          font-size: 1.1rem !important;
          margin-bottom: 8px !important;
        }

        .paper-details-grid {
          gap: 8px !important;
          padding-top: 10px !important;
        }

        .detail-label {
          font-size: 0.62rem !important;
        }

        .detail-value {
          font-size: 0.82rem !important;
        }

        #openViewerBtn {
          width: 100%;
          justify-content: center;
        }
      }
    </style>
    <div class="container paper-view-container">

      <a href="../papers.html" class="back-nav">← Back to Search</a>

      <div id="loadingState" style="display:none;">
        <div class="spinner" style="margin: 0 auto; width: 40px; height: 40px;"></div>
        <p style="margin-top:20px; color: var(--text-muted); font-weight: 500;">Loading paper details...</p>
      </div>

      <div id="errorState" style="display:none;">
        <h2>Paper Not Found</h2>
        <p style="color:var(--text-muted);">The question paper you are looking for does not exist or has been removed.
        </p>
        <a href="../papers.html" class="btn btn-primary" style="margin-top: 20px;">Browse All Papers</a>
      </div>

      <div id="paperContent" style="display:block;">
        <div class="paper-header">
          <h1 class="paper-title" id="pTitle">${escapeHtml(title)}</h1>
          <div class="paper-meta-tags">
            <span class="badge badge-purple" id="pCode">${escapeHtml(code)}</span>
            <span class="badge badge-teal" id="pSem">Semester ${semester}</span>
            <span class="badge badge-orange" id="pYear">${year}</span>
          </div>

          ${siblings.length > 1 ? `
          <div style="margin-top: 16px;">
            <label for="yearSelector" style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-right: 8px;">Switch Year:</label>
            <select id="yearSelector" onchange="if(this.value) window.location.href='../paper/' + this.value;" style="padding: 6px 12px; border-radius: 4px; border: 1px solid var(--border); font-size: 0.9rem; font-weight: 600; cursor: pointer; min-width: 120px; background: #fff;">
              ${siblings.map(s => `<option value="${s.id}" ${s.id === p.id ? 'selected' : ''}>${s.year || 'Unknown'}</option>`).join('')}
            </select>
          </div>
          ` : ''}

          <div class="paper-details-grid">
            <div class="detail-item">
              <span class="detail-label">Subject</span>
              <span class="detail-value" id="pSubject">${escapeHtml(subject)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">University</span>
              <span class="detail-value" id="pUni">${escapeHtml(university)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Branch / Course</span>
              <span class="detail-value" id="pBranch">${escapeHtml(branch)}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Added On</span>
              <span class="detail-value" id="pDate">${createdDate}</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 24px; display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
          <button id="openViewerBtn" class="btn btn-primary btn-lg"
            style="padding: 18px 40px; font-size: 1.1rem; box-shadow: var(--shadow-md);">
            <span style="font-size: 1.3rem; margin-right: 8px;">👁️</span> View Question Paper Full Screen
          </button>
            <button id="sharePaperBtn" class="btn-share" style="padding: 18px 40px; font-size: 1.1rem; box-shadow: var(--shadow-sm); border: 2px solid var(--border);">
                <svg class="share-icon-svg" style="width: 22px; height: 22px;" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                <span>Share this Paper</span>
            </button>
        </div>

        <!-- SEO: Related links for internal linking -->
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="../papers.html?q=${encodeURIComponent(code)}" style="color: var(--primary); font-size: 0.9rem; font-weight: 600; text-decoration: none;">🔍 View all ${escapeHtml(code)} papers</a>
          ${branch ? ` &nbsp;·&nbsp; <a href="../papers.html?q=${encodeURIComponent(branch)}" style="color: var(--primary); font-size: 0.9rem; font-weight: 600; text-decoration: none;">📚 More ${escapeHtml(branch)} papers</a>` : ''}
        </div>
      </div>

    </div>
  </main>

  <!-- Paper Viewer Modal (no download) -->
  <div class="modal-overlay" id="viewerModal" role="dialog" aria-modal="true" aria-labelledby="viewerTitle">
    <div class="modal-box">
      <div class="modal-header">
        <h2 class="modal-title" id="viewerTitle" style="display: flex; align-items: center; gap: 8px;">
          Question Paper
          <div class="viewer-pagination"
            style="display: none; background: #f0f4f8; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; color: #4b5563; font-weight: 500;">
            Page <span id="pageNum">1</span> of <span id="pageCount">?</span>
          </div>
        </h2>
        <div class="modal-actions" style="display: flex; align-items: center; gap: 12px;">
          <button id="prevPage" class="btn btn-secondary btn-sm" aria-label="Previous Page"
            style="display: none; padding: 6px 10px; min-width: unset;">&larr;</button>
          <button id="nextPage" class="btn btn-secondary btn-sm" aria-label="Next Page"
            style="display: none; padding: 6px 10px; min-width: unset;">&rarr;</button>
          <button id="zoomOut" class="btn btn-secondary btn-sm" aria-label="Zoom Out"
            style="display: none; padding: 6px 10px; min-width: unset;">&minus;</button>
          <button id="zoomIn" class="btn btn-secondary btn-sm" aria-label="Zoom In"
            style="display: none; padding: 6px 10px; min-width: unset;">&plus;</button>
          <button class="modal-close" id="closeViewer" aria-label="Close viewer">✕</button>
        </div>
      </div>
      <div class="modal-body"
        style="position: relative; background: #e5e7eb; overflow: auto; padding: 20px; display: flex; justify-content: center; align-items: flex-start; min-height: 60vh;">

        <!-- Loading state behind canvas -->
        <div class="viewer-loader"
          style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 1;">
          <div class="spinner"></div>
          <span style="margin-top: 14px; font-size: 0.9rem; color: var(--text-muted); font-weight: 500;">Loading secure
            viewer...</span>
        </div>

        <!-- Secure Canvas Viewer container with native scroll support -->
        <div id="pdfContainer"
          style="position: relative; z-index: 10; display: none; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
          <canvas id="pdfCanvas"
            style="display: block; width: 100%; height: auto; border-radius: 4px; pointer-events: none; transform-origin: top center;"
            oncontextmenu="return false;"></canvas>
        </div>

      </div>
      <div class="no-download-notice" aria-hidden="true" style="z-index: 101;">🔒 View Only — Secure PDF Renderer</div>
    </div>
  </div>

  <!-- Footer -->
  <footer class="footer" role="contentinfo">
    <div class="container">
      <div class="footer-top">
        <div class="footer-about">
          <div class="footer-logo">
            <img src="../assets/logo-icon.png" alt="RGPV Papers Logo" style="width: 32px; height: 32px; object-fit: contain; border-radius: 4px;" />
            <span style="color:#fff;font-weight:800;"><span style="color:var(--primary-light)">RGPV</span> Papers</span>
          </div>
          <p>Your go-to portal for RGPV and MP university question papers. Free, organized, and always updated.</p>
        </div>
        <div class="footer-col">
          <h4>Navigation</h4>
          <ul>
            <li><a href="../index.html">Home</a></li>
            <li><a href="../papers.html">Browse Papers</a></li>
            <li><a href="../blog.html">Blog</a></li>
            <li><a href="../about.html">About</a></li>
            <li><a href="../contact.html">Contact</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Branches</h4>
          <ul>
            <li><a href="../papers.html?branch=cs">Computer Science</a></li>
            <li><a href="../papers.html?branch=it">Information Technology</a></li>
            <li><a href="../papers.html?branch=ec">Electronics</a></li>
            <li><a href="../papers.html?branch=me">Mechanical</a></li>
            <li><a href="../papers.html?branch=ce">Civil</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Contact</h4>
          <ul>
            <li><a href="../privacy-policy.html">Privacy Policy</a></li>
            <li><a href="mailto:customerservice.filezone@gmail.com">Email Support</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© <span id="currentYear"></span> RGPV Papers. All rights reserved.</p>
      </div>
    </div>
  </footer>

  <button class="scroll-top" id="scrollTop" aria-label="Scroll to top">↑</button>

  <!-- PDF.js library -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    // Set worker source for PDF.js
    if (typeof window.pdfjsLib !== 'undefined') {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  </script>
  
  <script src="../js/main.js" defer></script>
  <script src="../js/paper-view.js" defer></script>

  <script>
    // Injected by generate-papers.js
    window.PAPER_STATIC = true;
    window.PAPER_DATA = ${paperDataJson};
  </script>
  
</body>

</html>`;
}

async function generateAllPapers() {
  console.log('Connecting to Firebase and fetching papers...');
  const snapshot = await db.collection('papers').get();
  const papers = [];
  
  snapshot.forEach(doc => {
    papers.push({ id: doc.id, ...doc.data() });
  });

  const paperGroups = {};
  papers.forEach(p => {
    const key = ((p.code || '') + '-' + (p.title || p.subject || '')).toLowerCase().trim();
    if (!paperGroups[key]) paperGroups[key] = [];
    paperGroups[key].push(p);
  });

  const prunedPapers = [];
  Object.values(paperGroups).forEach(group => {
    group.sort((a, b) => {
      const yearDiff = (parseInt(b.year) || 0) - (parseInt(a.year) || 0);
      if (yearDiff !== 0) return yearDiff;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    const top4 = group.slice(0, 4);
    top4.forEach(p => prunedPapers.push({ ...p, _siblings: top4 }));
  });

  console.log(`Found ${papers.length} papers. Pruned to ${prunedPapers.length} (max 4 per subject).`);

  let sitemapEntries = '';
  let generated = 0;

  prunedPapers.forEach(p => {
    const html = generatePaperHtml(p, p._siblings);
    const filePath = path.join(outDir, `${p.id}.html`);
    fs.writeFileSync(filePath, html, 'utf-8');
    generated++;

    if (generated % 100 === 0) {
      console.log(`  Generated ${generated}/${prunedPapers.length} pages...`);
    }

    // Build sitemap entry
    const canonicalUrl = `${DOMAIN}/paper/${p.id}`;
    const lastMod = p.createdAt ? 
      (p.createdAt._seconds ? new Date(p.createdAt._seconds * 1000).toISOString().split('T')[0] : '2024-06-01') 
      : '2024-06-01';
    sitemapEntries += `\n  <url>\n    <loc>${canonicalUrl}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.65</priority>\n  </url>`;
  });

  console.log(`\nSuccessfully generated ${generated} HTML files in front/paper/`);

  // Update sitemap.xml
  const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    let sitemap = fs.readFileSync(sitemapPath, 'utf-8');
    sitemap = sitemap.replace(/\n  <!-- INDIVIDUAL PAPERS -->[\s\S]*?<!-- \/INDIVIDUAL PAPERS -->/g, '');
    sitemap = sitemap.replace('</urlset>', `\n  <!-- INDIVIDUAL PAPERS -->${sitemapEntries}\n  <!-- /INDIVIDUAL PAPERS -->\n\n</urlset>`);
    fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
    console.log(`Updated sitemap.xml with ${generated} individual paper entries.`);
  }

  console.log('\n=== SEO IMPROVEMENTS APPLIED ===');
  console.log('✅ Paper code in <title> for long-tail keyword ranking');
  console.log('✅ DigitalDocument schema.org structured data');
  console.log('✅ BreadcrumbList schema for Google rich snippets');
  console.log('✅ Keyword-dense meta descriptions');
  console.log('✅ Rich breadcrumbs: Home > Papers > Branch > Paper');
  console.log('✅ Internal links to related papers by code & branch');
  console.log('✅ OG + Twitter card meta tags');
  console.log('\nAll individual paper SEO generation complete!');
  process.exit(0);
}

generateAllPapers().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
