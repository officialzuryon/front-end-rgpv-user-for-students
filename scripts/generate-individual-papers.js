const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const dataPath = path.join(__dirname, '../js/papers-data.json');
const templatePath = path.join(__dirname, '../paper.html');
const outputDir = path.join(__dirname, '../paper');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Load Data
const rawData = fs.readFileSync(dataPath, 'utf8');
const parsedData = JSON.parse(rawData);
const papers = parsedData.papers || [];

// 2. Load Fallback Template (used if paper HTML is missing)
let baseTemplate = fs.readFileSync(templatePath, 'utf8');
baseTemplate = baseTemplate.replace(/href="css\//g, 'href="../css/');
baseTemplate = baseTemplate.replace(/(<link rel="stylesheet" href="\.\.\/css\/style\.css".*?>)/i, '$1\n  <link rel="stylesheet" href="../css/exam-paper.css" />');
baseTemplate = baseTemplate.replace(/href="favicon\.png"/g, 'href="../favicon.png"');
baseTemplate = baseTemplate.replace(/src="js\//g, 'src="../js/');
baseTemplate = baseTemplate.replace(/src="assets\//g, 'src="../assets/');
baseTemplate = baseTemplate.replace(/href="index\.html"/g, 'href="../index.html"');
baseTemplate = baseTemplate.replace(/href="papers\.html/g, 'href="../papers.html"');
baseTemplate = baseTemplate.replace(/href="subjects\.html"/g, 'href="../subjects.html"');
baseTemplate = baseTemplate.replace(/href="syllabus\.html"/g, 'href="../syllabus.html"');
baseTemplate = baseTemplate.replace(/href="blog\.html"/g, 'href="../blog.html"');
baseTemplate = baseTemplate.replace(/href="about\.html"/g, 'href="../about.html"');
baseTemplate = baseTemplate.replace(/href="contact\.html"/g, 'href="../contact.html"');
baseTemplate = baseTemplate.replace(/href="privacy-policy\.html"/g, 'href="../privacy-policy.html"');

// Remove heavy Firebase scripts from fallback template
baseTemplate = baseTemplate.replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-app-compat\.js".*?><\/script>/gi, '');
baseTemplate = baseTemplate.replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore-compat\.js".*?><\/script>/gi, '');
baseTemplate = baseTemplate.replace(/<script src="\.\.\/js\/firebase-config\.js".*?><\/script>/gi, '');

console.log(`Loaded ${papers.length} papers. Generating individual static pages...`);

/**
 * Fetch the COMPLETE HTML content from the Firebase Storage URL.
 */
function fetchFullHtml(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchFullHtml(res.headers.location).then(resolve);
      }
      if (res.statusCode !== 200) {
        resolve(null);
        return;
      }
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => resolve(html));
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/**
 * Process papers in batches to avoid overwhelming the network
 */
async function processBatch(batch) {
  const results = await Promise.all(batch.map(async (p) => {
    const paperId     = p.paperId || p.id;
    const subjectName = p.subjectName || '-';
    const branchName  = p.branch || '-';
    const courseType   = p.courseType || '-';
    const subjectCode = p.subjectCode || '';
    const month       = p.month || '';
    const year        = p.year || '';
    const displayCode = p.displayCode || (branchName && subjectCode ? `${branchName}-${subjectCode}` : subjectCode);
    const titleText   = subjectName || 'Question Paper';
    const fileUrl     = p.fileUrl || '';

    // Format the date
    let dateStr = '-';
    if (p.uploadedAt) {
      dateStr = new Date(p.uploadedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    const examPeriod = `${month ? month + ' ' : ''}${year}`;
    let fileHtml = '';

    // Print-to-PDF button HTML (injected into fetched HTML files too)
    const printBtnHtml = `<button class="btn-print-pdf" onclick="window.printPaperContainer()" aria-label="Save as PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Save as PDF</button>`;

    // --- TASK 4: Fetch and use the actual paper HTML from Firebase ---
    if (fileUrl) {
      const fetchedHtml = await fetchFullHtml(fileUrl);
      if (fetchedHtml && fetchedHtml.includes('<html')) {
        fileHtml = fetchedHtml;
        
        // Fix relative paths for the clean URL structure (/paper/ID/index.html) -> needs ../../
        fileHtml = fileHtml.replace(/href="css\//g, 'href="../../css/');
        fileHtml = fileHtml.replace(/(<link rel="stylesheet" href="\.\.\/\.\.\/css\/style\.css".*?>)/i, '$1\n  <link rel="stylesheet" href="../../css/exam-paper.css" />');
        fileHtml = fileHtml.replace(/href="favicon\.png"/g, 'href="../../favicon.png"');
        fileHtml = fileHtml.replace(/src="js\//g, 'src="../../js/');
        fileHtml = fileHtml.replace(/src="assets\//g, 'src="../../assets/');
        fileHtml = fileHtml.replace(/href="index\.html"/g, 'href="../../index.html"');
        fileHtml = fileHtml.replace(/href="papers\.html"/g, 'href="../../papers.html"');
        fileHtml = fileHtml.replace(/href="subjects\.html"/g, 'href="../../subjects.html"');
        fileHtml = fileHtml.replace(/href="syllabus\.html"/g, 'href="../../syllabus.html"');
        fileHtml = fileHtml.replace(/href="blog\.html"/g, 'href="../../blog.html"');
        fileHtml = fileHtml.replace(/href="about\.html"/g, 'href="../../about.html"');
        fileHtml = fileHtml.replace(/href="contact\.html"/g, 'href="../../contact.html"');
        fileHtml = fileHtml.replace(/href="privacy-policy\.html"/g, 'href="../../privacy-policy.html"');
      }
    }

    // If fetch failed or no HTML exists, generate fallback from paper.html template
    if (!fileHtml) {
      fileHtml = baseTemplate;

      // Replace SEO Metadata
      fileHtml = fileHtml.replace(/<title>.*?<\/title>/, `<title>${titleText} (${displayCode}) ${examPeriod} - ${courseType} | RGPV PYQ</title>`);
      const descriptionText = `View the ${examPeriod} ${titleText} (${displayCode}) question paper for ${courseType} ${branchName}. Free RGPV previous year paper.`;
      fileHtml = fileHtml.replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="${descriptionText}" />`);

      // Replace Open Graph Tags
      fileHtml = fileHtml.replace(/<meta property="og:title"[\s\S]*?>/, `<meta property="og:title" content="${titleText} (${displayCode}) - RGPV PYQ" />`);
      fileHtml = fileHtml.replace(/<meta property="og:description"[\s\S]*?>/, `<meta property="og:description" content="${descriptionText}" />`);
      fileHtml = fileHtml.replace(/<meta property="og:url"[\s\S]*?>/, `<meta property="og:url" content="https://rgpvpyq.co.in/paper/${paperId}" />`);
      fileHtml = fileHtml.replace(/<link rel="canonical" id="pageCanonical" href="https:\/\/rgpvpyq\.co\.in\/paper" \/>/g,
        `<link rel="canonical" id="pageCanonical" href="https://rgpvpyq.co.in/paper/${paperId}" />`);

      // Remove the JS canonical redirect logic
      fileHtml = fileHtml.replace(/<script>\s*\(function\(\) {[\s\S]*?\}\)\(\);\s*<\/script>/, '');

      // Inject paper metadata into the header section
      fileHtml = fileHtml.replace(/<h1 class="paper-title" id="pTitle">.*?<\/h1>/, `<h1 class="paper-title" id="pTitle">${titleText}</h1>`);
      fileHtml = fileHtml.replace(/<span class="badge badge-purple" id="pCode">.*?<\/span>/, `<span class="badge badge-purple" id="pCode">${displayCode || 'No Code'}</span>`);
      fileHtml = fileHtml.replace(/<span class="badge badge-teal" id="pSem">.*?<\/span>/, `<span class="badge badge-teal" id="pSem">${courseType}</span>`);
      fileHtml = fileHtml.replace(/<span class="badge badge-orange" id="pYear">.*?<\/span>/, `<span class="badge badge-orange" id="pYear">${examPeriod}</span>`);

      fileHtml = fileHtml.replace(/<span class="detail-value" id="pSubject">.*?<\/span>/, `<span class="detail-value" id="pSubject">${subjectName}</span>`);
      fileHtml = fileHtml.replace(/<span class="detail-value" id="pUni">.*?<\/span>/, `<span class="detail-value" id="pUni">RGPV</span>`);
      
      // Branch: truncate if too long (comma-separated codes) with overflow protection
      const branchDisplay = branchName.length > 30 ? branchName.substring(0, 30) + '...' : branchName;
      fileHtml = fileHtml.replace(/<span class="detail-value" id="pBranch">.*?<\/span>/,
        `<span class="detail-value" id="pBranch" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${branchName}">${branchDisplay}</span>`);
      fileHtml = fileHtml.replace(/<span class="detail-value" id="pDate">.*?<\/span>/, `<span class="detail-value" id="pDate">${dateStr}</span>`);

      // Remove the hiding styles
      fileHtml = fileHtml.replace('<div id="loadingState" style="text-align:center; padding: 80px 20px;">', '<div id="loadingState" style="display:none;">');
      fileHtml = fileHtml.replace('<div id="paperContent" style="display:none;">', '<div id="paperContent" style="display:block;">');

      // Use a "PDF Not Available" fallback since we didn't get HTML
      const buttonAreaRegex = /<div style="margin-bottom: 24px; display: flex; justify-content: center[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
      const fallbackContent = `
        <div style="margin-bottom: 24px; display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
          <div class="btn btn-primary btn-lg" style="padding: 18px 40px; font-size: 1.1rem; opacity: 0.6; cursor: not-allowed; background: linear-gradient(135deg, #6c3ae0, #4f46e5);">
            PDF Not Available
          </div>
          <button id="sharePaperBtn" class="btn-share" style="padding: 18px 40px; font-size: 1.1rem; box-shadow: var(--shadow-sm); border: 2px solid var(--border);">
            <svg class="share-icon-svg" style="width: 22px; height: 22px;" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            <span>Share this Paper</span>
          </button>
        </div>
      </div>
    </div>`;
      fileHtml = fileHtml.replace(buttonAreaRegex, fallbackContent);
    }

    // Inject the global JS variable for SSG mode
    const scriptInjection = `
  <script>
    window.PAPER_STATIC = true;
    window.PAPER_DATA = ${JSON.stringify({
      paperId, subjectName, subjectCode, displayCode, branch: branchName,
      courseType, month, year, fileUrl
    })};
  </script>
  `;
    fileHtml = fileHtml.replace('</body>', scriptInjection + '\n</body>');



    // Build file path dynamically as a folder containing index.html for Clean URLs
    const cleanUrlDir = path.join(outputDir, paperId);
    if (!fs.existsSync(cleanUrlDir)) {
      fs.mkdirSync(cleanUrlDir, { recursive: true });
    }
    const staticFilePath = path.join(cleanUrlDir, 'index.html');
    fs.writeFileSync(staticFilePath, fileHtml, 'utf8');
    return true;
  }));

  return results.filter(Boolean).length;
}

async function main() {
  const BATCH_SIZE = 20; // Process 20 papers concurrently
  let successCount = 0;
  const totalBatches = Math.ceil(papers.length / BATCH_SIZE);

  for (let i = 0; i < papers.length; i += BATCH_SIZE) {
    const batch = papers.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`\r  Batch ${batchNum}/${totalBatches} (${i + batch.length}/${papers.length} papers)...`);
    const count = await processBatch(batch);
    successCount += count;
  }

  console.log(`\n\nSuccessfully generated ${successCount} static paper pages in front/paper/`);
  console.log(`Pages use the full Firebase HTML when available, or a fallback template otherwise.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
