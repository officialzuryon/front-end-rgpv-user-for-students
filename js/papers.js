// =========================================
// Papers JS — Fetch, Filter, Sort, Viewer
// =========================================

(async function () {
  const db = window.RGPV.db;

  // ─── State ─────────────────────────────
  let allPapers = [];
  let filteredPapers = [];
  let universities = [];
  let branches = [];
  let currentPage = 1;
  const PAGE_SIZE = 12;
  let sortField = 'title';
  let sortDir = 'asc';
  let activeFilters = {};
  let viewMode = 'grid'; // grid | list

  // ─── DOM Refs ───────────────────────────
  const papersContainer = document.getElementById('papersContainer');
  const resultsCount = document.getElementById('resultsCount');
  const paginationEl = document.getElementById('pagination');
  const loadingEl = document.getElementById('papersLoading');
  const emptyEl = document.getElementById('papersEmpty');
  const globalSearch = document.getElementById('globalSearch');
  const filterUniversity = document.getElementById('filterUniversity');
  const filterBranch = document.getElementById('filterBranch');
  const filterSemester = document.getElementById('filterSemester');
  const filterYear = document.getElementById('filterYear');
  const filterCode = document.getElementById('filterCode');
  const filterSubject = document.getElementById('filterSubject');
  const activeFiltersWrap = document.getElementById('activeFilters');
  const clearAllBtn = document.getElementById('clearAllFilters');
  const filterCountEl = document.getElementById('filterCount');
  const sortDirBtn = document.getElementById('sortDirBtn');
  const viewerModal = document.getElementById('viewerModal');
  const viewerTitle = document.getElementById('viewerTitle');
  const viewerFrame = document.getElementById('viewerFrame');

  // ─── Load Universities ──────────────────
  async function loadUniversities() {
    try {
      const snap = await db.collection('universities').orderBy('name').get();
      universities = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (filterUniversity) {
        universities.forEach(u => {
          const opt = document.createElement('option');
          opt.value = u.id; opt.textContent = u.name;
          filterUniversity.appendChild(opt);
        });
      }
    } catch (e) { console.error('loadUniversities:', e); }
  }

  // ─── Load Branches (filtered by university) ──
  async function loadBranches(universityId = null) {
    try {
      let query = db.collection('branches').orderBy('name');
      if (universityId) query = query.where('universityId', '==', universityId);
      const snap = await query.get();
      branches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (filterBranch) {
        filterBranch.innerHTML = '<option value="">All Branches</option>';
        branches.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b.id; opt.textContent = b.name;
          filterBranch.appendChild(opt);
        });
      }
    } catch (e) { console.error('loadBranches:', e); }
  }

  // ─── Load Papers ────────────────────────
  async function loadPapers() {
    showLoading(true);
    try {
      const snap = await db.collection('papers').orderBy('createdAt', 'desc').get();
      allPapers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      applyFilters();
    } catch (e) {
      console.error('loadPapers:', e);
      showEmpty('Failed to load papers. Please refresh.');
    } finally {
      showLoading(false);
    }
  }

  // ─── Filter & Sort ──────────────────────
  let activeSearchQuery = '';

  function applyFilters() {
    const uId = filterUniversity?.value || '';
    const bId = filterBranch?.value || '';
    const sem = filterSemester?.value || '';
    const yr = filterYear?.value || '';
    const code = (filterCode?.value || '').toLowerCase().trim();
    const subj = (filterSubject?.value || '').toLowerCase().trim();

    activeFilters = {};
    if (activeSearchQuery) activeFilters.search = `"${activeSearchQuery}"`;
    if (uId) { const u = universities.find(x => x.id === uId); activeFilters.university = u?.name || uId; }
    if (bId) { const b = branches.find(x => x.id === bId); activeFilters.branch = b?.name || bId; }
    if (sem) activeFilters.semester = `Sem ${sem}`;
    if (yr) activeFilters.year = yr;
    if (code) activeFilters.code = code.toUpperCase();
    if (subj) activeFilters.subject = subj;

    const queryTokens = activeSearchQuery ? activeSearchQuery.split(/\s+/).filter(Boolean) : [];

    filteredPapers = allPapers.map(p => {
      const title = (p.title || '').toLowerCase();
      const pCode = (p.code || '').toLowerCase();
      const pSubject = (p.subject || '').toLowerCase();
      const pBranch = (p.branchId || p.branch || '');
      const pUniv = (p.universityId || '');
      const pSem = String(p.semester || '');
      const pYear = String(p.year || '');

      const matchU = !uId || pUniv === uId;
      const matchB = !bId || pBranch === bId;
      const matchS = !sem || pSem === sem;
      const matchY = !yr || pYear === yr;
      const matchC = !code || pCode.includes(code);
      const matchSub = !subj || pSubject.includes(subj);

      // Relevance Scoring for fuzzy search
      let searchScore = 0;
      if (queryTokens.length > 0) {
        let tokenMatches = 0;
        queryTokens.forEach(token => {
          let matched = false;
          // Exact matches are worth the most
          if (pCode === token) { searchScore += 10; matched = true; }
          else if (pCode.includes(token)) { searchScore += 5; matched = true; }
          
          if (pSubject === token) { searchScore += 8; matched = true; }
          else if (pSubject.includes(token)) { searchScore += 4; matched = true; }
          
          if (title === token) { searchScore += 6; matched = true; }
          else if (title.includes(token)) { searchScore += 3; matched = true; }
          
          if (matched) tokenMatches++;
        });
        
        // If a query exists, it MUST match at least partially (score > 0)
        // You can make this stricter by requiring (tokenMatches === queryTokens.length)
        if (searchScore === 0) return null; 
      }

      // If it passes dropdown filters
      if (matchU && matchB && matchS && matchY && matchC && matchSub) {
        return { ...p, searchScore }; // Attach calculated score for sorting
      }
      return null;
    }).filter(Boolean); // Drop nulls

    sortPapers();
    renderActiveFilters();
    renderFilterCount();
    currentPage = 1;
    renderResults();
    // Removed automatic scroll to top unprompted
    // window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function sortPapers() {
    const fieldMap = {
      title: p => (p.title || '').toLowerCase(),
      branch: p => (branches.find(b => b.id === (p.branchId || p.branch))?.name || p.branch || '').toLowerCase(),
      code: p => (p.code || '').toLowerCase(),
      year: p => parseInt(p.year) || 0,
    };
    const getter = fieldMap[sortField] || fieldMap.title;
    
    filteredPapers.sort((a, b) => {
      // Primary Sort: If a global search query is active, always rank by score first
      if (activeSearchQuery && a.searchScore !== b.searchScore) {
        return b.searchScore - a.searchScore; // Highest score first
      }
      
      // Secondary Sort (or Primary if no search): User selected dropdown
      const va = getter(a), vb = getter(b);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // ─── Render ─────────────────────────────
  function renderResults() {
    if (!papersContainer) return;
    const total = filteredPapers.length;

    if (resultsCount) {
      resultsCount.innerHTML = `Showing <strong>${Math.min(PAGE_SIZE, total - (currentPage - 1) * PAGE_SIZE)}</strong> of <strong>${total}</strong> papers`;
    }

    if (total === 0) { showEmpty(); return; }
    if (emptyEl) emptyEl.style.display = 'none';

    const start = (currentPage - 1) * PAGE_SIZE;
    const page = filteredPapers.slice(start, start + PAGE_SIZE);

    papersContainer.className = viewMode === 'list' ? 'papers-list' : 'papers-grid';
    papersContainer.innerHTML = page.map(renderPaperCard).join('');
    renderPagination(total);
  }

  function getBranchName(p) {
    const b = branches.find(x => x.id === (p.branchId || p.branch));
    return b?.name || p.branch || '—';
  }
  function getUnivName(p) {
    const u = universities.find(x => x.id === p.universityId);
    return u?.name || p.university || 'RGPV';
  }

  function renderPaperCard(p) {
    return `
    <article class="paper-card" role="article">
      <div class="paper-card-top">
        <div class="paper-card-code">📄 ${p.code || 'N/A'}</div>
        <h3 class="paper-card-title">${escHtml(p.title || p.subject || 'Question Paper')}</h3>
      </div>
      <div class="paper-card-body">
        <div class="paper-meta-grid">
          <div class="paper-meta-item">
            <label>University</label>
            <span>${escHtml(getUnivName(p))}</span>
          </div>
          <div class="paper-meta-item">
            <label>Branch</label>
            <span>${escHtml(getBranchName(p))}</span>
          </div>
          <div class="paper-meta-item">
            <label>Semester</label>
            <span>Sem ${p.semester || '—'}</span>
          </div>
          <div class="paper-meta-item">
            <label>Year</label>
            <span>${p.year || '—'}</span>
          </div>
        </div>
      </div>
      <div class="paper-card-footer">
        <span class="badge badge-purple">${escHtml(p.subject || '—')}</span>
        <button class="view-btn" onclick="openPaperViewer('${p.id}','${escHtml(p.title || p.subject || 'Question Paper')}','${escHtml(p.fileUrl || '')}','${p.fileType || 'pdf'}')" aria-label="View ${escHtml(p.title || 'paper')}">
          👁 View Paper
        </button>
      </div>
    </article>`;
  }

  function renderPagination(total) {
    if (!paginationEl) return;
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) { paginationEl.innerHTML = ''; return; }
    let html = '';
    html += `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous">‹</button>`;
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - currentPage) <= 1) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
      } else if (Math.abs(i - currentPage) === 2) {
        html += `<span style="padding:0 4px;color:var(--text-muted)">…</span>`;
      }
    }
    html += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === pages ? 'disabled' : ''} aria-label="Next">›</button>`;
    paginationEl.innerHTML = html;
  }

  window.changePage = (p) => {
    const pages = Math.ceil(filteredPapers.length / PAGE_SIZE);
    if (p < 1 || p > pages) return;
    currentPage = p;
    renderResults();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Active Filters UI ──────────────────
  function renderActiveFilters() {
    if (!activeFiltersWrap) return;
    const entries = Object.entries(activeFilters);
    if (!entries.length) { activeFiltersWrap.innerHTML = ''; return; }
    activeFiltersWrap.innerHTML = entries.map(([key, val]) =>
      `<span class="active-filter-pill">${escHtml(val)}<button onclick="clearFilter('${key}')" aria-label="Remove ${key} filter">✕</button></span>`
    ).join('');
  }

  function renderFilterCount() {
    const count = Object.keys(activeFilters).length;
    if (filterCountEl) { filterCountEl.textContent = count; filterCountEl.style.display = count ? '' : 'none'; }
    if (clearAllBtn) clearAllBtn.classList.toggle('visible', count > 0);
  }

  window.clearFilter = (key) => {
    if (key === 'search') {
      activeSearchQuery = '';
      if (globalSearch) {
        globalSearch.value = '';
        globalSearch.closest('.global-search-container')?.querySelector('.global-search-wrap')?.classList.remove('has-value');
      }
    } else {
      const map = { university: filterUniversity, branch: filterBranch, semester: filterSemester, year: filterYear, code: filterCode, subject: filterSubject };
      if (map[key]) { map[key].value = ''; if (key === 'university') loadBranches(); }
    }
    applyFilters();
  };

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      [filterUniversity, filterBranch, filterSemester, filterYear, filterCode, filterSubject].forEach(el => { if (el) el.value = ''; });
      activeSearchQuery = '';
      if (globalSearch) {
        globalSearch.value = '';
        globalSearch.closest('.global-search-container')?.querySelector('.global-search-wrap')?.classList.remove('has-value');
      }
      loadBranches();
      applyFilters();
    });
  }

  // ─── Paper Viewer (Google Docs wrapper with auto-retry) ───
  let viewerRetryTimer = null;
  let viewerLoadTimer = null;

  function getViewerLoader() {
    return viewerFrame?.closest('.modal-body')?.querySelector('.viewer-loader');
  }

  window.openPaperViewer = (id, title, url, type) => {
    if (!url) { showToast('Paper not available yet.', 'error'); return; }
    if (viewerTitle) viewerTitle.textContent = title;

    // Clear any pending timers from previous viewer session
    clearTimeout(viewerRetryTimer);
    clearTimeout(viewerLoadTimer);

    if (viewerFrame) {
      const src = type === 'pdf'
        ? `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
        : url;

      // Show loading state
      viewerFrame.style.opacity = '0';
      viewerFrame.style.transition = 'opacity 0.4s ease';
      viewerFrame.src = '';
      const loader = getViewerLoader();
      if (loader) loader.style.display = 'flex';

      let loaded = false;
      let retryCount = 0;
      const MAX_RETRIES = 3;

      function onFrameLoad() {
        loaded = true;
        clearTimeout(viewerRetryTimer);
        viewerFrame.style.opacity = '1';
        if (loader) loader.style.display = 'none';
      }

      function tryLoad() {
        loaded = false;
        viewerFrame.style.opacity = '0';
        if (loader) loader.style.display = 'flex';
        // Use a unique fragment to force iframe reload without busting Google's server cache
        viewerFrame.src = src + '&_t=' + Date.now();
        viewerFrame.onload = onFrameLoad;

        // Auto-retry if not loaded after 5 seconds
        viewerRetryTimer = setTimeout(() => {
          if (!loaded && retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`PDF viewer: auto-retry ${retryCount}/${MAX_RETRIES}`);
            tryLoad();
          }
        }, 5000);
      }

      setTimeout(tryLoad, 50);
    }
    openModal('viewerModal');
  };

  if (document.getElementById('closeViewer')) {
    document.getElementById('closeViewer').addEventListener('click', () => {
      clearTimeout(viewerRetryTimer);
      clearTimeout(viewerLoadTimer);
      closeModal('viewerModal');
      setTimeout(() => { if (viewerFrame) viewerFrame.src = ''; }, 300);
    });
  }

  // ─── Sort Controls ──────────────────────
  document.querySelectorAll('.sort-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.sort-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      sortField = chip.dataset.sort;
      sortPapers();
      currentPage = 1;
      renderResults();
    });
  });

  if (sortDirBtn) {
    sortDirBtn.addEventListener('click', () => {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      sortDirBtn.classList.toggle('desc', sortDir === 'desc');
      sortDirBtn.setAttribute('title', sortDir === 'asc' ? 'Ascending' : 'Descending');
      sortPapers();
      currentPage = 1;
      renderResults();
    });
  }

  // ─── View Toggle ────────────────────────
  document.querySelectorAll('.view-btn-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      viewMode = btn.dataset.view;
      renderResults();
    });
  });

  // ─── Search/Filter Events ───────────────
  const searchPapersBtn = document.getElementById('searchPapersBtn');
  
  function triggerGlobalSearch() {
    if (!globalSearch) return;
    const val = globalSearch.value.trim().toLowerCase();
    activeSearchQuery = val;
    applyFilters();
  }

  if (globalSearch) {
    // Only handle UI state on input. Do NOT trigger applyFilters.
    globalSearch.addEventListener('input', () => {
      const wrap = globalSearch.closest('.global-search-container')?.querySelector('.global-search-wrap');
      if (wrap) wrap.classList.toggle('has-value', !!globalSearch.value);
    });
    
    // Trigger on Enter key
    globalSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerGlobalSearch();
      }
    });

    const clearInputBtn = globalSearch.parentElement?.querySelector('.clear-input-btn');
    if (clearInputBtn) {
      clearInputBtn.addEventListener('click', () => {
        globalSearch.value = '';
        activeSearchQuery = '';
        globalSearch.closest('.global-search-container')?.querySelector('.global-search-wrap')?.classList.remove('has-value');
        applyFilters();
      });
    }
  }

  if (searchPapersBtn) {
    searchPapersBtn.addEventListener('click', triggerGlobalSearch);
  }

  [filterUniversity, filterBranch, filterSemester, filterYear].forEach(el => {
    if (el) el.addEventListener('change', () => {
      if (el === filterUniversity) loadBranches(el.value || null);
      applyFilters();
    });
  });

  let codeTimeout, subjTimeout;
  if (filterCode) filterCode.addEventListener('input', () => { clearTimeout(codeTimeout); codeTimeout = setTimeout(applyFilters, 300); });
  if (filterSubject) filterSubject.addEventListener('input', () => { clearTimeout(subjTimeout); subjTimeout = setTimeout(applyFilters, 300); });

  // ─── Helpers ────────────────────────────
  function showLoading(show) {
    if (loadingEl) loadingEl.style.display = show ? 'flex' : 'none';
    if (papersContainer) papersContainer.style.display = show ? 'none' : '';
  }
  function showEmpty(msg = 'No papers found matching your filters.') {
    if (papersContainer) papersContainer.innerHTML = '';
    if (emptyEl) { emptyEl.style.display = 'flex'; const p = emptyEl.querySelector('p'); if (p) p.textContent = msg; }
    if (paginationEl) paginationEl.innerHTML = '';
    if (resultsCount) resultsCount.textContent = '';
  }
  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ─── Populate Year Dropdown ─────────────
  function populateYears() {
    if (!filterYear) return;
    const current = new Date().getFullYear();
    for (let y = current; y >= 2010; y--) {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      filterYear.appendChild(opt);
    }
  }

  // ─── Init ───────────────────────────────
  async function init() {
    populateYears();
    await loadUniversities();
    await loadBranches();
    await loadPapers();
  }

  if (document.getElementById('papersContainer')) init();

  // ─── Homepage featured papers ────────────
  const featuredContainer = document.getElementById('featuredPapers');
  if (featuredContainer) {
    (async () => {
      try {
        const snap = await db.collection('papers').orderBy('createdAt', 'desc').limit(6).get();
        const papers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!papers.length) { featuredContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted)">No papers yet.</p>'; return; }
        featuredContainer.className = 'card-grid grid-3';
        featuredContainer.innerHTML = papers.map(p => {
          const b = p.branch || 'General';
          const y = p.year || '';
          return `
          <article class="paper-card">
            <div class="paper-card-top">
              <div class="paper-card-code">📄 ${p.code || 'N/A'}</div>
              <h3 class="paper-card-title">${escHtml(p.title || p.subject || 'Question Paper')}</h3>
            </div>
            <div class="paper-card-body">
              <div class="paper-meta-grid">
                <div class="paper-meta-item"><label>Branch</label><span>${escHtml(b)}</span></div>
                <div class="paper-meta-item"><label>Year</label><span>${y || '—'}</span></div>
                <div class="paper-meta-item"><label>Semester</label><span>Sem ${p.semester || '—'}</span></div>
                <div class="paper-meta-item"><label>Subject</label><span>${escHtml(p.subject || '—')}</span></div>
              </div>
            </div>
            <div class="paper-card-footer">
              <span class="badge badge-purple">${escHtml(p.subject || '—')}</span>
              <a href="papers.html?code=${encodeURIComponent(p.code || '')}" class="view-btn">👁 View</a>
            </div>
          </article>`;
        }).join('');
      } catch (e) { console.error(e); }
    })();
  }

  // ─── Homepage Stats counters from Firebase ──
  const statsEl = document.getElementById('liveStats');
  if (statsEl) {
    (async () => {
      try {
        const [uSnap, pSnap, bSnap] = await Promise.all([
          db.collection('universities').get(),
          db.collection('papers').get(),
          db.collection('branches').get()
        ]);
        const papersNum = document.querySelector('[data-counter="papers"]');
        const univNum = document.querySelector('[data-counter="universities"]');
        const branchNum = document.querySelector('[data-counter="branches"]');
        if (papersNum) papersNum.setAttribute('data-counter', pSnap.size);
        if (univNum) univNum.setAttribute('data-counter', uSnap.size);
        if (branchNum) branchNum.setAttribute('data-counter', bSnap.size);
      } catch (e) { console.error(e); }
    })();
  }

})();
