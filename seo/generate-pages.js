/**
 * SEO Page Generator — Massive Auto-Generator
 * 
 * Run: node seo/generate-pages.js
 * Output: papers/*.html (443+ Landing Pages)
 */

const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://rgpvpyq.co.in';
const outDir = path.join(__dirname, '..', 'papers');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Load Hand-Authored SEO Configs
const manualSubjects = JSON.parse(fs.readFileSync(path.join(__dirname, 'subjects.json'), 'utf-8'));

// Load Real Database Dump
const dataPath = path.join(__dirname, '..', 'js', 'papers-data.json');
const papersData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const allPapers = papersData.papers || [];

// Master list of subjects to generate
const finalSubjects = [];

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

// 1. Process manual subjects first
const existingSlugs = new Set();
const existingTitles = new Set();

manualSubjects.forEach(s => {
  existingSlugs.add(s.slug);
  existingTitles.add(s.title.toLowerCase());
  finalSubjects.push(s);
});

// 2. Discover ALL unique subjects from the database and generate metadata for the rest
const paperSubjectsMap = {}; 

allPapers.forEach(p => {
  const subjName = (p.title || p.subject || '').trim();
  if (!subjName) return;
  
  const lowerName = subjName.toLowerCase();
  
  // If we already hand-authored it, skip auto-gen.
  // Exception: if manualSubjects title is slightly different but they mean the same thing, 
  // maybe it creates a duplicate. But for now, strict equivalence.
  if (existingTitles.has(lowerName)) return;

  if (!paperSubjectsMap[lowerName]) {
    paperSubjectsMap[lowerName] = {
      title: subjName,
      codes: new Set(),
      branch: p.branch || 'Common',
      semester: p.semester || 'N/A'
    };
  }
  if (p.code) paperSubjectsMap[lowerName].codes.add(p.code);
});

Object.values(paperSubjectsMap).forEach(data => {
  const slug = slugify(data.title);
  if (existingSlugs.has(slug)) return; // prevent exact slug collision
  
  existingSlugs.add(slug);
  const codesArr = Array.from(data.codes);
  const primaryCode = codesArr[0] || '';
  const codeDisplay = codesArr.length ? codesArr.join(', ') : '';

  // Generate Dummy High-Quality SEO Metadata
  finalSubjects.push({
    slug: slug,
    title: data.title,
    codes: codesArr,
    semester: data.semester,
    branch: data.branch,
    university: 'RGPV',
    keywords: `RGPV ${data.title} question papers, ${data.title} Pyq, RGPV ${codeDisplay} papers, semester ${data.semester}`,
    description: `Download free RGPV previous year question papers for ${data.title} (${codeDisplay}). Prepare with high quality PYQ papers for Semester ${data.semester}`,
    topics: ['Important Question Papers', 'Previous Year Questions (PYQ)', 'University Exams'],
    faq: [
      {
        q: `What is the paper code for ${data.title}?`,
        a: `The paper code for ${data.title} is generally recognized as ${primaryCode} in RGPV.`
      },
      {
        q: `Are these ${data.title} papers free to download?`,
        a: `Yes, all ${data.title} question papers on RGPV Papers are completely free to view and use for preparation.`
      }
    ]
  });
});

console.log(`Found ${manualSubjects.length} manual subjects and ${finalSubjects.length - manualSubjects.length} auto-generated subjects. Total: ${finalSubjects.length}`);


// HTML GENERATION
function generatePage(subject) {
  const { slug, title, codes, semester, branch, keywords, description, topics, faq } = subject;
  const pageUrl = `${DOMAIN}/papers/${slug}`;
  const primaryCode = codes[0] || '';
  const allCodesDisplay = codes.length > 0 ? codes.slice(0, 4).join(', ') : 'RGPV';
  const uni = subject.university || 'RGPV';
  const fullTitle = `${uni} ${title} PYQ & Previous Year Papers | ${allCodesDisplay} | Free PDF View`;

  // Build codes array for JavaScript matching
  const codesArrayStr = JSON.stringify(codes.map(c => c.toLowerCase().replace(/[\s-]/g, '')));

  const faqSchemaItems = faq.map((f, i) => `{
        "@type": "Question",
        "name": "${f.q.replace(/"/g, '\\"')}",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "${f.a.replace(/"/g, '\\"')}"
        }
      }`).join(',\n      ');

  const topicsList = topics.map(t => `<span class="topic-chip">${t}</span>`).join('\n        ');
  const codesList = codes.map(c => `<span class="code-chip">${c}</span>`).join('\n        ');
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
      "courseCode": "${primaryCode}",
      "alternateName": [${codes.map(c => `"${c}"`).join(', ')}],
      "provider": {
        "@type": "Organization",
        "name": "${uni} - Rajiv Gandhi Proudyogiki Vishwavidyalaya"
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

  <link rel="icon" type="image/png" sizes="192x192" href="../favicon.png" />
  <link rel="stylesheet" href="../css/style.css"/>
  <link rel="stylesheet" href="../css/papers.css"/>
  <style>
    .subject-hero { background: var(--gradient-card); border-radius: var(--radius-xl); border: 1px solid var(--border); padding: 36px; margin-bottom: 32px; }
    .subject-hero h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 12px; color: var(--text-primary); }
    .topic-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    .topic-chip { padding: 6px 14px; border-radius: var(--radius-pill); background: rgba(108,58,224,0.1); color: var(--primary); font-size: 0.78rem; font-weight: 600; }
    .code-chip { padding: 6px 14px; border-radius: var(--radius-pill); background: rgba(0,180,216,0.1); color: var(--secondary-dark); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.5px; }
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
      <li><a href="../papers.html">Papers</a></li>
      <li><a href="../subjects.html">Subjects</a></li>
      <li><a href="../blog.html">Blog</a></li>
      <li><a href="../about.html">About</a></li>
      <li><a href="../contact.html">Contact</a></li>
    </ul>
    <div class="nav-actions">
      <a href="../papers.html" class="btn btn-primary btn-sm">🔍 Search Papers</a>
    </div>
  </div>
</nav>

<!-- Page Header -->
<header class="page-header">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="../index.html">Home</a> <span aria-hidden="true">›</span>
      <a href="../papers.html">Papers</a> <span aria-hidden="true">›</span>
      <span>${title}</span>
    </nav>
    <h1>📄 ${uni} ${title} PYQ & Previous Year Papers</h1>
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
          <label>Paper Codes</label>
          <span>${allCodesDisplay}</span>
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
      <h2 style="margin-top: 20px;">🏷️ Known Paper Codes</h2>
      <div class="topic-chips" style="margin-top: 10px;">
        ${codesList || '<span class="code-chip">N/A</span>'}
      </div>
      <h2 style="margin-top: 20px;">📚 Topics Covered</h2>
      <div class="topic-chips">
        ${topicsList}
      </div>
    </div>

    <!-- Static Papers Fetcher -->
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
    </div>
    <div id="subjectPapers" class="papers-grid" aria-live="polite"></div>

    <!-- FAQ Section -->
    <section class="faq-section">
      <h2>❓ Frequently Asked Questions about RGPV ${title}</h2>
      ${faqHtml}
    </section>

    <!-- SEO Content Block -->
    <section class="seo-content">
      <h2>About ${uni} ${title} PYQ Question Papers</h2>
      <p>${uni} ${title} is a subject typically offered in Semester ${semester} for ${branch} students. This subject revolves around core academic principles for university exams.</p>
      <p>Practicing PYQ (previous year question papers) is the most effective strategy for ${uni} exam preparation. All ${uni} PYQ papers on RGPV Papers (rgpvpyq.co.in) are <strong>completely free to view</strong> — no downloads, no sign-ups.</p>
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
        <li><a href="../index.html">Home</a></li><li><a href="../papers.html">Browse Papers</a></li><li><a href="../subjects.html">Subjects</a></li>
      </ul></div>
    </div>
  </div>
</footer>

<script>
  (async function() {
    const subjectTitle = '${title.toLowerCase()}';
    const normalizedCodes = ${codesArrayStr};

    function normalize(str) { return String(str).toLowerCase().replace(/[\\s\\-]/g, ''); }
    function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    try {
      const res = await fetch('../js/papers-data.json');
      const data = await res.json();
      const loadEl = document.getElementById('papersLoading');
      const emptyEl = document.getElementById('papersEmpty');
      const countEl = document.getElementById('resultsCount');
      const grid = document.getElementById('subjectPapers');
      
      if (loadEl) loadEl.style.display = 'none';

      const matchedPapers = data.papers.filter(p => {
        const pCode = normalize(p.code || '');
        const pTitle = (p.title || '').toLowerCase();
        const pSubj = (p.subject || '').toLowerCase();

        const codeMatch = normalizedCodes.some(nc => nc && (pCode === nc || pCode.includes(nc) || nc.includes(pCode)));
        const nameMatch = pTitle.includes(subjectTitle) || pSubj.includes(subjectTitle) || subjectTitle.includes(pTitle) || subjectTitle.includes(pSubj);
        
        return codeMatch || nameMatch;
      });

      if (!matchedPapers.length) {
        if (emptyEl) emptyEl.style.display = 'flex';
        return;
      }

      if (countEl) countEl.innerHTML = 'Showing <strong>' + matchedPapers.length + '</strong> ${title} papers';

      grid.innerHTML = matchedPapers.map(p => \`
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
            </div>
          </div>
          <div class="paper-card-footer">
            <a href="../paper/\${p.id}" class="btn btn-primary btn-sm" style="width:100%;text-align:center;">👁 View Paper</a>
          </div>
        </article>\`).join('');
    } catch(e) {
      console.error(e);
      document.getElementById('papersLoading').style.display = 'none';
    }
  })();
</script>
</body>
</html>`;
}

// Generate all pages
let sitemapEntries = '';
finalSubjects.forEach(subject => {
  const html = generatePage(subject);
  const filePath = path.join(outDir, subject.slug + '.html');
  fs.writeFileSync(filePath, html, 'utf-8');
  sitemapEntries += '\n  <url>\n    <loc>' + DOMAIN + '/papers/' + subject.slug + '</loc>\n    <lastmod>' + new Date().toISOString().split('T')[0] + '</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>';
});

// Update sitemap.xml with new pages
const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf-8');
sitemap = sitemap.replace(/\n  <!-- SUBJECT PAGES -->[\s\S]*?<!-- \/SUBJECT PAGES -->/g, '');
sitemap = sitemap.replace('</urlset>', '\n  <!-- SUBJECT PAGES -->' + sitemapEntries + '\n  <!-- /SUBJECT PAGES -->\n\n</urlset>');
fs.writeFileSync(sitemapPath, sitemap, 'utf-8');

console.log('\nUpdated sitemap.xml with ' + finalSubjects.length + ' subject page entries');
console.log('\nDone! Generated ' + finalSubjects.length + ' subject landing pages.');
