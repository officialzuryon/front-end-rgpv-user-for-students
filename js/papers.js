// =========================================
// Papers JS — Fetch, Filter, Sort, Viewer
// =========================================

(async function () {
  const db = window.RGPV.db;

  // ─── Share SVG icon (forward-arrow style) ───
  const SHARE_ICON = `<svg class="share-icon-svg" fill="none" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;

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
  const filterDegree = document.getElementById('filterDegree');
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

  // ─── Degree → Course Mapping ──────────────
  // Maps each degree to the course/branch names it covers.
  // Branch names that match any of these (case-insensitive, partial match) will show.
  const DEGREE_COURSES = {
    'B.Tech': [
      'Computer Science', 'Information Technology', 'Electronics', 'Electrical',
      'Mechanical', 'Civil', 'Chemical', 'Biotechnology', 'Automobile',
      'Mining', 'Industrial', 'Aeronautical', 'Instrumentation',
      'Fire Technology', 'Textile', 'Polymer', 'Ceramic', 'Food Technology',
      'Computer Science & Engineering', 'CSE', 'IT', 'ECE', 'EE', 'ME', 'CE',
      'AI', 'Artificial Intelligence', 'Data Science', 'Cyber Security', 'IoT'
    ],
    'B.E.': [
      'Computer Science', 'Information Technology', 'Electronics', 'Electrical',
      'Mechanical', 'Civil', 'Chemical', 'Biotechnology',
      'CSE', 'IT', 'ECE', 'EE', 'ME', 'CE'
    ],
    'BCA': ['BCA', 'Computer Application', 'Computer Applications'],
    'MCA': ['MCA', 'Computer Application', 'Computer Applications'],
    'M.Tech': [
      'Computer Science', 'Information Technology', 'Electronics', 'Electrical',
      'Mechanical', 'Civil', 'VLSI', 'Embedded', 'Software Engineering',
      'Digital Communication', 'Power Systems', 'Structural', 'Thermal',
      'CSE', 'IT', 'ECE', 'EE', 'ME', 'CE'
    ],
    'MBA': ['MBA', 'Business Administration', 'Management', 'Finance', 'Marketing', 'HR', 'Human Resource'],
    'B.Sc': ['B.Sc', 'Physics', 'Chemistry', 'Mathematics', 'Biology', 'Computer Science', 'Zoology', 'Botany'],
    'M.Sc': ['M.Sc', 'Physics', 'Chemistry', 'Mathematics', 'Computer Science', 'Biotechnology'],
    'B.Pharm': ['B.Pharm', 'Pharmacy', 'Pharmaceutical'],
    'Diploma': [
      'Computer Science', 'Electronics', 'Electrical', 'Mechanical', 'Civil',
      'Chemical', 'Mining', 'Automobile', 'CSE', 'IT', 'ECE', 'EE', 'ME', 'CE'
    ]
  };

  // ─── Load Branches (filtered by degree ONLY) ──
  let allBranchesCache = null; // cache all branches for faster filtering

  async function loadBranches(universityId = null, degreeValue = null) {
    try {
      // 1. Fetch once and cache globally to avoid Firebase Missing Index errors
      if (!allBranchesCache) {
        const snap = await db.collection('branches').orderBy('name').get();
        allBranchesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      let branchList = [...allBranchesCache];

      // 2. Filter by Degree Locally
      if (degreeValue) {
        const allowedCourses = DEGREE_COURSES[degreeValue] ? DEGREE_COURSES[degreeValue].map(c => c.toLowerCase()) : [];
        branchList = branchList.filter(b => {
          // If the branch explicitly has this degree assigned in the DB, it belongs here 100%
          if (b.degree && b.degree === degreeValue) return true;

          // If it doesn't have an explicit degree, fallback to guessing via text mapping
          if (allowedCourses.length > 0) {
            const bName = (b.name || '').toLowerCase();
            return allowedCourses.some(course => {
              if (bName === course) return true;
              // Strict word boundary to avoid "CE" matching "Science"
              const regex = new RegExp(`(?:^|[^a-z0-9])${course.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\\\$&')}(?:[^a-z0-9]|$)`, 'i');
              return regex.test(bName);
            });
          }
          // If it has neither an explicit degree nor text mapping matching this degree, hide it
          return false;
        });
      }

      // Deduplicate branches by name before rendering options
      const uniqueBranches = [];
      const seen = new Set();
      branchList.forEach(b => {
        const name = (b.name || '').toLowerCase().trim();
        if (!seen.has(name)) {
          seen.add(name);
          uniqueBranches.push(b);
        }
      });
      branches = branchList; // keep all branches for lookups!

      if (filterBranch) {
        filterBranch.innerHTML = '<option value="">All Branches / Courses</option>';
        uniqueBranches.forEach(b => {
          const opt = document.createElement('option');
          opt.value = b.id; opt.textContent = b.name;
          filterBranch.appendChild(opt);
        });
      }
    } catch (e) { console.error('loadBranches:', e); }
  }

  // ─── Load Degrees ────────────────────────
  async function loadDegrees() {
    if (!filterDegree) return;
    try {
      // Fetch without orderBy to prevent Missing Index crash
      const snap = await db.collection('degrees').get();
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Sort locally
      docs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      docs.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.name; opt.textContent = d.name;
        filterDegree.appendChild(opt);
      });
    } catch (e) { console.error('loadDegrees:', e); }
  }

  // ─── Load Papers ────────────────────────
  async function loadPapers() {
    showLoading(true);
    try {
      const snap = await db.collection('papers').orderBy('createdAt', 'desc').get();
      allPapers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // ─── Read Filters from URL ────────────────
      const urlParams = new URLSearchParams(window.location.search);
      let hasUrlFilters = false;

      // Helper to set dropdown by ID (value) OR Name (text)
      const syncDropdown = (el, val) => {
        if (!el || !val) return false;
        // Try exact match (ID)
        el.value = val;
        // If no match (dropdown resets to index 0), try matching text
        if (el.selectedIndex <= 0 && val.length > 1) {
          const lowerVal = val.toLowerCase().trim();
          for (let i = 0; i < el.options.length; i++) {
            const opt = el.options[i];
            if (opt.textContent.toLowerCase().trim() === lowerVal) {
              el.selectedIndex = i;
              return true;
            }
          }
        }
        return el.value === val;
      };

      if (urlParams.has('university')) {
        if (syncDropdown(filterUniversity, urlParams.get('university'))) hasUrlFilters = true;
      }
      if (urlParams.has('degree')) {
        if (syncDropdown(filterDegree, urlParams.get('degree'))) {
          // Reload branches for this degree before trying to sync branch
          await loadBranches(filterUniversity?.value, filterDegree.value);
          hasUrlFilters = true;
        }
      }
      if (urlParams.has('branch')) {
        if (syncDropdown(filterBranch, urlParams.get('branch'))) hasUrlFilters = true;
      }
      if (urlParams.has('semester')) {
        if (syncDropdown(filterSemester, urlParams.get('semester'))) hasUrlFilters = true;
      }
      if (urlParams.has('year')) {
        if (syncDropdown(filterYear, urlParams.get('year'))) hasUrlFilters = true;
      }
      if (urlParams.has('code') && filterCode) {
        filterCode.value = urlParams.get('code');
        hasUrlFilters = true;
      }
      if (urlParams.has('subject') && filterSubject) {
        filterSubject.value = urlParams.get('subject');
        hasUrlFilters = true;
      }
      if (urlParams.has('q') && globalSearch) {
        globalSearch.value = urlParams.get('q');
        activeSearchQuery = urlParams.get('q');
        const wrap = globalSearch.closest('.global-search-container')?.querySelector('.global-search-wrap');
        if (wrap) wrap.classList.add('has-value');
        hasUrlFilters = true;
      }

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
    const deg = (filterDegree?.value || '').toLowerCase().trim();

    activeFilters = {};
    if (activeSearchQuery) activeFilters.search = `"${activeSearchQuery}"`;
    if (uId) { const u = universities.find(x => x.id === uId); activeFilters.university = u?.name || uId; }
    if (bId) { const b = branches.find(x => x.id === bId); activeFilters.branch = b?.name || bId; }
    if (sem) activeFilters.semester = `Sem ${sem}`;
    if (yr) activeFilters.year = yr;
    if (code) activeFilters.code = code.toUpperCase();
    if (subj) activeFilters.subject = subj;
    if (deg) activeFilters.degree = deg;

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

      // Match by branch Name instead of ID, since branches are global per degree
      let paperBranchName = (branches.find(b => b.id === pBranch)?.name || p.branch || '').toLowerCase().trim();
      let selectedBranchName = (branches.find(b => b.id === bId)?.name || '').toLowerCase().trim();
      const matchB = !bId || (paperBranchName === selectedBranchName);
      const matchS = !sem || pSem === sem;
      const matchY = !yr || pYear === yr;
      const matchC = !code || pCode.includes(code);
      const matchSub = !subj || pSubject.includes(subj);
      const matchDeg = !deg || (p.degree || '').toLowerCase().includes(deg);

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
      if (matchU && matchB && matchS && matchY && matchC && matchSub && matchDeg) {
        return { ...p, searchScore }; // Attach calculated score for sorting
      }
      return null;
    }).filter(Boolean); // Drop nulls

    // ─── Update URL to allow sharing filters ───────────────
    const urlParams = new URLSearchParams();
    if (uId) urlParams.set('university', uId);
    if (bId) urlParams.set('branch', bId);
    if (filterDegree?.value) urlParams.set('degree', filterDegree.value);
    if (sem) urlParams.set('semester', sem);
    if (yr) urlParams.set('year', yr);
    if (filterCode?.value) urlParams.set('code', filterCode.value);
    if (filterSubject?.value) urlParams.set('subject', filterSubject.value);
    if (activeSearchQuery) urlParams.set('q', activeSearchQuery);

    // Build new URL only if we actually have filters, otherwise revert to base path
    const paramString = urlParams.toString();
    const newUrl = window.location.pathname + (paramString ? '?' + paramString : '');

    // Only update if we aren't currently viewing a PDF so we don't clobber the #viewer state
    if (window.location.hash !== '#viewer') {
      window.history.replaceState({}, '', newUrl);
    }

    sortPapers();
    renderActiveFilters();
    renderFilterCount();
    currentPage = 1;

    // Add a small artificial delay so the user explicitly sees the refresh taking place
    showLoading(true);
    setTimeout(() => {
      renderResults();
      showLoading(false);
    }, 300);
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
        <div style="display: flex; gap: 8px; align-items: center;">
          <button onclick="sharePaper('${escHtml(p.title || p.subject || 'Paper')}', 'paper.html?id=${p.id}')" class="btn-share" aria-label="Share paper">
            ${SHARE_ICON}<span class="share-label">Share</span>
          </button>
          <a href="paper.html?id=${p.id}" class="btn btn-primary" style="text-decoration: none; padding: 6px 14px; border-radius: 8px;" aria-label="View ${escHtml(p.title || 'paper')}">
            👁 View
          </a>
        </div>
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
      const map = { university: filterUniversity, branch: filterBranch, semester: filterSemester, year: filterYear, code: filterCode, subject: filterSubject, degree: filterDegree };
      if (map[key]) { map[key].value = ''; if (key === 'university' || key === 'degree') reloadBranchesCascade(); }
    }
    applyFilters();
  };

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      [filterUniversity, filterBranch, filterSemester, filterYear, filterCode, filterSubject, filterDegree].forEach(el => { if (el) el.value = ''; });
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
      const pdfContainer = document.getElementById('pdfContainer');
      const canvas = document.getElementById('pdfCanvas');

      // Viewer UI Controls
      const pagination = viewerModal.querySelector('.viewer-pagination');
      const pageNumSpan = document.getElementById('pageNum');
      const pageCountSpan = document.getElementById('pageCount');
      const prevPageBtn = document.getElementById('prevPage');
      const nextPageBtn = document.getElementById('nextPage');
      const zoomInBtn = document.getElementById('zoomIn');
      const zoomOutBtn = document.getElementById('zoomOut');

      if (viewerModal && canvas) {
        // Open Modal & Reset UI State
        viewerModal.classList.add('active');
        document.body.style.overflow = 'hidden';

        const loader = getViewerLoader();
        if (loader) loader.style.display = 'flex';
        pdfContainer.style.display = 'none';
        [pagination, prevPageBtn, nextPageBtn, zoomInBtn, zoomOutBtn].forEach(el => el && (el.style.display = 'none'));

        // Use standard window scope variables for viewer state
        window._pdfDoc = null;
        window._pdfPageNum = 1;
        window._pdfScale = 1.2; // Default render scale
        let isRendering = false;
        let pageNumPending = null;

        // Zoom state
        let touchScale = 1;
        let initialPinchDistance = 0;
        let lastPinchTime = 0; // Prevent tap registering right after pinch

        const updateTransform = () => {
          // Ensure we don't zoom out past original size too much
          touchScale = Math.max(1, Math.min(touchScale, 5));
          canvas.style.width = (100 * touchScale) + '%';
          canvas.style.transform = `scale(${touchScale})`;
        };

        const updateSize = () => {
          touchScale = Math.max(1, Math.min(touchScale, 5));
          canvas.style.width = (100 * touchScale) + '%';
        };

        const resetTransform = () => {
          touchScale = 1;
          updateSize();
        };

        // Touch Event Listeners for pinch-to-zoom
        pdfContainer.addEventListener('touchstart', (e) => {
          if (e.touches.length >= 2) {
            initialPinchDistance = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );
          }
        }, { passive: false });

        pdfContainer.addEventListener('touchmove', (e) => {
          if (e.touches.length >= 2) {
            e.preventDefault(); // Prevent default scroll when pinching
            const currentDistance = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
            );

            if (initialPinchDistance > 0) {
              const delta = currentDistance / initialPinchDistance;
              touchScale *= delta;
              initialPinchDistance = currentDistance;
              lastPinchTime = new Date().getTime(); // Mark that we just pinched
              updateSize();
            }
          }
        }, { passive: false });

        pdfContainer.addEventListener('touchend', (e) => {
          if (e.touches.length < 2) {
            initialPinchDistance = 0;
          }
        });

        // Double tap to reset zoom
        let lastTap = 0;
        pdfContainer.addEventListener('touchend', (e) => {
          const currentTime = new Date().getTime();

          // If we just finished a pinch zoom, ignore this as a tap to prevent accidental resets
          if (currentTime - lastPinchTime < 300) {
            return;
          }

          if (e.changedTouches.length === 1) {
            const tapLength = currentTime - lastTap;
            if (tapLength < 500 && tapLength > 0) {
              resetTransform();
              e.preventDefault();
            }
            lastTap = currentTime;
          }
        });

        const ctx = canvas.getContext('2d');

        // Render the page
        const renderPage = (num) => {
          isRendering = true;

          // Fetch page
          window._pdfDoc.getPage(num).then((page) => {
            const viewport = page.getViewport({ scale: window._pdfScale });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
              canvasContext: ctx,
              viewport: viewport
            };

            const renderTask = page.render(renderContext);

            renderTask.promise.then(() => {
              isRendering = false;
              if (loader) loader.style.display = 'none';
              pdfContainer.style.display = 'block';

              // Show/Hide controls
              [pagination, prevPageBtn, nextPageBtn, zoomInBtn, zoomOutBtn].forEach(el => el && (el.style.display = 'flex'));
              if (pageNumSpan) pageNumSpan.textContent = num;

              // Next/Prev buttons state
              if (prevPageBtn) prevPageBtn.disabled = num <= 1;
              if (nextPageBtn) nextPageBtn.disabled = num >= window._pdfDoc.numPages;

              if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
              }
            });
          }).catch(err => {
            console.error("Error rendering PDF page:", err);
            isRendering = false;
            if (loader) loader.innerHTML = `<span style="color:var(--danger)">Error rendering PDF. Please try again later.</span>`;
          });
        };

        const queueRenderPage = (num) => {
          if (isRendering) {
            pageNumPending = num;
          } else {
            renderPage(num);
          }
        };

        const onPrevPage = () => {
          if (window._pdfPageNum <= 1) return;
          window._pdfPageNum--;
          resetTransform();
          queueRenderPage(window._pdfPageNum);
        };

        const onNextPage = () => {
          if (window._pdfPageNum >= window._pdfDoc.numPages) return;
          window._pdfPageNum++;
          resetTransform();
          queueRenderPage(window._pdfPageNum);
        };

        const onZoomIn = () => {
          touchScale += 0.5;
          updateSize();
        };

        const onZoomOut = () => {
          touchScale -= 0.5;
          updateSize();
        };

        // Attach event listeners natively to buttons
        if (prevPageBtn) prevPageBtn.onclick = onPrevPage;
        if (nextPageBtn) nextPageBtn.onclick = onNextPage;
        if (zoomInBtn) zoomInBtn.onclick = onZoomIn;
        if (zoomOutBtn) zoomOutBtn.onclick = onZoomOut;

        // Fetch the PDF using pdf.js
        const fetchAndRenderPDF = async () => {
          try {
            // Ensure pdf.js is loaded
            if (!window.pdfjsLib) {
              throw new Error("PDF.js library failed to load");
            }

            const loadingTask = window.pdfjsLib.getDocument(url);
            window._pdfDoc = await loadingTask.promise;

            if (pageCountSpan) pageCountSpan.textContent = window._pdfDoc.numPages;

            // Render first page
            renderPage(window._pdfPageNum);

          } catch (error) {
            console.error("Error loading PDF:", error);
            if (loader) {
              loader.innerHTML = `
                   <span style="color:var(--danger); text-align:center;">
                     Error loading document.<br>
                     <small style="color:var(--text-muted);">${error.message}</small>
                   </span>`;
            }
          }
        };

        // Start the flow
        fetchAndRenderPDF();

      }
    }

    // Add history state so native mobile back button closes modal
    window.history.pushState({ modal: 'viewer' }, '', '#viewer');
    openModal('viewerModal');
  };

  // Listen for native back button to close modal
  window.addEventListener('popstate', (e) => {
    const viewerModal = document.getElementById('viewerModal');
    if (viewerModal && viewerModal.classList.contains('active') && window.location.hash !== '#viewer') {
      document.getElementById('closeViewer').click();
    }
  });

  if (document.getElementById('closeViewer')) {
    document.getElementById('closeViewer').addEventListener('click', () => {
      clearTimeout(viewerRetryTimer);
      clearTimeout(viewerLoadTimer);
      closeModal('viewerModal');

      const canvas = document.getElementById('pdfCanvas');
      const pdfContainer = document.getElementById('pdfContainer');
      const loader = getViewerLoader();

      if (canvas && pdfContainer) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pdfContainer.style.display = 'none';
      }
      if (loader) {
        loader.style.display = 'flex';
        loader.innerHTML = `<div class="spinner"></div><span style="margin-top: 14px; font-size: 0.9rem; color: var(--text-muted); font-weight: 500;">Loading secure viewer...</span>`;
      }
      if (window._pdfDoc) {
        window._pdfDoc.destroy();
        window._pdfDoc = null;
      }

      // Clean up URL if we closed via the button instead of native back
      if (window.location.hash === '#viewer') {
        window.history.replaceState('', document.title, window.location.pathname + window.location.search);
      }
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

  // ─── Cascading Filter Events: Degree → University → Branch ───
  async function reloadBranchesCascade() {
    const uId = filterUniversity?.value || null;
    const deg = filterDegree?.value || null;
    // Reset branch selection when parent changes
    if (filterBranch) filterBranch.value = '';
    await loadBranches(uId, deg);
  }

  if (filterDegree) {
    filterDegree.addEventListener('change', async () => {
      await reloadBranchesCascade();
      applyFilters();
    });
  }

  if (filterUniversity) {
    filterUniversity.addEventListener('change', async () => {
      await reloadBranchesCascade();
      applyFilters();
    });
  }

  [filterBranch, filterSemester, filterYear].forEach(el => {
    if (el) el.addEventListener('change', () => {
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
    await loadDegrees();
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
              <div style="display: flex; gap: 8px; align-items: center;">
                <button onclick="sharePaper('${escHtml(p.title || p.subject || 'Paper')}', 'paper.html?id=${p.id}')" class="btn-share" aria-label="Share paper">
                  ${SHARE_ICON}<span class="share-label">Share</span>
                </button>
                <a href="paper.html?id=${p.id}" class="btn btn-primary" style="text-decoration: none; padding: 6px 14px; border-radius: 8px;" aria-label="View ${escHtml(p.title || 'paper')}">
                  👁 View
                </a>
              </div>
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
