/**
 * SEO Page Generator — Creates static subject landing pages
 * 
 * Run: node seo/generate-pages.js
 * Output: papers/*.html (one page per subject)
 * 
 * These static pages are crawlable by Google/Bing and target
 * specific long-tail keywords like "RGPV data structures paper"
 */

const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://rgpvpyq.co.in';
const subjects = JSON.parse(fs.readFileSync(path.join(__dirname, 'subjects.json'), 'utf-8'));
const outDir = path.join(__dirname, '..', 'papers');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function generatePage(subject) {
  const { slug, title, code, semester, branch, keywords, description, topics, faq } = subject;
  const pageUrl = `${DOMAIN}/papers/${slug}`;
  const fullTitle = `RGPV ${title} Previous Year Papers | ${code} | Free PDF View`;

  const faqSchemaItems = faq.map((f, i) => `{
        "@type": "Question",
        "name": "${f.q.replace(/"/g, '\\"')}",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "${f.a.replace(/"/g, '\\"')}"
        }
      }`).join(',\n      ');

  const topicsList = topics.map(t => `<li>${t}</li>`).join('\n              ');
  const faqHtml = faq.map(f => `
          <details class="faq-item">
            <summary class="faq-question">${f.q} <span>+</span></summary>
            <p class="faq-answer">${f.a}</p>
          </details>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${fullTitle}</title>
  <meta name="description" content="${description}"/>
  <meta name="keywords" content="${keywords}"/>
  <meta name="robots" content="index, follow"/>
  <link rel="canonical" href="${pageUrl}"/>

  <!-- Open Graph -->
  <meta property="og:type" content="website"/>
  <meta property="og:title" content="${fullTitle}"/>
  <meta property="og:description" content="${description}"/>
  <meta property="og:url" content="${pageUrl}"/>
  <meta property="og:image" content="${DOMAIN}/assets/og-image.jpg"/>
  <meta property="og:site_name" content="RGPV Papers"/>
  <meta property="og:locale" content="en_IN"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${fullTitle}"/>
  <meta name="twitter:description" content="${description}"/>

  <!-- Schema.org: CollectionPage + FAQPage -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "RGPV ${title} Previous Year Papers",
    "url": "${pageUrl}",
    "description": "${description}",
    "publisher": {
      "@type": "Organization",
      "name": "RGPV Papers",
      "url": "${DOMAIN}"
    },
    "about": {
      "@type": "Course",
      "name": "${title}",
      "courseCode": "${code}",
      "provider": {
        "@type": "Organization",
        "name": "RGPV - Rajiv Gandhi Proudyogiki Vishwavidyalaya"
      }
    }
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      ${faqSchemaItems}
    ]
  }
  </script>

  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📄</text></svg>"/>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="stylesheet" href="../css/style.css"/>
  <link rel="stylesheet" href="../css/papers.css"/>
  <style>
    .subject-hero { background: var(--gradient-card); border-radius: var(--radius-xl); border: 1px solid var(--border); padding: 36px; margin-bottom: 32px; }
    .subject-hero h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 12px; color: var(--text-primary); }
    .topic-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    .topic-chip { padding: 6px 14px; border-radius: var(--radius-pill); background: rgba(108,58,224,0.1); color: var(--primary); font-size: 0.78rem; font-weight: 600; }
    .subject-meta { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; margin-top: 18px; }
    .subject-meta-item { background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px 16px; }
    .subject-meta-item label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); display: block; margin-bottom: 2px; }
    .subject-meta-item span { font-size: 0.92rem; font-weight: 700; color: var(--text-primary); }
    .faq-section { background: #fff; border-radius: var(--radius-xl); border: 1px solid var(--border); padding: 28px; margin-top: 32px; }
    .faq-section h2 { font-size: 1.15rem; font-weight: 800; margin-bottom: 16px; }
    .faq-item { border-bottom: 1px solid var(--border); padding: 14px 0; }
    .faq-question { font-size: 0.92rem; font-weight: 700; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 12px; list-style: none; }
    .faq-question::marker, .faq-question::-webkit-details-marker { display: none; }
    details[open] .faq-question { color: var(--primary); }
    .faq-answer { font-size: 0.88rem; color: var(--text-secondary); padding-top: 10px; line-height: 1.7; }
    .seo-content { background: #fff; border-radius: var(--radius-xl); border: 1px solid var(--border); padding: 28px; margin-top: 32px; }
    .seo-content h2 { font-size: 1.1rem; font-weight: 800; margin-bottom: 12px; }
    .seo-content p { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.75; margin-bottom: 12px; }
  </style>
</head>
<body>

<!-- Navbar -->
<nav class="navbar" id="navbar" role="navigation" aria-label="Main navigation">
  <div class="container nav-inner">
    <a href="../index.html" class="nav-logo" aria-label="RGPV Papers Home">
      <div class="logo-icon" aria-hidden="true">📄</div>
      <div class="logo-text"><span>RGPV</span> Papers</div>
    </a>
    <ul class="nav-links" role="list">
      <li><a href="../index.html">Home</a></li>
      <li><a href="../papers.html" class="active">Papers</a></li>
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
  <a href="../index.html">🏠 Home</a><a href="../papers.html">📄 Papers</a><a href="../blog.html">✍️ Blog</a><a href="../about.html">ℹ️ About</a><a href="../contact.html">📧 Contact</a>
</div>

<!-- Page Header -->
<header class="page-header">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="../index.html">Home</a> <span aria-hidden="true">›</span>
      <a href="../papers.html">Papers</a> <span aria-hidden="true">›</span>
      <span>${title}</span>
    </nav>
    <h1>📄 RGPV ${title} Previous Year Papers</h1>
    <p>${description}</p>
  </div>
</header>

<!-- Main Content -->
<main class="section-padding">
  <div class="container">

    <!-- Subject Info Card -->
    <div class="subject-hero">
      <h2>📋 Subject Details</h2>
      <div class="subject-meta">
        <div class="subject-meta-item">
          <label>Paper Code</label>
          <span>${code}</span>
        </div>
        <div class="subject-meta-item">
          <label>Semester</label>
          <span>Semester ${semester}</span>
        </div>
        <div class="subject-meta-item">
          <label>Branch</label>
          <span>${branch}</span>
        </div>
        <div class="subject-meta-item">
          <label>University</label>
          <span>RGPV</span>
        </div>
      </div>
      <h2 style="margin-top: 20px;">📚 Topics Covered</h2>
      <div class="topic-chips">
        ${topics.map(t => `<span class="topic-chip">${t}</span>`).join('\n        ')}
      </div>
    </div>

    <!-- Papers from Firebase (dynamic) -->
    <div class="results-meta">
      <p class="results-count" id="resultsCount" aria-live="polite"></p>
    </div>
    <div id="papersLoading" class="loading-center" role="status">
      <div class="spinner"></div>
      <span>Loading ${title} papers…</span>
    </div>
    <div id="papersEmpty" class="empty-state" style="display:none;" role="status">
      <div class="empty-icon">📭</div>
      <h3>No Papers Found</h3>
      <p>No ${title} papers available yet. Check back soon or <a href="../papers.html">browse all papers</a>.</p>
    </div>
    <div id="subjectPapers" class="papers-grid" aria-live="polite"></div>

    <div style="text-align:center; margin-top:28px;">
      <a href="../papers.html?q=${encodeURIComponent(title)}" class="btn btn-secondary btn-lg">🔍 Search All ${title} Papers →</a>
    </div>

    <!-- FAQ Section (SEO rich snippet) -->
    <section class="faq-section">
      <h2>❓ Frequently Asked Questions</h2>
      ${faqHtml}
    </section>

    <!-- SEO Content Block -->
    <section class="seo-content">
      <h2>About RGPV ${title} (${code}) Question Papers</h2>
      <p>RGPV ${title} is a core subject offered in Semester ${semester} for ${branch} students at Rajiv Gandhi Proudyogiki Vishwavidyalaya (RGPV), Bhopal. The paper code ${code} covers fundamental concepts that are essential for building a strong foundation in ${title.toLowerCase()}.</p>
      <p>Practicing previous year question papers is the most effective strategy for RGPV exam preparation. Our collection of ${title} papers helps you understand the exam pattern, identify frequently asked topics, and improve your time management skills.</p>
      <p>All papers on RGPV Papers are <strong>completely free to view</strong> — no downloads, no sign-ups. Just open and start studying. We update our library regularly with the latest exam papers.</p>
    </section>

  </div>
</main>

<!-- Footer -->
<footer class="footer" role="contentinfo">
  <div class="container">
    <div class="footer-top">
      <div class="footer-about">
        <div class="footer-logo">
          <div class="logo-icon" aria-hidden="true">📄</div>
          <span style="color:#fff;font-weight:800;"><span style="color:var(--primary-light)">RGPV</span> Papers</span>
        </div>
        <p>Free previous year question papers for RGPV and MP university students.</p>
      </div>
      <div class="footer-col"><h4>Quick Links</h4><ul>
        <li><a href="../index.html">Home</a></li><li><a href="../papers.html">Browse Papers</a></li><li><a href="../blog.html">Blog</a></li><li><a href="../about.html">About</a></li><li><a href="../contact.html">Contact</a></li>
      </ul></div>
      <div class="footer-col"><h4>Popular Subjects</h4><ul>
        <li><a href="data-structures">Data Structures</a></li>
        <li><a href="engineering-mathematics">Engineering Mathematics</a></li>
        <li><a href="computer-networks">Computer Networks</a></li>
        <li><a href="dbms">DBMS</a></li>
        <li><a href="operating-systems">Operating Systems</a></li>
      </ul></div>
      <div class="footer-col"><h4>Legal</h4><ul>
        <li><a href="../privacy-policy.html">Privacy Policy</a></li><li><a href="../contact.html">Contact Us</a></li>
      </ul></div>
    </div>
    <div class="footer-bottom"><p>© <span id="currentYear"></span> RGPV Papers. All rights reserved.</p></div>
  </div>
</footer>
<button class="scroll-top" id="scrollTop" aria-label="Scroll to top">↑</button>

<!-- Firebase + Scripts -->
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js" defer></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js" defer></script>
<script src="../js/firebase-config.js" defer></script>
<script src="../js/main.js" defer></script>
<script>
  // Load papers for this subject from Firebase
  (function() {
    const subjectCode = '${code}';
    const subjectTitle = '${title}';

    function escHtml(str) {
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function init() {
      if (!window.RGPV || !window.RGPV.db) { setTimeout(init, 200); return; }
      const db = window.RGPV.db;
      const container = document.getElementById('subjectPapers');
      const loading = document.getElementById('papersLoading');
      const empty = document.getElementById('papersEmpty');
      const count = document.getElementById('resultsCount');

      db.collection('papers')
        .where('code', '==', subjectCode)
        .orderBy('year', 'desc')
        .get()
        .then(snap => {
          // Also try matching by subject/title field
          return db.collection('papers')
            .orderBy('createdAt', 'desc')
            .get()
            .then(allSnap => {
              const codeMatches = snap.docs.map(d => ({id: d.id, ...d.data()}));
              const titleLower = subjectTitle.toLowerCase();
              const titleMatches = allSnap.docs
                .filter(d => {
                  const data = d.data();
                  const t = (data.title || '').toLowerCase();
                  const s = (data.subject || '').toLowerCase();
                  const c = (data.code || '').toLowerCase();
                  return t.includes(titleLower) || s.includes(titleLower) || c === subjectCode.toLowerCase();
                })
                .map(d => ({id: d.id, ...d.data()}));

              // Merge and deduplicate
              const seen = new Set();
              const papers = [];
              [...codeMatches, ...titleMatches].forEach(p => {
                if (!seen.has(p.id)) { seen.add(p.id); papers.push(p); }
              });
              return papers;
            });
        })
        .then(papers => {
          if (loading) loading.style.display = 'none';
          if (!papers.length) { if (empty) empty.style.display = 'flex'; return; }
          if (count) count.innerHTML = 'Showing <strong>' + papers.length + '</strong> ' + subjectTitle + ' papers';
          container.innerHTML = papers.map(p => \`
            <article class="paper-card" role="article">
              <div class="paper-card-top">
                <div class="paper-card-code">📄 \${p.code || 'N/A'}</div>
                <h3 class="paper-card-title">\${escHtml(p.title || p.subject || 'Question Paper')}</h3>
              </div>
              <div class="paper-card-body">
                <div class="paper-meta-grid">
                  <div class="paper-meta-item"><label>Branch</label><span>\${escHtml(p.branch || 'General')}</span></div>
                  <div class="paper-meta-item"><label>Year</label><span>\${p.year || '—'}</span></div>
                  <div class="paper-meta-item"><label>Semester</label><span>Sem \${p.semester || '—'}</span></div>
                  <div class="paper-meta-item"><label>Subject</label><span>\${escHtml(p.subject || '—')}</span></div>
                </div>
              </div>
              <div class="paper-card-footer">
                <span class="badge badge-purple">\${escHtml(p.subject || '—')}</span>
                <a href="../papers.html?code=\${encodeURIComponent(p.code || '')}" class="view-btn">👁 View Paper</a>
              </div>
            </article>\`).join('');
        })
        .catch(err => {
          console.error('Load papers:', err);
          if (loading) loading.style.display = 'none';
          if (empty) { empty.style.display = 'flex'; empty.querySelector('p').textContent = 'Failed to load papers.'; }
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  })();
</script>
</body>
</html>`;
}

// Generate all pages
let sitemapEntries = '';
subjects.forEach(subject => {
  const html = generatePage(subject);
  const filePath = path.join(outDir, `${subject.slug}.html`);
  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`✅ Generated: papers/${subject.slug}.html`);
  sitemapEntries += `\n  <url>\n    <loc>${DOMAIN}/papers/${subject.slug}</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>`;
});

// Update sitemap.xml with new pages
const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf-8');
// Remove previous subject entries if any
sitemap = sitemap.replace(/\n  <!-- SUBJECT PAGES -->[\s\S]*?<!-- \/SUBJECT PAGES -->/g, '');
// Insert before closing tag
sitemap = sitemap.replace('</urlset>', `\n  <!-- SUBJECT PAGES -->${sitemapEntries}\n  <!-- /SUBJECT PAGES -->\n\n</urlset>`);
fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
console.log(`\n✅ Updated sitemap.xml with ${subjects.length} subject page entries`);
console.log(`\n🎉 Done! Generated ${subjects.length} subject landing pages.`);
