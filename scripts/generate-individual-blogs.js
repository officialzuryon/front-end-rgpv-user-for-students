const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'js', 'papers-data.json');
const templatePath = path.join(__dirname, '..', 'blog-post.html');
const outputDir = path.join(__dirname, '..', 'blog');

if (!fs.existsSync(dataPath)) {
  console.error("Please run generate-static-data.js first!");
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const blogs = (data.blogs || []).filter(p => p.published === true || p.published === 'true');
let template = fs.readFileSync(templatePath, 'utf8');

// Fix paths for sub-directory
template = template.replace(/href="css\//g, 'href="../css/');
template = template.replace(/src="js\//g, 'src="../js/');
template = template.replace(/href="favicon\.png"/g, 'href="../favicon.png"');
template = template.replace(/src="assets\//g, 'src="../assets/');
template = template.replace(/href="index\.html"/g, 'href="../index.html"');
template = template.replace(/href="papers\.html"/g, 'href="../papers.html"');
template = template.replace(/href="blog\.html"/g, 'href="../blog.html"');
template = template.replace(/href="about\.html"/g, 'href="../about.html"');
template = template.replace(/href="contact\.html"/g, 'href="../contact.html"');
template = template.replace(/href="privacy-policy\.html"/g, 'href="../privacy-policy.html"');

// Strip heavy firebase SDKs since blogs are static
template = template.replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-app-compat\.js".*?><\/script>/gi, '');
template = template.replace(/<script src="https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore-compat\.js".*?><\/script>/gi, '');
template = template.replace(/<script src="\.\.\/js\/firebase-config\.js".*?><\/script>/gi, '');

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let generated = 0;

for (const p of blogs) {
  let dateStr = '';
  if (p.createdAt && p.createdAt.seconds) {
    dateStr = new Date(p.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } else if (p.createdAt) {
    dateStr = p.createdAt;
  }

  let fileHtml = template;
  const titleText = escHtml(p.title || 'Untitled Post');
  const excerptText = escHtml(p.excerpt || p.title || '');

  // Meta tags
  fileHtml = fileHtml.replace(/<title>.*?<\/title>/, `<title>${titleText} | RGPV Papers Blog</title>`);
  fileHtml = fileHtml.replace(/<meta name="description"[\s\S]*?>/, `<meta name="description" content="${excerptText}" />`);
  fileHtml = fileHtml.replace(/<meta property="og:title"[\s\S]*?>/, `<meta property="og:title" content="${titleText} | RGPV Papers Blog" />`);
  fileHtml = fileHtml.replace(/<meta property="og:description"[\s\S]*?>/, `<meta property="og:description" content="${excerptText}" />`);
  fileHtml = fileHtml.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="https://rgpvpyq.co.in/blog/${p.id}.html" />`);
  
  // Visual replacements
  fileHtml = fileHtml.replace(/<h1 id="postTitle" style="display:none"><\/h1>/, `<h1 id="postTitle" style="display:block">${titleText}</h1>`);
  
  const metaHtml = `✍️ <strong>${escHtml(p.author || 'Team RGPV')}</strong> &nbsp;·&nbsp; 📅 ${dateStr}`;
  fileHtml = fileHtml.replace(/<div class="post-meta" id="postMeta" style="display:none"><\/div>/, `<div class="post-meta" id="postMeta" style="display:flex">${metaHtml}</div>`);
  
  const coverHtml = p.coverImage ? `<img src="${escHtml(p.coverImage)}" alt="Cover" style="width:100%; max-height:400px; object-fit:cover; border-radius:12px; margin-bottom:20px;" />` : '';
  const bodyHtml = coverHtml + (p.content || '');
  fileHtml = fileHtml.replace(/<div id="postBody"><\/div>/, `<div id="postBody">${bodyHtml}</div>`);
  
  const tagsHtml = (p.tags || []).map(t => `<span class="badge badge-purple">${escHtml(t)}</span>`).join('');
  fileHtml = fileHtml.replace(/<div class="post-tags" id="postTags"><\/div>/, `<div class="post-tags" id="postTags">${tagsHtml}</div>`);

  // Kill loading spinner
  fileHtml = fileHtml.replace(/<div class="loading-center" id="postLoading"[\s\S]*?<\/div>/, '<!-- Loading Removed -->');

  // Inject Static Script Fallback
  const inj = `<script>window.BLOG_STATIC = true; window.BLOG_DATA = ${JSON.stringify({
    title: p.title, excerpt: p.excerpt, coverImage: p.coverImage, tags: p.tags, author: p.author
  })};</script>`;

  fileHtml = fileHtml.replace('</body>', `${inj}\n</body>`);

  fs.writeFileSync(path.join(outputDir, `${p.id}.html`), fileHtml);
  generated++;
}

console.log(`✅ Generated ${generated} individual static blog pages in front/blog/`);
