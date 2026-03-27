const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, '..'),
  path.join(__dirname, '..', 'papers'),
  path.join(__dirname, '..', 'paper'),
  path.join(__dirname, '..', 'blog')
];

let replacedCount = 0;

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

  for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Purge hardcoded Firebase script tags
    content = content.replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-app-compat\.js"[^>]*><\/script>\s*/gi, '');
    content = content.replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore-compat\.js"[^>]*><\/script>\s*/gi, '');
    content = content.replace(/<script src="[^"]*js\/firebase-config\.js"[^>]*><\/script>\s*/gi, '');
    
    // In index.html, remove the massive loadFirebaseScripts block
    content = content.replace(/async function loadFirebaseScripts\(\) \{[\s\S]*?return Promise\.resolve\(\);\s*\}/g, '');
    content = content.replace(/let firebaseLoaded = false;/g, '');
    content = content.replace(/setTimeout\(loadFirebaseScripts, 2000\);\s*/g, '');
    content = content.replace(/window\.addEventListener\('load', \(\) => setTimeout\(initLazyLoads, 3000\)\);\s*/g, 'window.addEventListener(\'load\', initLazyLoads);');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      replacedCount++;
    }
  }
}

console.log(`Purged Firebase SDKs from ${replacedCount} HTML files.`);
