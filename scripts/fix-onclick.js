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
            let newContent = content.replace(/onclick="window\.print\(\)"/g, 'onclick="window.printPaperContainer()"');
            if (newContent !== content) {
                fs.writeFileSync(fullPath, newContent, 'utf8');
                count++;
            }
        }
    }
}

walkDir(paperDir);
console.log('Fixed onclick in ' + count + ' files');
