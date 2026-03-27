// =========================================
// Blog JS — Fetch & Render from Firestore
// =========================================

(async function () {
  const db = window.RGPV.db;

  // ─── Blog Listing Page ──────────────────
  const blogGrid = document.getElementById('blogGrid');
  const blogLoading = document.getElementById('blogLoading');
  const blogEmpty = document.getElementById('blogEmpty');
  const blogSearch = document.getElementById('blogSearch');
  const tagFilter = document.getElementById('tagFilter');

  let allPosts = [];

  if (blogGrid) {
    await loadBlogPosts();
  }

  // ─── Single Blog Post Page ──────────────
  const postContent = document.getElementById('postContent');
  if (postContent) {
    await loadSinglePost();
  }

  // ─── Homepage Recent Blogs ──────────────
  const recentBlogsEl = document.getElementById('recentBlogs');
  if (recentBlogsEl) {
    await loadRecentBlogs();
  }

  async function loadBlogPosts() {
    try {
      if (window.BLOG_LIST_STATIC && window.BLOG_LIST_DATA) {
        allPosts = window.BLOG_LIST_DATA;
        populateTags();
        // UI is pre-rendered in HTML, but we populate allPosts so search/filter works!
        return;
      }
      const snap = await db.collection('blogs').orderBy('createdAt', 'desc').get();
      allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.published === true || p.published === 'true');
      populateTags();
      renderPosts(allPosts);
    } catch (e) {
      console.error('loadBlogPosts:', e);
      if (blogLoading) blogLoading.style.display = 'none';
      if (blogEmpty) blogEmpty.style.display = 'flex';
    }
  }

  function populateTags() {
    if (!tagFilter) return;
    const tags = new Set();
    allPosts.forEach(p => (p.tags || []).forEach(t => tags.add(t)));
    tags.forEach(tag => {
      const opt = document.createElement('option');
      opt.value = tag; opt.textContent = tag;
      tagFilter.appendChild(opt);
    });
  }

  function renderPosts(posts) {
    if (blogLoading) blogLoading.style.display = 'none';
    if (!posts.length) { if (blogEmpty) blogEmpty.style.display = 'flex'; return; }
    if (blogEmpty) blogEmpty.style.display = 'none';
    blogGrid.innerHTML = posts.map(renderBlogCard).join('');
  }

  function renderBlogCard(p) {
    let dateStr = '';
    if (p.createdAt?.toDate) {
      dateStr = p.createdAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } else if (p.createdAt) {
      dateStr = p.createdAt;
    }
    const date = dateStr;
    const tags = (p.tags || []).slice(0, 2);
    const mediaHtml = p.coverImage 
      ? `<img src="${escHtml(p.coverImage)}" alt="Cover" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;"/>`
      : `<div style="font-size:3rem;">${p.emoji || '📚'}</div>`;
    return `
    <article class="blog-card">
      <div class="blog-card-img" style="padding:0; overflow:hidden; display:flex; align-items:center; justify-content:center;">${mediaHtml}</div>
      <div class="blog-card-body">
        <div class="blog-card-meta">
          ${tags.map(t => `<span class="badge badge-purple">${escHtml(t)}</span>`).join('')}
        </div>
        <h3 class="blog-card-title">${escHtml(p.title || 'Untitled Post')}</h3>
        <p class="blog-card-excerpt">${escHtml(p.excerpt || '')}</p>
        <div class="blog-card-footer">
          <span style="font-size:0.78rem;color:var(--text-muted)">✍️ ${escHtml(p.author || 'Team RGPV')} · ${date}</span>
          <a href="blog-post.html?id=${p.id}" class="read-more" aria-label="Read more about ${escHtml(p.title)}">Read More →</a>
        </div>
      </div>
    </article>`;
  }

  // Blog search & filter
  let searchDebounce;
  if (blogSearch) {
    blogSearch.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(filterPosts, 280);
    });
  }
  if (tagFilter) tagFilter.addEventListener('change', filterPosts);

  function filterPosts() {
    const q = (blogSearch?.value || '').toLowerCase().trim();
    const tag = tagFilter?.value || '';
    const result = allPosts.filter(p => {
      const matchQ = !q || (p.title || '').toLowerCase().includes(q) || (p.excerpt || '').toLowerCase().includes(q);
      const matchTag = !tag || (p.tags || []).includes(tag);
      return matchQ && matchTag;
    });
    renderPosts(result);
  }

  // ─── Single Post Page ───────────────────
  async function loadSinglePost() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    if (window.BLOG_STATIC && window.BLOG_DATA) {
      renderSinglePostUI({ id: id || 'static', ...window.BLOG_DATA });
      return;
    }
    
    if (!id) { postContent.innerHTML = '<p>Post not found.</p>'; return; }
    try {
      const doc = await db.collection('blogs').doc(id).get();
      if (!doc.exists) { postContent.innerHTML = '<p>Post not found.</p>'; return; }
      renderSinglePostUI({ id: doc.id, ...doc.data() });
    } catch (e) {
      console.error(e);
      postContent.innerHTML = '<p>Failed to load post.</p>';
    }
  }
  
  function renderSinglePostUI(p) {
      let dateStr = '';
      let isoDatePublished = '';
      let isoDateModified = '';
      if (p.createdAt?.toDate) {
        const created = p.createdAt.toDate();
        dateStr = created.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        isoDatePublished = created.toISOString();
      } else if (p.createdAt) {
        dateStr = p.createdAt;
      }
      if (p.updatedAt?.toDate) {
        isoDateModified = p.updatedAt.toDate().toISOString();
      } else {
        isoDateModified = isoDatePublished;
      }
      const date = dateStr;

      document.title = `${p.title} | RGPV Papers Blog`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', p.excerpt || p.title);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', p.title);

      // Inject Article structured data (JSON-LD) for Google
      injectArticleSchema(p, isoDatePublished, isoDateModified);

      const titleEl = document.getElementById('postTitle');
      const metaEl = document.getElementById('postMeta');
      const bodyEl = document.getElementById('postBody');
      const tagsEl = document.getElementById('postTags');

      if (titleEl) titleEl.textContent = p.title;
      if (metaEl) metaEl.innerHTML = `✍️ <strong>${escHtml(p.author || 'Team RGPV')}</strong> &nbsp;·&nbsp; 📅 ${date}`;
      if (bodyEl) {
        bodyEl.innerHTML = (p.coverImage ? `<img src="${escHtml(p.coverImage)}" alt="Cover" style="width:100%; max-height:400px; object-fit:cover; border-radius:12px; margin-bottom:20px;" />` : '') + (p.content || '');
      }
      if (tagsEl && p.tags) tagsEl.innerHTML = p.tags.map(t => `<span class="badge badge-purple">${escHtml(t)}</span>`).join('');

      // Ping Google & Bing so they know site has updated content
      pingSearchEngines();
  }

  // ─── Inject Article JSON-LD Schema ─────
  function injectArticleSchema(post, datePublished, dateModified) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": post.title || '',
      "description": post.excerpt || post.title || '',
      "author": { "@type": "Person", "name": post.author || 'Team RGPV' },
      "publisher": {
        "@type": "Organization",
        "name": "RGPV Papers",
        "url": "https://rgpvpyq.co.in"
      },
      "url": window.location.href,
      "mainEntityOfPage": window.location.href,
    };
    if (datePublished) schema.datePublished = datePublished;
    if (dateModified) schema.dateModified = dateModified;
    if (post.coverImage) schema.image = post.coverImage;
    if (post.tags && post.tags.length) schema.keywords = post.tags.join(', ');

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  // ─── Ping Google & Bing Sitemap ────────
  function pingSearchEngines() {
    const sitemapUrl = 'https://rgpvpyq.co.in/sitemap.xml';
    const pings = [
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    ];
    pings.forEach(url => {
      fetch(url, { mode: 'no-cors' }).catch(() => {});
    });
    // IndexNow ping for Bing/Yandex with current page URL
    fetch(`https://api.indexnow.org/indexnow?url=${encodeURIComponent(window.location.href)}&key=rgpvpyqcoinsitemap`, { mode: 'no-cors' }).catch(() => {});
    console.log('[SEO] Search engines pinged for updated content');
  }

  // ─── Recent Blogs (homepage) ────────────
  async function loadRecentBlogs() {
    try {
      if (window.BLOG_LIST_STATIC) {
        pingSearchEngines(); // HTML is already there
        return;
      }
      const snap = await db.collection('blogs').orderBy('createdAt', 'desc').get();
      const posts = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.published === true || p.published === 'true').slice(0, 3);
      if (!posts.length) { recentBlogsEl.innerHTML = '<p style="text-align:center;color:var(--text-muted)">No posts yet.</p>'; return; }
      recentBlogsEl.className = 'card-grid grid-3';
      recentBlogsEl.innerHTML = posts.map(renderBlogCard).join('');
      // Ping search engines when homepage loads fresh blog content
      pingSearchEngines();
    } catch (e) { console.error(e); }
  }

  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

})();
