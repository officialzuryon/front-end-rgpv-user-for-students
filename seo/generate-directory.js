const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://rgpvpyq.co.in';
const outDir = path.join(__dirname, '..');
const dataPath = path.join(outDir, 'js', 'papers-data.json');

console.log('Loading papers data for directory generation...');
if (!fs.existsSync(dataPath)) {
  console.error('ERROR: papers-data.json not found.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const papers = data.papers || [];

const directory = {};

papers.forEach(p => {
  if (!p.universitySlug) return; 

  const u = p.universitySlug;
  const c = p.courseSlug || 'course';
  const b = p.branchSlug || 'branch';
  const s = p.semesterSlug || 'sem';
  const sub = p.subjectSlug || 'subject';

  if (!directory[u]) directory[u] = { title: p.universityTitle, courses: {} };
  if (!directory[u].courses[c]) directory[u].courses[c] = { title: p.courseTitle, branches: {} };
  if (!directory[u].courses[c].branches[b]) directory[u].courses[c].branches[b] = { title: p.branchTitle, sems: {} };
  if (!directory[u].courses[c].branches[b].sems[s]) directory[u].courses[c].branches[b].sems[s] = { title: p.semesterTitle, subjects: {} };
  if (!directory[u].courses[c].branches[b].sems[s].subjects[sub]) directory[u].courses[c].branches[b].sems[s].subjects[sub] = { title: p.subjectTitle, papers: [] };
  
  directory[u].courses[c].branches[b].sems[s].subjects[sub].papers.push(p);
});

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const generatedUrls = [];

function writePage(filename, pageTitle, metaDesc, breadcrumbsHtml, bodyHtml) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)} | RGPV Papers</title>
  <meta name="description" content="${escapeHtml(metaDesc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${DOMAIN}/${filename}">
  
  <!-- Add website's native theme CSS -->
  <link rel="icon" type="image/png" sizes="192x192" href="favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="css/style.css" />
  
  <style>
    .directory-container { padding: 40px 0 80px; min-height: 70vh; }
    .hub-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 32px; }
    .page-header { background: var(--gradient-hero); color: #fff; padding: 120px 0 60px 0; }
    .breadcrumb a { color: rgba(255,255,255,0.9); text-decoration: underline; }
    .breadcrumb a:hover { color: #fff; }
    .card-hover:hover { border-color: var(--primary); transform: translateY(-3px); box-shadow: var(--shadow-md); }
  </style>
</head>
<body>
  
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
    <a href="about.html">ℹ️ About</a>
    <a href="contact.html">📧 Contact</a>
  </div>

  <!-- Extracted proper header style from theme -->
  <header class="page-header">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb" style="margin-bottom: 24px; font-size: 0.9rem;">
        <a href="index.html">Home</a> › ${breadcrumbsHtml}
      </nav>
      <h1 style="font-size: 2.5rem; font-weight: 800; margin:0;">${escapeHtml(pageTitle)}</h1>
      <p style="margin-top: 16px; font-size: 1.1rem; opacity: 0.9;">Select from the options below to find your previous year question papers.</p>
    </div>
  </header>

  <main class="main-content" style="background-color: var(--bg-body);">
    <div class="container directory-container">
      ${bodyHtml}
    </div>
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
}

const bc = (link, text) => `<a href="${link}">${text}</a>`;

let rootListHtml = '<div class="hub-grid">';

for (const [u, uniData] of Object.entries(directory)) {
  const uniFile = `${u}.html`;
  rootListHtml += `<a href="${uniFile}" class="card card-hover" style="text-decoration:none; display:block; padding:24px;">
    <h3 style="color:var(--primary); margin:0 0 8px 0; font-size:1.2rem;">${escapeHtml(uniData.title)}</h3>
    <p style="color:var(--text-secondary); margin:0; font-size:0.9rem;">Browse courses</p>
  </a>`;
  
  let uniListHtml = '<div class="hub-grid">';
  for (const [c, courseData] of Object.entries(uniData.courses)) {
    const courseFile = `${u}-${c}.html`;
    uniListHtml += `<a href="${courseFile}" class="card card-hover" style="text-decoration:none; display:block; padding:24px;">
      <h3 style="color:var(--primary); margin:0 0 8px 0; font-size:1.2rem;">${escapeHtml(courseData.title)}</h3>
      <p style="color:var(--text-secondary); margin:0; font-size:0.9rem;">Browse branches</p>
    </a>`;
    
    let courseListHtml = '<div class="hub-grid">';
    for (const [b, branchData] of Object.entries(courseData.branches)) {
      const branchFile = `${u}-${c}-${b}.html`;
      courseListHtml += `<a href="${branchFile}" class="card card-hover" style="text-decoration:none; display:block; padding:24px;">
        <h3 style="color:var(--primary); margin:0 0 8px 0; font-size:1.2rem;">${escapeHtml(branchData.title)}</h3>
        <p style="color:var(--text-secondary); margin:0; font-size:0.9rem;">Browse semesters</p>
      </a>`;
      
      let branchListHtml = '<div class="hub-grid">';
      for (const [s, semData] of Object.entries(branchData.sems)) {
        const semFile = `${u}-${c}-${b}-${s}.html`;
        branchListHtml += `<a href="${semFile}" class="card card-hover" style="text-decoration:none; display:block; padding:24px;">
          <h3 style="color:var(--primary); margin:0 0 8px 0; font-size:1.2rem;">${escapeHtml(semData.title)}</h3>
          <p style="color:var(--text-secondary); margin:0; font-size:0.9rem;">Browse subjects</p>
        </a>`;
        
        let semListHtml = '<div class="hub-grid">';
        for (const [sub, subData] of Object.entries(semData.subjects)) {
            const subFile = `${u}-${c}-${b}-${s}-${sub}.html`;
            semListHtml += `<a href="${subFile}" class="card card-hover" style="text-decoration:none; display:block; padding:24px;">
              <h3 style="color:var(--primary); margin:0 0 8px 0; font-size:1.2rem;">${escapeHtml(subData.title)}</h3>
              <p style="color:var(--text-secondary); margin:0; font-size:0.9rem;">View papers</p>
            </a>`;
            
            let subPapersHtml = '<div class="hub-grid">';
            subData.papers.forEach(paper => {
                const paperFilename = `${u}-${c}-${b}-${s}-${sub}-${paper.year}.html`;
                subPapersHtml += `
                <a href="${paperFilename}" class="card card-hover" style="text-decoration:none; display:block; padding:24px; border-left: 4px solid var(--primary);">
                    <h3 style="color:var(--text-primary); margin:0 0 8px 0; font-size:1.15rem;">${escapeHtml(paper.subjectTitle)} - ${escapeHtml(paper.year)}</h3>
                    <p style="color:var(--text-secondary); margin:0 0 10px 0; font-size:0.9rem;">Paper Code: <strong>${escapeHtml(paper.paperCode || 'N/A')}</strong> | ${escapeHtml(paper.month || '')} ${escapeHtml(paper.year)}</p>
                    <span style="color:var(--primary); font-weight:600; font-size:0.9rem;">View Paper Details & OCR →</span>
                </a>`;
            });
            subPapersHtml += '</div>';

            const subBreadcrumbs = `${bc('subjects.html', 'Directory')} › ${bc(uniFile, uniData.title)} › ${bc(courseFile, courseData.title)} › ${bc(branchFile, branchData.title)} › ${bc(semFile, semData.title)}`;
            writePage(subFile, `${subData.title} Previous Year Papers`, `Download ${subData.title} papers.`, subBreadcrumbs, subPapersHtml);
        }
        semListHtml += '</div>';
        const semBreadcrumbs = `${bc('subjects.html', 'Directory')} › ${bc(uniFile, uniData.title)} › ${bc(courseFile, courseData.title)} › ${bc(branchFile, branchData.title)}`;
        writePage(semFile, `${semData.title} Papers for ${branchData.title}`, `Get previous year papers.`, semBreadcrumbs, semListHtml);
      }
      branchListHtml += '</div>';
      const branchBreadcrumbs = `${bc('subjects.html', 'Directory')} › ${bc(uniFile, uniData.title)} › ${bc(courseFile, courseData.title)}`;
      writePage(branchFile, `${branchData.title} Papers`, `Get previous year papers.`, branchBreadcrumbs, branchListHtml);
    }
    courseListHtml += '</div>';
    const courseBreadcrumbs = `${bc('subjects.html', 'Directory')} › ${bc(uniFile, uniData.title)}`;
    writePage(courseFile, `${courseData.title} Courses & Branches`, `Find papers for ${courseData.title} degrees.`, courseBreadcrumbs, courseListHtml);
  }
  uniListHtml += '</div>';
  writePage(uniFile, `${uniData.title} Previous Year Papers`, `Browse papers for ${uniData.title}.`, `${bc('subjects.html', 'Directory')}`, uniListHtml);
}
rootListHtml += '</div>';

writePage('subjects.html', 'Master Universities Directory', 'Browse RGPV and other university papers.', `<span style="opacity:0.8;">Directory</span>`, rootListHtml);
fs.writeFileSync(path.join(__dirname, 'directory_urls.txt'), generatedUrls.join('\n'), 'utf-8');
console.log('✅ Generated native theme hub pages!');
