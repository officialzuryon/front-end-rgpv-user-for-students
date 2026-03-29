const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const filesToUpdate = [
  'index.html',
  'papers.html',
  'subjects.html',
  'about.html',
  'contact.html',
  'blog.html',
  'privacy-policy.html',
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
  // Look for <li><a href="subjects.html" ... >Subjects</a></li> or <li><a href="../subjects.html" ... >Subjects</a></li>
  
  const desktopNavRegex = /(<li>\s*<a href="(?:\.\.\/)?subjects\.html"[^>]*>Subjects<\/a>\s*<\/li>)/gi;
  if (content.match(desktopNavRegex)) {
    content = content.replace(desktopNavRegex, (match) => {
      // Check if we already added it so we don't duplicate
      if (content.includes('>Syllabus</a>')) return match; 
      
      const href = match.includes('../subjects.html') ? '../syllabus.html' : 'syllabus.html';
      return `${match}\n        <li><a href="${href}">Syllabus</a></li>`;
    });
  }

  // 2. Mobile Nav (in HTML elements)
  const mobileNavRegex = /(<a href="(?:\.\.\/)?subjects\.html"[^>]*>📚 Subjects<\/a>)/gi;
  if (content.match(mobileNavRegex)) {
    content = content.replace(mobileNavRegex, (match) => {
      if (content.includes('>📑 Syllabus</a>')) return match; 

      const href = match.includes('../subjects.html') ? '../syllabus.html' : 'syllabus.html';
      return `${match}\n    <a href="${href}">📑 Syllabus</a>`;
    });
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  } else {
    // Maybe we already updated it, or regex did not match
    if (content.includes('Syllabus</a>')) {
      console.log(`Skipped ${file} - already has Syllabus link`);
    } else {
      console.log(`Failed to update ${file} - regex mismatch`);
    }
  }
});
