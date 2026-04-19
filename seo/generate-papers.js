const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://rgpvpyq.co.in';
const outDir = path.join(__dirname, '..');
const dataPath = path.join(outDir, 'js', 'papers-data.json');

console.log('Loading papers data for individual paper generation...');
if (!fs.existsSync(dataPath)) {
  console.error('ERROR: papers-data.json not found.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const papers = data.papers || [];

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const generatedUrls = [];

papers.forEach(paper => {
  if (!paper.universitySlug) return;

  const u = paper.universitySlug;
  const c = paper.courseSlug || 'course';
  const b = paper.branchSlug || 'branch';
  const s = paper.semesterSlug || 'sem';
  const sub = paper.subjectSlug || 'subject';
  
  const filename = `${u}-${c}-${b}-${s}-${sub}-${paper.year}.html`;

  const bC = (link, text) => `<a href="${link}">${escapeHtml(text)}</a>`;
  const breadcrumbsHtml = `<a href="index.html">Home</a> › ${bC('subjects.html', 'Directory')} › ${bC(`${u}.html`, paper.universityTitle)} › ${bC(`${u}-${c}.html`, paper.courseTitle)} › ${bC(`${u}-${c}-${b}.html`, paper.branchTitle)} › ${bC(`${u}-${c}-${b}-${s}.html`, paper.semesterTitle)} › ${bC(`${u}-${c}-${b}-${s}-${sub}.html`, paper.subjectTitle)}`;

  const pageTitle = `${paper.subjectTitle} - ${paper.universityTitle} ${paper.year} Question Paper`;
  const metaDesc = `Download or read the previous year question paper for ${paper.subjectTitle} (${paper.paperCode}) for ${paper.courseTitle} ${paper.branchTitle} ${paper.semesterTitle}.`;

  let questionsHtml = '';
  let faqSchemaQuestions = [];

  if (paper.questions && paper.questions.length > 0) {
      questionsHtml += `<h2 style="margin-top: 48px; margin-bottom: 24px; font-weight:800; color:var(--primary-dark);">Embedded Paper Text (OCR)</h2>`;
      questionsHtml += `<div class="card" style="padding: 32px;">`;
      
      paper.questions.forEach(q => {
          const qId = escapeHtml(q.id || `q${Math.random()}`);
          questionsHtml += `
            <div id="${qId}" class="question-block" style="margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px dashed var(--border);">
                <h3 style="color: var(--primary); margin-bottom: 16px; display:flex; justify-content:space-between; align-items:center; font-size:1.15rem;">
                    <span>${escapeHtml(q.number)} ${q.marks ? `<span class="badge" style="margin-left:12px; background:var(--bg-body); border:1px solid var(--border); color:var(--text-secondary);">${q.marks} Marks</span>` : ''}</span>
                    <a href="#${qId}" style="color:var(--text-muted); text-decoration:none; font-size:1.3rem;" title="Link to this question">#</a>
                </h3>
                <div style="white-space: pre-wrap; font-size: 1.05rem; line-height: 1.7; color: var(--text-primary); font-family: 'Inter', sans-serif;">${escapeHtml(q.text)}</div>
            </div>
          `;

          faqSchemaQuestions.push({
            "@type": "Question",
            "name": escapeHtml(q.text),
            "acceptedAnswer": { "@type": "Answer", "text": "Consult syllabus for solution." }
          });
      });
      questionsHtml += `</div>`;
  } else {
      questionsHtml = `<p style="margin-top: 40px; color:var(--text-muted); font-style:italic;">No text extraction available for this paper yet. Download the PDF above.</p>`;
  }

  const schemaMarkup = faqSchemaQuestions.length > 0 ? `<script type="application/ld+json">{"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": ${JSON.stringify(faqSchemaQuestions)}}</script>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <link rel="canonical" href="${DOMAIN}/${filename}">
  
  <link rel="icon" type="image/png" sizes="192x192" href="favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="css/style.css" />
  
  <style>
    html { scroll-behavior: smooth; }
    .page-header { background: var(--gradient-hero); color: #fff; padding: 120px 0 40px 0; }
    .breadcrumb a { color: rgba(255,255,255,0.9); text-decoration: underline; }
    .breadcrumb a:hover { color: #fff; }
    .meta-tag { background: rgba(255,255,255,0.1); color: #fff; padding: 6px 14px; border-radius: var(--radius-pill); font-size: 0.9rem; font-weight: 600; border: 1px solid rgba(255,255,255,0.2); }
    
    .question-block:target {
        animation: highlightFlash 3s ease-out;
        border-left: 4px solid var(--primary);
        padding-left: 16px;
        background: rgba(108, 58, 224, 0.03);
    }
    @keyframes highlightFlash {
        0% { background-color: var(--highlight-color, rgba(234, 179, 8, 0.2)); }
        100% { background-color: transparent; }
    }
  </style>
  ${schemaMarkup}
</head>
<body style="background-color: var(--bg-body);">

  <!-- Navbar -->
  <nav class="navbar" id="navbar" role="navigation" aria-label="Main navigation">
    <div class="container nav-inner">
      <a href="index.html" class="nav-logo" aria-label="RGPV Papers Home">
        <img src="assets/logo-icon.png" alt="RGPV Papers Logo" style="width: 32px; height: 32px; object-fit: contain; border-radius: 4px;" />
        <div class="logo-text"><span>RGPV</span> Papers</div>
      </a>
      <ul class="nav-links" role="list">
        <li><a href="index.html">Home</a></li>
        <li><a href="papers.html">Papers</a></li>
        <li><a href="subjects.html">Directory</a></li>
        <li><a href="syllabus.html">Syllabus</a></li>
        <li><a href="blog.html">Blog</a></li>
        <li><a href="help-juniors.html" style="color: var(--accent); font-weight: 700;">Help Juniors 💕</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
      <div class="nav-actions">
        <a href="papers.html" class="btn btn-primary btn-sm advanced-search-link">Advanced Search</a>
        <button class="hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </nav>

  <!-- Mobile Menu -->
  <div class="mobile-menu" id="mobileMenu" role="navigation" aria-label="Mobile navigation">
    <a href="index.html">🏠 Home</a>
    <a href="papers.html">📄 Papers</a>
    <a href="subjects.html">📚 Directory</a>
    <a href="syllabus.html">📑 Syllabus</a>
    <a href="blog.html">✍️ Blog</a>
    <a href="help-juniors.html" style="color: var(--accent); font-weight: 700;">💕 Help Juniors</a>
    <a href="about.html">ℹ️ About</a>
    <a href="contact.html">📧 Contact</a>
  </div>

  <header class="page-header">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb" style="margin-bottom: 24px;">
        ${breadcrumbsHtml}
      </nav>
      <h1 style="font-size: 2.8rem; font-weight: 800; margin: 0 0 16px 0;">${escapeHtml(paper.subjectTitle)}</h1>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <span class="meta-tag">📄 Code: ${escapeHtml(paper.paperCode || 'N/A')}</span>
        <span class="meta-tag">🏢 Branch: ${escapeHtml(paper.branchTitle)}</span>
        <span class="meta-tag">📅 Sem: ${escapeHtml(paper.semesterTitle)}</span>
        <span class="meta-tag">🗓️ Date: ${escapeHtml(paper.month || '')} ${escapeHtml(paper.year)}</span>
      </div>
    </div>
  </header>

  <main class="container" style="padding: 40px 20px;">
    
    <div class="card" style="padding: 32px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:20px; border-left: 6px solid var(--primary);">
        <div>
        <h3 style="margin:0 0 8px 0; color:var(--text-primary); font-size:1.3rem;">Download Original PDF</h3>
        <p style="margin:0; color:var(--text-secondary); font-size:1rem;">Get the official university print version scanned document.</p>
        </div>
        <a href="${escapeHtml(paper.pdfUrl || '#')}" download class="btn btn-primary btn-lg" style="box-shadow:var(--shadow-md);">📥 Download PDF</a>
    </div>

    ${questionsHtml}

  </main>
  
  <footer class="footer" role="contentinfo">
    <div class="container">
      <div class="footer-top">
        <div class="footer-about">
          <div class="footer-logo">
            <img src="assets/logo-icon.png" alt="RGPV Papers Logo" style="width: 32px; height: 32px; object-fit: contain; border-radius: 4px;" />
            <span style="color:#fff;font-weight:800;font-size:1.05rem;"><span style="color:var(--primary-light)">RGPV</span> Papers</span>
          </div>
          <p>Your go-to portal for RGPV and MP university previous year question papers. Completely free, always updated.</p>
        </div>
        <div class="footer-col">
          <h4>Quick Links</h4>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="papers.html">Browse Papers</a></li>
            <li><a href="blog.html">Blog</a></li>
            <li><a href="about.html">About Us</a></li>
            <li><a href="contact.html">Contact</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="privacy-policy.html">Privacy Policy</a></li>
            <li><a href="contact.html">Contact Us</a></li>
            <li><a href="about.html">About Us</a></li>
          </ul>
          <div style="margin-top:18px;">
            <p style="font-size:0.78rem;margin-bottom:6px;">📧 Support</p>
            <a href="mailto:customerservice.filezone@gmail.com" style="font-size:0.82rem;color:var(--primary-light);">customerservice.filezone@gmail.com</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© <span id="currentYear"></span> RGPV Papers. All rights reserved.</p>
        <div class="footer-links">
          <a href="privacy-policy.html">Privacy</a>
          <a href="contact.html">Contact</a>
          <a href="about.html">About</a>
        </div>
      </div>
    </div>
  </footer>

  <script src="js/main.js" defer></script>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, filename), html, 'utf-8');
  generatedUrls.push(`${DOMAIN}/${filename}`);
});

fs.writeFileSync(path.join(__dirname, 'papers_urls.txt'), generatedUrls.join('\n'), 'utf-8');

console.log(`✅ Automatically generated ${papers.length} ultra-SEO paper pages with native theme!`);
