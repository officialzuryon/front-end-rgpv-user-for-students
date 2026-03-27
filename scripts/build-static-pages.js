// scripts/build-static-pages.js
const fs = require('fs');
const path = require('path');

const papersDir = path.join(__dirname, '..', 'papers');
const dataPath = path.join(__dirname, '..', 'js', 'papers-data.json');

if (!fs.existsSync(dataPath)) {
  console.error("Please run generate-static-data.js first!");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const allPapers = data.papers || [];

function normalize(str) {
  return String(str || '').toLowerCase().replace(/[\s\-]/g, '');
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const files = fs.readdirSync(papersDir).filter(f => f.endsWith('.html'));
let processedCount = 0;

files.forEach(file => {
  const filePath = path.join(papersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Extract subject info using simple regex
  const codesMatch = content.match(/const\s+subjectCodes\s*=\s*(\[[^\]]+\]);/);
  const titleMatch = content.match(/const\s+subjectTitle\s*=\s*['"]([^'"]+)['"]/);

  if (!codesMatch && !titleMatch) {
    // Some pages might not have the script block format. Skip them.
    return;
  }

  let codes = [];
  if (codesMatch) {
    try {
      // safely parse
      codes = JSON.parse(codesMatch[1].replace(/'/g, '"'));
    } catch(e) {}
  }
  
  const title = titleMatch ? titleMatch[1] : '';
  const titleLower = title.toLowerCase();
  const normalizedCodes = codes.map(normalize);

  // Filter papers
  const matchingPapers = allPapers.filter(data => {
    const paperCode = normalize(data.code || '');
    const paperTitle = (data.title || '').toLowerCase();
    const paperSubject = (data.subject || '').toLowerCase();

    const codeMatch = normalizedCodes.some(nc => paperCode === nc || paperCode.includes(nc) || nc.includes(paperCode));
    const nameMatch = paperTitle.includes(titleLower) || paperSubject.includes(titleLower);

    return codeMatch || nameMatch;
  });

  // Generate HTML
  let papersHtml = '';
  if (matchingPapers.length > 0) {
    const SHARE_ICON = `<svg class="share-icon-svg" fill="none" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
    
    papersHtml = matchingPapers.map(p => `
            <article class="paper-card" role="article">
              <div class="paper-card-top">
                <div class="paper-card-code">📄 ${p.code || 'N/A'}</div>
                <h3 class="paper-card-title">${escHtml(p.title || p.subject || 'Question Paper')}</h3>
              </div>
              <div class="paper-card-body">
                <div class="paper-meta-grid">
                  <div class="paper-meta-item"><label>Branch</label><span>${escHtml(p.branch || 'General')}</span></div>
                  <div class="paper-meta-item"><label>Year</label><span>${p.year || '—'}</span></div>
                  <div class="paper-meta-item"><label>Semester</label><span>Sem ${p.semester || '—'}</span></div>
                  <div class="paper-meta-item"><label>Subject</label><span>${escHtml(p.subject || '—')}</span></div>
                </div>
              </div>
              <div class="paper-card-footer">
                <span class="badge badge-purple">${escHtml(p.subject || '—')}</span>
                <div style="display: flex; gap: 8px; align-items: center;">
                  <button onclick="sharePaper('${escHtml(p.title || p.subject || 'Paper')}', '/paper/${p.id}')" class="btn-share" aria-label="Share paper">
                    ${SHARE_ICON}<span class="share-label">Share</span>
                  </button>
                  <a href="../paper/${p.id}" class="btn btn-primary" target="_blank" style="text-decoration: none; padding: 6px 14px; border-radius: 8px;" aria-label="View ${escHtml(p.title || 'paper')}">
                    👁 View
                  </a>
                </div>
              </div>
            </article>`).join('');
  }

  // Pre-render logic: Replace empty subjectPapers div with content
  const startMarker = '<!-- PAPERS_START -->';
  const endMarker = '<!-- PAPERS_END -->';
  const papersBlock = `${startMarker}\n${papersHtml}\n${endMarker}`;

  let newContent = content;

  if (newContent.includes(startMarker)) {
    // If we've run this before, replace everything between markers
    const regex = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'g');
    newContent = newContent.replace(regex, papersBlock);
  } else {
    // First time run, it might be an empty div or contain the old papers grid
    // We strictly match the open and IMMEDIATELY closing div, OR we match relying on the fact that if it was empty, it's just ></div>
    const gridRegex = /(<div\s+id="subjectPapers"[^>]*>)([\s\S]*?)(<\/div>\s*<div style="text-align:center;)/i;
    if (gridRegex.test(newContent)) {
       newContent = newContent.replace(gridRegex, `$1\n${papersBlock}\n</div>\n    <div style="text-align:center;`);
    } else {
       // fallback for simple empty div
       const simpleRegex = /(<div\s+id="subjectPapers"([^>]*)>)\s*(<\/div>)/i;
       newContent = newContent.replace(simpleRegex, `$1\n${papersBlock}\n$3`);
    }
  }

  // Update count paragraph
  const countRegex = /(<p\s+class="results-count"[^>]*>)([\s\S]*?)(<\/p>)/i;
  if (countRegex.test(newContent)) {
    const countText = matchingPapers.length > 0 
      ? `Showing <strong>${matchingPapers.length}</strong> ${escHtml(title)} papers` 
      : '';
    newContent = newContent.replace(countRegex, `$1${countText}$3`);
  }

  // Hide loading spinner permanently since content is static
  const loadingRegex = /(<div\s+id="papersLoading"[^>]*>)/i;
  if (loadingRegex.test(newContent)) {
    // If it already has style="display:none;" we're fine, otherwise let's replace or add style
    newContent = newContent.replace(loadingRegex, v => v.includes('style=') ? v : v.replace('>', ' style="display:none;">'));
  }

  // Show empty state if no papers
  if (matchingPapers.length === 0) {
    const emptyRegex = /(<div\s+id="papersEmpty"\s+class="empty-state"\s+style=")(display:\s*none;?)(")/i;
    newContent = newContent.replace(emptyRegex, `$1display:flex;$3`);
  } else {
    // Ensure empty state is hidden if papers exist
    const emptyRegex = /(<div\s+id="papersEmpty"\s+class="empty-state"\s+style=")(display:\s*flex;?)(")/i;
    newContent = newContent.replace(emptyRegex, `$1display:none;$3`);
  }

  // Remove Firebase from client side for these static pages! 
  // It saves ~150KB of JS parsing on every subject page load.
  newContent = newContent.replace(/<script[^>]+firebase-app-compat\.js[^>]*><\/script>/gi, '<!-- Firebase app removed: content is static -->');
  newContent = newContent.replace(/<script[^>]+firebase-firestore-compat\.js[^>]*><\/script>/gi, '<!-- Firebase store removed: content is static -->');
  newContent = newContent.replace(/<script[^>]+firebase-config\.js[^>]*><\/script>/gi, '<!-- Firebase config removed -->');
  
  // Wipe the (function() {... } init() logic since papers are pre-rendered
  const scriptRegex = /<script>\s*\/\/\s*Load papers matching ANY[\s\S]*?<\/script>/gi;
  newContent = newContent.replace(scriptRegex, `<!-- Client-side fetch removed: papers are statically pre-rendered -->`);

  // Write changes only if modified
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    processedCount++;
  }
});

console.log(`✅ Static HTML injected into ${processedCount} subject pages.`);
