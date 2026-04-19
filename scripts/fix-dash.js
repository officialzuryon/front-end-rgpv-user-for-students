const fs = require('fs');
const path = require('path');

const paperDir = path.join(__dirname, '../paper');
let count = 0;

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.html')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            let newContent = content.replace(/Opens your browser print dialog .*? select "Save as PDF" to download\./g, 'Opens your browser print dialog — select "Save as PDF" to download.');
            if (newContent !== content) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                count++;
            }
        }
    }
}

walkDir(paperDir);
console.log('Fixed encoding in ' + count + ' files');
