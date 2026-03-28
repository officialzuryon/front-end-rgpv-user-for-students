const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const filesToUpdate = [
  'index.html',
  'papers.html',
  'about.html',
  'contact.html',
  'blog.html',
  'privacy-policy.html',
  'paper.html',
  'seo/generate-pages.js',
  'seo/generate-papers.js'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - not found`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // 1. Desktop Nav (in HTML elements)
  // Look for <li><a href="papers.html" ... >Papers</a></li> or <li><a href="../papers.html" ... >Papers</a></li>
  
  const desktopNavRegex = /(<li>\s*<a href="(?:\.\.\/)?papers\.html"[^>]*>Papers<\/a>\s*<\/li>)/gi;
  if (content.match(desktopNavRegex)) {
    content = content.replace(desktopNavRegex, (match) => {
      // Check if we already added it so we don't duplicate
      if (content.includes('>Subjects</a>')) return match; 
      
      const href = match.includes('../papers.html') ? '../subjects.html' : 'subjects.html';
      const isGenerateScript = file.endsWith('.js');
      // For literal strings inside generator JS, just add next to it
      if (isGenerateScript) {
        return `${match}\n        <li><a href="${href}">Subjects</a></li>`;
      } else {
        return `${match}\n        <li><a href="${href}">Subjects</a></li>`;
      }
    });
  }

  // 2. Mobile Nav (in HTML elements)
  const mobileNavRegex = /(<a href="(?:\.\.\/)?papers\.html"[^>]*>📄 Papers<\/a>)/gi;
  if (content.match(mobileNavRegex)) {
    content = content.replace(mobileNavRegex, (match) => {
      if (content.includes('>📚 Subjects</a>')) return match; 

      const href = match.includes('../papers.html') ? '../subjects.html' : 'subjects.html';
      return `${match}\n    <a href="${href}">📚 Subjects</a>`;
    });
  }

  // Handle active class transfer manually later if needed, but for now just appending.

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  } else {
    // Maybe we already updated it, or regex did not match
    if (content.includes('Subjects</a>')) {
      console.log(`Skipped ${file} - already has Subjects link`);
    } else {
      console.log(`Failed to update ${file} - regex mismatch`);
    }
  }
});
