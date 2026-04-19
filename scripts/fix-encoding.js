// Fix papers.js: Update card rendering to use displayCode
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'js', 'papers.js');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

let fixed = 0;

lines.forEach((line, i) => {
  // Fix the codeLabel line to use displayCode
  if (line.includes("p.subjectCode  || 'N/A'") && line.includes('codeLabel')) {
    lines[i] = "    const codeLabel    = escHtml(p.displayCode || p.subjectCode || 'N/A');\r";
    fixed++;
    console.log(`Fixed line ${i + 1}: codeLabel -> displayCode`);
  }

  // Fix garbled fallback values (anything that isn't clean ASCII between quotes as fallback)
  if (line.includes('courseLabel') && line.includes('p.courseType') && /\|\|\s*'[^']*[^\x00-\x7F]/.test(line)) {
    lines[i] = line.replace(/'[^']*'/g, (match) => /[^\x00-\x7F]/.test(match) ? "'-'" : match);
    fixed++;
    console.log(`Fixed garbled fallback on line ${i + 1}`);
  }
  if (line.includes('branchLabel') && line.includes('p.branch') && /\|\|\s*'[^']*[^\x00-\x7F]/.test(line)) {
    lines[i] = line.replace(/'[^']*'/g, (match) => /[^\x00-\x7F]/.test(match) ? "'-'" : match);
    fixed++;
    console.log(`Fixed garbled fallback on line ${i + 1}`);
  }
  if (line.includes('examLabel') && line.includes('p.year') && /\|\|\s*'[^']*[^\x00-\x7F]/.test(line)) {
    lines[i] = line.replace(/'[^']*'/g, (match) => /[^\x00-\x7F]/.test(match) ? "'-'" : match);
    fixed++;
    console.log(`Fixed garbled fallback on line ${i + 1}`);
  }
});

// Also fix the featured section's garbled fallbacks
lines.forEach((line, i) => {
  if (i >= 780 && i <= 815) {
    if (/\|\|\s*'[^']*[^\x00-\x7F]/.test(line)) {
      lines[i] = line.replace(/'[^']*'/g, (match) => /[^\x00-\x7F]/.test(match) ? "'-'" : match);
      fixed++;
      console.log(`Fixed featured section fallback on line ${i + 1}`);
    }
    // Update featured cards to use displayCode too
    if (line.includes("p.subjectCode || 'N/A'")) {
      lines[i] = line.replace("p.subjectCode || 'N/A'", "p.displayCode || p.subjectCode || 'N/A'");
      fixed++;
      console.log(`Fixed featured displayCode on line ${i + 1}`);
    }
  }
});

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log(`\nFixed ${fixed} lines total.`);
