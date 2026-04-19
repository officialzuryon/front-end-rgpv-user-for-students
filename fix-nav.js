const fs = require('fs');
const files = [
  'papers.html', 'syllabus.html', 'blog.html',
  'about.html', 'contact.html', 'privacy-policy.html', 'paper.html'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/<li><a href="subjects.html">Subjects<\/a><\/li>/g, '<li><a href="subjects.html">Directory</a></li>');
    content = content.replace(/<a href="subjects.html">📚 Subjects<\/a>/g, '<a href="subjects.html">📚 Directory</a>');

    // Also if the file is the current active one it might look like this:
    content = content.replace(/<li><a href="subjects.html" class="active">Subjects<\/a><\/li>/g, '<li><a href="subjects.html" class="active">Directory</a></li>');
    fs.writeFileSync(f, content, 'utf8');
  }
});
console.log('Update complete.');
