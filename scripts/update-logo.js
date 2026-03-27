const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(__dirname, '..'),
  path.join(__dirname, '..', 'papers'),
  path.join(__dirname, '..', 'paper')
];

let replacedCount = 0;

for (const dir of dirs) {
  if (!fs.existsSync(dir)) continue;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  const isSubdir = dir.endsWith('papers') || dir.endsWith('paper');

  for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    const logoHtml = `<img src="${isSubdir ? '../' : ''}assets/logo-icon.png" alt="RGPV Papers Logo" style="width: 32px; height: 32px; object-fit: contain; border-radius: 4px;" />`;
    
    // Replace the emoji logo div
    content = content.replace(/<div class="logo-icon" aria-hidden="true">.*?<\/div>/g, logoHtml);

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      replacedCount++;
    }
  }
}

console.log(`Replaced text logo with image logo in ${replacedCount} HTML files.`);
