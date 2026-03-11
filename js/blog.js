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
      const snap = await db.collection('blogs').orderBy('date', 'desc').get();
      allPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    const date = p.date?.toDate ? p.date.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : (p.date || '');
    const emoji = p.emoji || '📚';
    const tags = (p.tags || []).slice(0, 2);
    return `
    <article class="blog-card">
      <div class="blog-card-img">${emoji}</div>
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
    if (!id) { postContent.innerHTML = '<p>Post not found.</p>'; return; }
    try {
      const doc = await db.collection('blogs').doc(id).get();
      if (!doc.exists) { postContent.innerHTML = '<p>Post not found.</p>'; return; }
      const p = { id: doc.id, ...doc.data() };
      const date = p.date?.toDate ? p.date.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : (p.date || '');

      document.title = `${p.title} | RGPV Papers Blog`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', p.excerpt || p.title);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', p.title);

      const titleEl = document.getElementById('postTitle');
      const metaEl = document.getElementById('postMeta');
      const bodyEl = document.getElementById('postBody');
      const tagsEl = document.getElementById('postTags');

      if (titleEl) titleEl.textContent = p.title;
      if (metaEl) metaEl.innerHTML = `✍️ <strong>${escHtml(p.author || 'Team RGPV')}</strong> &nbsp;·&nbsp; 📅 ${date}`;
      if (bodyEl) bodyEl.innerHTML = p.content || '';
      if (tagsEl && p.tags) tagsEl.innerHTML = p.tags.map(t => `<span class="badge badge-purple">${escHtml(t)}</span>`).join('');
    } catch (e) {
      console.error(e);
      postContent.innerHTML = '<p>Failed to load post.</p>';
    }
  }

  // ─── Recent Blogs (homepage) ────────────
  async function loadRecentBlogs() {
    try {
      const snap = await db.collection('blogs').orderBy('date', 'desc').limit(3).get();
      const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!posts.length) { recentBlogsEl.innerHTML = '<p style="text-align:center;color:var(--text-muted)">No posts yet.</p>'; return; }
      recentBlogsEl.className = 'card-grid grid-3';
      recentBlogsEl.innerHTML = posts.map(renderBlogCard).join('');
    } catch (e) { console.error(e); }
  }

  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

})();
