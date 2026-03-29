/**
 * SEO Page Generator — Subjects Directory
 * 
 * Run: node seo/generate-subjects.js
 * Output: subjects.html
 * 
 * Groups all unique subjects by Degree and statically links them.
 */

const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://rgpvpyq.co.in';
const outDir = path.join(__dirname, '..');
const outFile = path.join(outDir, 'subjects.html');

console.log('Loading papers data...');
const dataPath = path.join(__dirname, '..', 'js', 'papers-data.json');
if (!fs.existsSync(dataPath)) {
  console.error('ERROR: papers-data.json not found. Run the paper fetcher first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
const papers = data.papers || [];
const allBranches = data.branches || [];

// Fallback logic from front/js/papers.js
const DEGREE_COURSES = {
  'B.Tech': [
    'Computer Science', 'Information Technology', 'Electronics', 'Electrical',
    'Mechanical', 'Civil', 'Chemical', 'Biotechnology', 'Automobile',
    'Mining', 'Industrial', 'Aeronautical', 'Instrumentation',
    'Fire Technology', 'Textile', 'Polymer', 'Ceramic', 'Food Technology',
    'Computer Science & Engineering', 'CSE', 'IT', 'ECE', 'EE', 'ME', 'CE',
    'AI', 'Artificial Intelligence', 'Data Science', 'Cyber Security', 'IoT'
  ],
  'B.E.': [
    'Computer Science', 'Information Technology', 'Electronics', 'Electrical',
    'Mechanical', 'Civil', 'Chemical', 'Biotechnology',
    'CSE', 'IT', 'ECE', 'EE', 'ME', 'CE'
  ],
  'BCA': ['BCA', 'Computer Application', 'Computer Applications'],
  'MCA': ['MCA', 'Computer Application', 'Computer Applications'],
  'M.Tech': [
    'Computer Science', 'Information Technology', 'Electronics', 'Electrical',
    'Mechanical', 'Civil', 'VLSI', 'Embedded', 'Software Engineering',
    'Digital Communication', 'Power Systems', 'Structural', 'Thermal',
    'CSE', 'IT', 'ECE', 'EE', 'ME', 'CE'
  ],
  'MBA': ['MBA', 'Business Administration', 'Management', 'Finance', 'Marketing', 'HR', 'Human Resource'],
  'B.Sc': ['B.Sc', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'Zoology', 'Botany'],
  'M.Sc': ['M.Sc', 'Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'Biotechnology'],
  'B.Pharm': ['B.Pharm', 'Pharmacy', 'Pharmaceutical'],
  'Diploma': [
    'Computer Science', 'Electronics', 'Electrical', 'Mechanical', 'Civil',
    'Chemical', 'Mining', 'Automobile', 'CSE', 'IT', 'ECE', 'EE', 'ME', 'CE'
  ]
};

// Check if an SEO landing page exists for a subject
let seoSubjects = [];
try {
  const seoSubjectsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'subjects.json'), 'utf-8'));
  seoSubjects = seoSubjectsData.map(s => ({
    slug: s.slug,
    titleMatch: s.title.toLowerCase()
  }));
} catch (e) {
  console.warn('Could not load subjects.json for internal linking:', e.message);
}

// 1. Group subjects by Degree
const degreeGroups = {}; // { 'B.Tech': Set(['Data Structures', ...]) }

papers.forEach(p => {
  let subjName = p.title || p.subject;
  if (!subjName) return;
  subjName = subjName.trim();

  let degree = p.degree;

  // Fallback: Infer degree from branch if missing
  if (!degree) {
    const paperBranchName = (allBranches.find(b => b.id === (p.branchId || p.branch))?.name || p.branch || '').toLowerCase().trim();
    for (const [degKey, courses] of Object.entries(DEGREE_COURSES)) {
      if (courses.some(c => paperBranchName.includes(c.toLowerCase()))) {
        degree = degKey;
        break;
      }
    }
  }

  // Final fallback
  if (!degree) degree = 'Other Courses';

  if (!degreeGroups[degree]) degreeGroups[degree] = new Set();
  degreeGroups[degree].add(subjName);
});

// Remove degrees with no subjects
Object.keys(degreeGroups).forEach(k => {
  if (degreeGroups[k].size === 0) delete degreeGroups[k];
});

console.log(`Found ${Object.keys(degreeGroups).length} degrees with subjects.`);

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Frozen to prevent Git diff bloat on every build
const currentDate = '2024-06-01';

const pageTitle = "Browse All Subjects | RGPV Previous Year Papers";
const metaDesc = "Directory of all RGPV subjects grouped by degree (B.Tech, MCA, Diploma, etc). Browse thousands of previous year question papers instantly.";

// Sort degrees for logical presentation
const degreeOrder = ['B.Tech', 'B.E.', 'MCA', 'BCA', 'M.Tech', 'MBA', 'Diploma', 'B.Pharm', 'B.Sc', 'M.Sc', 'Other Courses'];

const sortedDegrees = Object.keys(degreeGroups).sort((a, b) => {
  let idxA = degreeOrder.indexOf(a);
  let idxB = degreeOrder.indexOf(b);
  if (idxA === -1) idxA = 999;
  if (idxB === -1) idxB = 999;
  if(idxA === idxB) return a.localeCompare(b);
  return idxA - idxB;
});

let bodyHtml = '';

sortedDegrees.forEach(deg => {
  bodyHtml += `\n        <h2 class="degree-title">${escapeHtml(deg)}</h2>`;
  bodyHtml += `\n        <div class="subjects-grid">`;
  
  // Sort subjects alphabetically within degree
  const sortedSubjects = Array.from(degreeGroups[deg]).sort((a, b) => a.localeCompare(b));

  // All subjects now have a dedicated landing page generated by generate-pages.js.
  // We can just link directly to their slugified URL.
  function slugify(text) {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  sortedSubjects.forEach(subj => {
    // Determine the optimal URL
    const slug = slugify(subj);
    const url = `papers/${slug}`;
    
    // Slight badge coloring logic purely for aesthetics
    const initial = subj.charAt(0).toUpperCase();
    
    bodyHtml += `
          <a href="${url}" class="card subject-link">
             <div class="subj-initial">${initial}</div>
             <span class="subj-name">${escapeHtml(subj)}</span>
          </a>`;
  });
  
  bodyHtml += `\n        </div>`;
});


const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>${pageTitle}</title>
  <meta name="description" content="${metaDesc}" />
  <meta name="keywords" content="RGPV subjects, B.Tech subjects, MCA papers, RGPV directory, RGPV syllabus papers" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${DOMAIN}/subjects.html" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${pageTitle}" />
  <meta property="og:description" content="${metaDesc}" />
  <meta property="og:url" content="${DOMAIN}/subjects.html" />
  <meta property="og:image" content="${DOMAIN}/assets/og-image.jpg" />
  <meta property="og:site_name" content="RGPV Papers" />
  <meta property="og:locale" content="en_IN" />

  <link rel="icon" type="image/png" sizes="192x192" href="/favicon.png" />
  <link rel="apple-touch-icon" href="/favicon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="css/style.css" />
  <style>
    .directory-container { padding: 40px 0 80px; }
    .degree-title {
      font-size: 1.8rem;
      font-weight: 800;
      color: var(--primary-dark);
      margin: 48px 0 20px;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--border);
      position: relative;
    }
    .degree-title::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 60px;
      height: 2px;
      background: var(--gradient-hero);
    }
    .subjects-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }
    .subject-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      text-decoration: none;
      transition: var(--transition);
      border: 1px solid var(--border);
    }
    .subject-link:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
    }
    .subj-initial {
      width: 36px;
      height: 36px;
      background: rgba(108, 58, 224, 0.1);
      color: var(--primary);
      font-weight: 800;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .subj-name {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.95rem;
      line-height: 1.3;
    }
    @media (max-width: 768px) {
      .degree-title { font-size: 1.5rem; margin-top: 32px; }
      .subjects-grid { grid-template-columns: repeat(auto-fill, minmax(100%, 1fr)); gap: 12px; }
    }
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
        <li><a href="subjects.html" class="active">Subjects</a></li>
        <li><a href="syllabus.html">Syllabus</a></li>
        <li><a href="blog.html">Blog</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="contact.html">Contact</a></li>
      </ul>
      <div class="nav-actions">
        <a href="papers.html" class="btn btn-primary btn-sm">🔍 Search Papers</a>
        <button class="hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </nav>

  <div class="mobile-menu" id="mobileMenu" role="navigation">
    <a href="index.html">🏠 Home</a>
    <a href="papers.html">📄 Papers</a>
    <a href="subjects.html" class="active">📚 Subjects</a>
    <a href="syllabus.html">📑 Syllabus</a>
    <a href="blog.html">✍️ Blog</a>
    <a href="about.html">ℹ️ About</a>
    <a href="contact.html">📧 Contact</a>
  </div>

  <!-- Page Header -->
  <header class="page-header">
    <div class="container">
      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="index.html">Home</a> <span aria-hidden="true">›</span>
        <span>Subjects Directory</span>
      </nav>
      <h1>📚 Browse All Subjects</h1>
      <p>Find your RGPV previous year question papers mapped directly to your degree and course.</p>
    </div>
  </header>

  <!-- Main Directory Container -->
  <main class="main-content" style="background-color: var(--bg-body); min-height: 100vh;">
    <div class="container directory-container">
        ${bodyHtml}
    </div>
  </main>

  <section class="section-padding" style="background:var(--gradient-hero); color:#fff; text-align:center;">
    <div class="container">
      <h2 style="font-size: 2rem; margin-bottom: 16px;">Can't find your subject?</h2>
      <p style="opacity:0.9; margin-bottom: 24px;">Use our advanced global search to locate specific subjects, paper codes, or older papers.</p>
      <a href="papers.html" class="btn btn-outline btn-lg" style="background:rgba(255,255,255,0.1); border-color:#fff; color:#fff;">🔍 Advanced Search</a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer" role="contentinfo">
    <div class="container">
      <div class="footer-top">
        <div class="footer-about">
          <div class="footer-logo">
            <img src="assets/logo-icon.png" alt="RGPV Papers Logo" style="width: 32px; height: 32px; object-fit: contain; border-radius: 4px;" />
            <span style="color:#fff;font-weight:800;"><span style="color:var(--primary-light)">RGPV</span> Papers</span>
          </div>
          <p>Your go-to portal for RGPV and MP university question papers. Free, organized, and always updated.</p>
        </div>
        <div class="footer-col">
          <h4>Navigation</h4>
          <ul>
            <li><a href="index.html">Home</a></li>
            <li><a href="papers.html">Browse Papers</a></li>
            <li><a href="subjects.html">Subjects</a></li>
            <li><a href="syllabus.html">Syllabus</a></li>
            <li><a href="blog.html">Blog</a></li>
            <li><a href="contact.html">Contact</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© <span id="currentYear"></span> RGPV Papers. All rights reserved.</p>
      </div>
    </div>
  </footer>

  <button class="scroll-top" id="scrollTop" aria-label="Scroll to top">↑</button>

  <script src="js/main.js" defer></script>
</body>
</html>`;

fs.writeFileSync(outFile, html, 'utf-8');
console.log('Successfully generated front/subjects.html');

// Append to sitemap
const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  let sitemap = fs.readFileSync(sitemapPath, 'utf-8');
  if (!sitemap.includes('<loc>https://rgpvpyq.co.in/subjects</loc>')) {
    const entry = `
  <url>
    <loc>https://rgpvpyq.co.in/subjects</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>\n</urlset>`;
    sitemap = sitemap.replace('</urlset>', entry);
    fs.writeFileSync(sitemapPath, sitemap, 'utf-8');
    console.log('Added subjects.html to sitemap.xml');
  }
}
