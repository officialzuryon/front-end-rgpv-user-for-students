const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'js', 'papers-data.json');
const blogHtmlPath = path.join(__dirname, '..', 'blog.html');
const indexHtmlPath = path.join(__dirname, '..', 'index.html');

if (!fs.existsSync(dataPath)) {
  console.error("Please run generate-static-data.js first!");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const blogs = (data.blogs || []).filter(p => p.published === true || p.published === 'true');

function escHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderBlogCard(p, isRoot) {
  let dateStr = '';
  if (p.createdAt && p.createdAt.seconds) {
    dateStr = new Date(p.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } else if (p.createdAt) {
    dateStr = p.createdAt;
  }
  const tags = (p.tags || []).slice(0, 2);
  const mediaHtml = p.coverImage 
    ? `<img src="${escHtml(p.coverImage)}" alt="Cover" loading="lazy" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;"/>`
    : `<div style="font-size:3rem;">${p.emoji || '📚'}</div>`;
    
  return `
    <article class="blog-card" style="display: flex; flex-direction: column;">
      <div class="blog-card-img" style="padding:0; overflow:hidden; display:flex; align-items:center; justify-content:center;">${mediaHtml}</div>
      <div class="blog-card-body" style="flex: 1; display: flex; flex-direction: column;">
        <div class="blog-card-meta">
          ${tags.map(t => `<span class="badge badge-purple">${escHtml(t)}</span>`).join('')}
        </div>
        <h3 class="blog-card-title">${escHtml(p.title || 'Untitled Post')}</h3>
        <p class="blog-card-excerpt">${escHtml(p.excerpt || '')}</p>
        <div class="blog-card-footer" style="margin-top: auto;">
          <span style="font-size:0.78rem;color:var(--text-muted)">✍️ ${escHtml(p.author || 'Team RGPV')} · ${dateStr}</span>
          <a href="${isRoot ? 'blog-post.html?id=' : '../blog/'}${p.id}${isRoot ? '' : '.html'}" class="read-more" aria-label="Read more about ${escHtml(p.title)}">Read More →</a>
        </div>
      </div>
    </article>`;
}

const allBlogsHtml = blogs.map(p => renderBlogCard(p, false)).join('');
// For index.html we link to the static blog pages? Wait! We are generating blog/[id].html!
// Oh, index.html is in root! So we link to `blog/[id].html`. Wait, I'll just link to `blog/[id].html` for both since both are in root right now! Wait! I'm creating files in `blog/` or `blog-post.html?id=`?
// The user asked to statically generate individual blogs. So I should create a `blog/` folder and put `[id].html` there!
// Let's link to `blog/${p.id}.html` for EVERYTHING since `blog.html` and `index.html` are BOTH at the root level!
const allBlogsHtmlFixed = blogs.map(p => renderBlogCard(p, true)).join('').replace(/blog-post.html\?id=/g, 'blog/');
const recentBlogsHtmlFixed = blogs.slice(0, 3).map(p => renderBlogCard(p, true)).join('').replace(/blog-post.html\?id=/g, 'blog/');

function injectIntoHtml(filePath, idToInject, newContent, wrapperClass = '') {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const startMarker = `<!-- BLOGS_START -->`;
  const endMarker = `<!-- BLOGS_END -->`;
  const block = `${startMarker}\n${wrapperClass ? `<div class="${wrapperClass}">\n` : ''}${newContent}${wrapperClass ? `\n</div>` : ''}\n${endMarker}`;

  if (content.includes(startMarker)) {
    content = content.replace(new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`, 'g'), block);
  } else {
    // Basic injection
    const targetTag = `<div id="${idToInject}"`;
    const searchIdx = content.indexOf(targetTag);
    if (searchIdx !== -1) {
       // Just insert it AFTER the div tag
       const closeBracket = content.indexOf('>', searchIdx);
       content = content.substring(0, closeBracket + 1) + '\n' + block + '\n' + content.substring(closeBracket + 1);
    }
  }

  // Hide the loading state just in case it's still there
  content = content.replace(new RegExp(`(<div class="loading-center">\\s*<div class="spinner"></div>\\s*<span>Loading posts…</span>\\s*</div>)`, 'g'), '<!-- Removed Loading State -->');
  content = content.replace(/(<div id="blogLoading"[^>]*)>(<div class="spinner">)/i, '$1 style="display:none;">$2');

  // We add a script to tell blog.js to skip Firebase fetch because HTML is statically provided!
  if (!content.includes('window.BLOG_LIST_STATIC = true;')) {
     content = content.replace(/<\/body>/i, `<script>
        window.BLOG_LIST_STATIC = true;
        window.BLOG_LIST_DATA = ${JSON.stringify(blogs.map(b => ({
          id: b.id, title: b.title, excerpt: b.excerpt, coverImage: b.coverImage, tags: b.tags, author: b.author, 
          createdAt: b.createdAt
        })))};
      </script>\n</body>`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

// Update blog.html
injectIntoHtml(blogHtmlPath, 'blogGrid', allBlogsHtmlFixed.replace(/blog\/([a-zA-Z0-9_-]+)/g, 'blog/$1.html'));
console.log(`✅ Injected ${blogs.length} posts into blog.html`);

// Update index.html
injectIntoHtml(indexHtmlPath, 'recentBlogs', recentBlogsHtmlFixed.replace(/blog\/([a-zA-Z0-9_-]+)/g, 'blog/$1.html'), 'card-grid grid-3');
console.log(`✅ Injected ${Math.min(blogs.length, 3)} recent posts into index.html`);
