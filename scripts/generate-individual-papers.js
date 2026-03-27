const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../js/papers-data.json');
const templatePath = path.join(__dirname, '../paper.html');
const outputDir = path.join(__dirname, '../paper');

// Ensure output directory exists (it should, there are 1800+ files there)
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// 1. Load Data
const rawData = fs.readFileSync(dataPath, 'utf8');
const parsedData = JSON.parse(rawData);
const papers = parsedData.papers || [];

const getMap = (arr) => Array.isArray(arr) ? arr.reduce((acc, item) => ({...acc, [item.id || item.slug]: item.name || item.title}), {}) : {};
const branchMap = getMap(parsedData.branches);
const subjectMap = getMap(parsedData.subjects);
const uniMap = getMap(parsedData.universities);

// 2. Load Template
let template = fs.readFileSync(templatePath, 'utf8');

// The template contains relative links for the root folder (e.g. href="css/style.css")
// But these files will be generated inside paper/ folder.
// Let's fix the paths to use ../
template = template.replace(/href="css\//g, 'href="../css/');
template = template.replace(/href="favicon\.png"/g, 'href="../favicon.png"');
template = template.replace(/src="js\//g, 'src="../js/');
template = template.replace(/href="index\.html"/g, 'href="../index.html"');
template = template.replace(/href="papers\.html/g, 'href="../papers.html');
template = template.replace(/href="blog\.html"/g, 'href="../blog.html"');
template = template.replace(/href="about\.html"/g, 'href="../about.html"');
template = template.replace(/href="contact\.html"/g, 'href="../contact.html"');
template = template.replace(/href="privacy-policy\.html"/g, 'href="../privacy-policy.html"');

// 3. Remove heavy Firebase scripts (since SSG pages don't need to fetch data from Firestore)
// We replace them with an empty string so they don't load.
template = template.replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-app-compat\.js".*?><\/script>/gi, '');
template = template.replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore-compat\.js".*?><\/script>/gi, '');
template = template.replace(/<script src="\.\.\/js\/firebase-config\.js".*?><\/script>/gi, '');

console.log(`Loaded ${papers.length} papers. Generating individual static pages...`);

let successCount = 0;

for (const p of papers) {
  const subjectName = p.subject || subjectMap[p.subjectId] || '—';
  const branchName = p.branch || branchMap[p.branchId] || '—';
  const uniName = p.university || uniMap[p.universityId] || '—';
  const titleText = p.title || subjectName || 'Question Paper';
  
  // Format the date
  let dateStr = '—';
  if (p.createdAt && p.createdAt.seconds) {
      dateStr = new Date(p.createdAt.seconds * 1000).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Create the specific HTML for this paper
  let fileHtml = template;

  // Replace SEO Metadata
  fileHtml = fileHtml.replace(/<title>.*?<\/title>/, `<title>${titleText} (${p.year}) - RGPV Previous Year Paper</title>`);
  
  const descriptionText = `Download or view the ${p.year} ${titleText} (${p.code || ''}) question paper for ${branchName}, Semester ${p.semester}. Free RGPV previous year paper.`;
  fileHtml = fileHtml.replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="${descriptionText}" />`);
  
  // Replace Open Graph Tags
  fileHtml = fileHtml.replace(/<meta property="og:title"[\s\S]*?>/, `<meta property="og:title" content="${titleText} - RGPV Previous Year Paper" />`);
  fileHtml = fileHtml.replace(/<meta property="og:description"[\s\S]*?>/, `<meta property="og:description" content="${descriptionText}" />`);
  fileHtml = fileHtml.replace(/<meta property="og:url"[\s\S]*?>/, `<meta property="og:url" content="https://rgpvpyq.co.in/paper/${p.id}" />`);
  fileHtml = fileHtml.replace(/<link rel="canonical" id="pageCanonical" href="https:\/\/rgpvpyq\.co\.in\/paper" \/>/g, `<link rel="canonical" id="pageCanonical" href="https://rgpvpyq.co.in/paper/${p.id}" />`);
  
  // Also remove the JS canonical redirect logic as it's not needed for individual pages
  fileHtml = fileHtml.replace(/<script>\s*\(function\(\) {[\s\S]*?\}\)\(\);\s*<\/script>/, '');

  // Modify the body content to inject the static data
  fileHtml = fileHtml.replace(/<h1 class="paper-title" id="pTitle">.*?<\/h1>/, `<h1 class="paper-title" id="pTitle">${titleText}</h1>`);
  fileHtml = fileHtml.replace(/<span class="badge badge-purple" id="pCode">.*?<\/span>/, `<span class="badge badge-purple" id="pCode">${p.code || 'No Code'}</span>`);
  fileHtml = fileHtml.replace(/<span class="badge badge-teal" id="pSem">.*?<\/span>/, `<span class="badge badge-teal" id="pSem">Semester ${p.semester || '—'}</span>`);
  fileHtml = fileHtml.replace(/<span class="badge badge-orange" id="pYear">.*?<\/span>/, `<span class="badge badge-orange" id="pYear">${p.year || '—'}</span>`);

  fileHtml = fileHtml.replace(/<span class="detail-value" id="pSubject">.*?<\/span>/, `<span class="detail-value" id="pSubject">${subjectName}</span>`);
  fileHtml = fileHtml.replace(/<span class="detail-value" id="pUni">.*?<\/span>/, `<span class="detail-value" id="pUni">${uniName}</span>`);
  fileHtml = fileHtml.replace(/<span class="detail-value" id="pBranch">.*?<\/span>/, `<span class="detail-value" id="pBranch">${branchName}</span>`);
  fileHtml = fileHtml.replace(/<span class="detail-value" id="pDate">.*?<\/span>/, `<span class="detail-value" id="pDate">${dateStr}</span>`);

  // Remove the hiding styles
  fileHtml = fileHtml.replace('<div id="loadingState" style="text-align:center; padding: 80px 20px;">', '<div id="loadingState" style="display:none;">');
  fileHtml = fileHtml.replace('<div id="paperContent" style="display:none;">', '<div id="paperContent" style="display:block;">');

  // Inject the global JS variable for SSG mode
  const scriptInjection = `
  <script>
    // Injected by generate-individual-papers.js
    window.PAPER_STATIC = true;
    window.PAPER_DATA = ${JSON.stringify(p)};
  </script>
  `;
  fileHtml = fileHtml.replace('</body>', scriptInjection + '\n</body>');

  // Write the file
  const outputPath = path.join(outputDir, `${p.id}.html`);
  fs.writeFileSync(outputPath, fileHtml, 'utf8');
  successCount++;
}

console.log(`Successfully generated ${successCount} static paper pages in front/paper/`);
