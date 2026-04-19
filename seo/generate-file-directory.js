const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://rgpvpyq.co.in';
const papersDir = path.join(__dirname, '..', 'paper');
const outDir = path.join(__dirname, '..');

// 1. Parse physical files
const files = fs.readdirSync(papersDir).filter(f => f.endsWith('.html'));
const tree = {};

console.log(`Found ${files.length} paper files. Building nested directory...`);

files.forEach(file => {
  // Filename format: RGPV_B.Tech_(AD,AL,CD)_(401)_(Introduction_To_Discrete_Structure_And_Linear_Algebra)_(December)_(2024).html
  // Regex mapping:
  const match = file.match(/^([^_]+)_([^_]+)_\(([^)]+)\)_\(([a-zA-Z0-9-,/ ]+)\)_\((.+)\)_\(([^)]+)\)_\(([^)]+)\)\.html$/);

  // If the file doesn't perfectly match our strict naming rule, skip it or put it in unknown
  if (!match) {
    console.log(`Skipping incorrectly formatted filename: ${file}`);
    return;
  }

  const u = match[1]; // RGPV
  const c = match[2]; // B.Tech
  const rawBranches = match[3]; // AD,AL,CD
  const subCode = match[4]; // 401
  const subName = match[5].replace(/_/g, ' '); // Introduction To...
  const month = match[6];
  const year = match[7];

  const branches = rawBranches.split(',').map(b => b.trim());

  if (!tree[u]) tree[u] = {};
  if (!tree[u][c]) tree[u][c] = {};

  branches.forEach(b => {
    if (!tree[u][c][b]) tree[u][c][b] = [];

    tree[u][c][b].push({
      file,
      subCode,
      subName,
      month,
      year
    });
  });
});

// Helper for SEO friendly paths
function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const bc = (link, text) => `<a href="${link}">${text}</a>`;

function writePage(relPath, pageTitle, metaDesc, breadcrumbsHtml, bodyHtml, upLevels) {
  const absolutePathPrefix = '../'.repeat(upLevels);
  const backToRoot = upLevels === 0 ? './' : absolutePathPrefix;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)} | Directory | RGPV Papers</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <meta name="robots" content="index, follow">
  
  <link rel="icon" type="image/png" sizes="192x192" href="${backToRoot}favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${backToRoot}css/style.css" />
  
  <style>
    .directory-container { padding: 40px 0 80px; min-height: 70vh; }
    .hub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 32px; }
    .page-header { background: var(--gradient-hero); color: #fff; padding: 120px 0 60px 0; }
    .breadcrumb a { color: rgba(255,255,255,0.9); text-decoration: underline; }
    .breadcrumb a:hover { color: #fff; }
    .card-hover:hover { border-color: var(--primary); transform: translateY(-3px); box-shadow: var(--shadow-md); }
    .folder-icon { font-size: 1.5rem; margin-bottom: 8px; display: block; }
  </style>
</head>
<body>
  
  <nav class="navbar" id="navbar" role="navigation">
    <div class="container nav-inner">
      <a href="${backToRoot}index.html" class="nav-logo">
        <img src="${backToRoot}assets/logo-icon.png" alt="RGPV Papers Logo" style="width: 32px; height: 32px; object-fit: contain; border-radius: 4px;" />
        <div class="logo-text"><span>RGPV</span> Papers</div>
      </a>
      <ul class="nav-links">
        <li><a href="${backToRoot}index.html">Home</a></li>
        <li><a href="${backToRoot}papers.html">Papers</a></li>
        <li><a href="${backToRoot}subjects.html">Directory</a></li>
        <li><a href="${backToRoot}syllabus.html">Syllabus</a></li>
        <li><a href="${backToRoot}blog.html">Blog</a></li>
        <li><a href="${backToRoot}help-juniors.html" style="color: var(--accent); font-weight: 700;">Help Juniors 💕</a></li>
        <li><a href="${backToRoot}about.html">About</a></li>
        <li><a href="${backToRoot}contact.html">Contact</a></li>
      </ul>
      <div class="nav-actions">
        <a href="${backToRoot}papers.html" class="btn btn-primary btn-sm">Advanced Search</a>
        <button class="hamburger" id="hamburger"><span></span><span></span><span></span></button>
      </div>
    </div>
  </nav>

  <div class="mobile-menu" id="mobileMenu">
    <a href="${backToRoot}index.html">🏠 Home</a>
    <a href="${backToRoot}papers.html">📄 Papers</a>
    <a href="${backToRoot}subjects.html">📚 Directory</a>
    <a href="${backToRoot}syllabus.html">📑 Syllabus</a>
    <a href="${backToRoot}blog.html">✍️ Blog</a>
    <a href="${backToRoot}help-juniors.html" style="color: var(--accent); font-weight: 700;">💕 Help Juniors</a>
    <a href="${backToRoot}about.html">ℹ️ About</a>
    <a href="${backToRoot}contact.html">📧 Contact</a>
  </div>

  <header class="page-header">
    <div class="container">
      <nav class="breadcrumb" style="margin-bottom: 24px; font-size: 0.9rem;">
        <a href="${backToRoot}index.html">Home</a> › ${breadcrumbsHtml}
      </nav>
      <h1 style="font-size: 2.5rem; font-weight: 800; margin:0;">${escapeHtml(pageTitle)}</h1>
      <p style="margin-top: 16px; font-size: 1.1rem; opacity: 0.9;">Navigate through our structured hierarchy directory.</p>
    </div>
  </header>

  <main class="main-content" style="background-color: var(--bg-body);">
    <div class="container directory-container">
      ${bodyHtml}
    </div>
  </main>

  <footer class="footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-about">
          <div class="footer-logo">
            <span style="color:#fff;font-weight:800;font-size:1.05rem;">RGPV Papers</span>
          </div>
          <p>Your go-to portal for previous year question papers. Completely free, always updated.</p>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© <span id="currentYear"></span> RGPV Papers. All rights reserved.</p>
      </div>
    </div>
  </footer>
  
  <script src="${backToRoot}js/main.js" defer></script>
</body>
</html>`;

  const outFilePath = path.join(outDir, relPath);
  fs.mkdirSync(path.dirname(outFilePath), { recursive: true });
  fs.writeFileSync(outFilePath, html, 'utf-8');
}

// Generate the hierarchical folders
let rootListHtml = '<div class="hub-grid">';
const rootLevels = 0;

for (const [u, courses] of Object.entries(tree)) {
  const uSlug = slugify(u);
  rootListHtml += `<a href="${uSlug}/index.html" class="card card-hover" style="text-decoration:none; display:block; padding:24px;">
    <span class="folder-icon">📁</span>
    <h3 style="color:var(--primary); margin:0 0 8px 0; font-size:1.2rem;">${escapeHtml(u)}</h3>
    <p style="color:var(--text-secondary); margin:0; font-size:0.9rem;">Browse ${Object.keys(courses).length} courses</p>
  </a>`;

  let uListHtml = '<div class="hub-grid">';
  for (const [c, branches] of Object.entries(courses)) {
    const cSlug = slugify(c);
    uListHtml += `<a href="../${uSlug}/${cSlug}/index.html" class="card card-hover" style="text-decoration:none; display:block; padding:24px;">
      <span class="folder-icon">📁</span>
      <h3 style="color:var(--primary); margin:0 0 8px 0; font-size:1.2rem;">${escapeHtml(c)}</h3>
      <p style="color:var(--text-secondary); margin:0; font-size:0.9rem;">Browse ${Object.keys(branches).length} branches</p>
    </a>`;

    let cListHtml = '<div class="hub-grid">';
    for (const [b, papers] of Object.entries(branches)) {
      const bSlug = slugify(b);
      cListHtml += `<a href="../../${uSlug}/${cSlug}/${bSlug}/index.html" class="card card-hover" style="text-decoration:none; display:block; padding:24px;">
        <span class="folder-icon">📁</span>
        <h3 style="color:var(--primary); margin:0 0 8px 0; font-size:1.2rem;">${escapeHtml(b)}</h3>
        <p style="color:var(--text-secondary); margin:0; font-size:0.9rem;">${papers.length} papers</p>
      </a>`;

      // Branch index
      let bListHtml = '<div class="hub-grid">';
      
      // Sort papers essentially by Year descending, then Month
      papers.sort((a,b) => b.year.localeCompare(a.year));
      
      papers.forEach(p => {
        const fileLink = `../../../paper/${p.file}`;
        bListHtml += `<a href="${fileLink}" class="card card-hover" style="text-decoration:none; display:block; padding:24px; border-left: 4px solid var(--primary);">
            <h3 style="color:var(--text-primary); margin:0 0 8px 0; font-size:1.15rem;">${escapeHtml(p.subName)}</h3>
            <p style="color:var(--text-secondary); margin:0 0 10px 0; font-size:0.9rem;">Code: <strong>${escapeHtml(p.subCode)}</strong> | ${escapeHtml(p.month)} ${escapeHtml(p.year)}</p>
            <span style="color:var(--primary); font-weight:600; font-size:0.9rem;">View Paper →</span>
        </a>`;
      });
      bListHtml += '</div>';

      writePage(
        `${uSlug}/${cSlug}/${bSlug}/index.html`,
        `${u} - ${c} - ${b} Papers`,
        `Directory for ${u} ${c} ${b} branch papers.`,
        `${bc('../../../subjects.html', 'Directory')} › ${bc('../../index.html', u)} › ${bc('../index.html', c)} › <span style="opacity:0.8">${escapeHtml(b)}</span>`,
        bListHtml,
        3
      );
    }
    cListHtml += '</div>';

    writePage(
      `${uSlug}/${cSlug}/index.html`,
      `${u} - ${c} Courses`,
      `Directory for ${u} ${c} courses.`,
      `${bc('../../subjects.html', 'Directory')} › ${bc('../index.html', u)} › <span style="opacity:0.8">${escapeHtml(c)}</span>`,
      cListHtml,
      2
    );
  }
  uListHtml += '</div>';

  writePage(
    `${uSlug}/index.html`,
    `${u} University Directory`,
    `Directory for ${u} university.`,
    `${bc('../subjects.html', 'Directory')} › <span style="opacity:0.8">${escapeHtml(u)}</span>`,
    uListHtml,
    1
  );
}
rootListHtml += '</div>';

writePage(
  'subjects.html',
  'Select Your Course Directory',
  'Navigate our raw file hierarchy for all RGPV and other university papers.',
  '<span style="opacity:0.8">Directory</span>',
  rootListHtml,
  0
);

console.log('✅ Generated native directory successfully!');
