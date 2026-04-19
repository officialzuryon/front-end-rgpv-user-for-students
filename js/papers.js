// =========================================
// Papers JS "” Fetch, Filter, Sort, Directory
// =========================================

window.getPaperUrl = function(pid) {
  const isFileProtocol = window.location.protocol === 'file:';
  
  if (isFileProtocol) {
      // Create a strict absolute path locally to bypass all Windows relative folder resolution bugs
      const currentPath = window.location.pathname;
      const frontIdx = currentPath.indexOf('/front/');
      if (frontIdx !== -1) {
          const basePath = currentPath.substring(0, frontIdx + '/front/'.length);
          return `${basePath}paper/${pid}.html`;
      } else {
          return `paper/${pid}.html`;
      }
  } else {
      // Universal routing for Live Servers and Production.
      const isWorkspaceRoot = window.location.pathname.includes('/front/');
      const basePath = isWorkspaceRoot ? '/front/' : '/';
      return `${basePath}paper/${pid}`;
  }
};

(async function () {
  const db = window.RGPV?.db || null;

  // â”€â”€â”€ Native JSON Data Fetcher â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let STATIC_DATA = null;
  async function getStaticData() {
    if (STATIC_DATA) return STATIC_DATA;
    try {
      const res = await fetch((window.location.pathname.includes('/papers/') || window.location.pathname.includes('/paper/') || window.location.pathname.includes('/blog/')) ? '../js/papers-data.json' : 'js/papers-data.json');
      STATIC_DATA = await res.json();
      return STATIC_DATA;
    } catch (e) { console.error('Failed to load JSON data:', e); return {}; }
  }

  // â”€â”€â”€ Share SVG icon (forward-arrow style) â”€â”€â”€
  const SHARE_ICON = `<svg class="share-icon-svg" fill="none" viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;

  // â”€â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let allPapers = [];
  let filteredPapers = [];
  let universities = [];
  let branches = [];
  let currentPage = 1;
  let isDataLoaded = false;
  const PAGE_SIZE = 12;
  let sortField = 'title';
  let sortDir = 'asc';
  let activeFilters = {};
  let viewMode = 'grid'; // grid | list

  // â”€â”€â”€ DOM Refs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Load Universities â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function loadUniversities() {
    try {
      const cached = sessionStorage.getItem('pyq_univs');
      if (cached) {
        universities = JSON.parse(cached);
      } else {
        const data = await getStaticData();
        universities = data.universities || [];
        sessionStorage.setItem('pyq_univs', JSON.stringify(universities));
      }
      if (filterUniversity) {
        universities.forEach(u => {
          const opt = document.createElement('option');
          opt.value = u.id; opt.textContent = u.name;
          filterUniversity.appendChild(opt);
        });
      }
    } catch (e) { console.error('loadUniversities:', e); }
  }

  // â”€â”€â”€ Degree â†’ Course Mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Load Branches (filtered by degree ONLY) â”€â”€
  let allBranchesCache = null; // cache all branches for faster filtering

  async function loadBranches(universityId = null, degreeValue = null) {
    try {
      // 1. Fetch once and cache globally to avoid Firebase Missing Index errors
      if (!allBranchesCache) {
        const cached = sessionStorage.getItem('pyq_branches');
        if (cached) {
          allBranchesCache = JSON.parse(cached);
        } else {
          const data = await getStaticData();
          allBranchesCache = data.branches || [];
          sessionStorage.setItem('pyq_branches', JSON.stringify(allBranchesCache));
        }
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

  // â”€â”€â”€ Load Degrees â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function loadDegrees() {
    if (!filterDegree) return;
    try {
      let docs;
      const cached = sessionStorage.getItem('pyq_degrees');
      if (cached) {
        docs = JSON.parse(cached);
      } else {
        const data = await getStaticData();
        docs = data.degrees || [];
        // Sort locally
        docs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        sessionStorage.setItem('pyq_degrees', JSON.stringify(docs));
      }

      docs.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.name; opt.textContent = d.name;
        filterDegree.appendChild(opt);
      });
    } catch (e) { console.error('loadDegrees:', e); }
  }

  // â”€â”€â”€ Load Papers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function loadPapers() {
    showLoading(true);
    try {
      // Force clear legacy cache schema
      sessionStorage.removeItem('pyq_papers');
      sessionStorage.removeItem('pyq_papers_time');
      
      const cached = null;
      const cacheTime = null;
      const now = Date.now();
      // Bypass cache permanently for now since we rely on getStaticData
      if (false) {
        allPapers = JSON.parse(cached);
      } else {
        const data = await getStaticData();
        allPapers = data.papers || [];
        try {
          sessionStorage.setItem('pyq_papers', JSON.stringify(allPapers));
          sessionStorage.setItem('pyq_papers_time', now.toString());
        } catch (e) { console.warn('sessionStorage full'); }
      }

      isDataLoaded = true;

      // â”€â”€â”€ Read Filters from URL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Filter & Sort â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let activeSearchQuery = '';

  function applyFilters() {
    if (!isDataLoaded) {
      showLoading(true);
      return;
    }

    const uId = filterUniversity?.value || '';
    const bId = filterBranch?.value || '';
    const sem = filterSemester?.value || '';
    const yr = filterYear?.value || '';
    const code = (filterCode?.value || '').toLowerCase().trim();
    const subj = (filterSubject?.value || '').toLowerCase().trim();
    const deg = (filterDegree?.value || '').toLowerCase().trim();

    activeFilters = {};
    if (activeSearchQuery) activeFilters.search = `"${activeSearchQuery}"`;
    if (bId) { const b = branches.find(x => x.id === bId); activeFilters.branch = b?.name || bId; }
    if (yr) activeFilters.year = yr;
    if (code) activeFilters.code = code.toUpperCase();
    if (subj) activeFilters.subject = subj;
    if (deg) activeFilters.degree = deg;

    // Levenshtein distance helper
    const getEditDistance = (a, b) => {
      if (a.length === 0) return b.length;
      if (b.length === 0) return a.length;
      const matrix = [];
      for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
      for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
          }
        }
      }
      return matrix[b.length][a.length];
    };

    const fuzzyMatch = (token, searchIndexStr) => {
      const words = searchIndexStr.split(/\s+/);

      // If token is very short or purely numbers (like "3" or "2023"), exact full-word match prevents "3" from matching "2023".
      if (token.length <= 2 || /^\d+$/.test(token)) {
        return words.includes(token);
      }

      // For longer alphanumeric tokens, allow substring match
      if (searchIndexStr.includes(token)) return true;

      // Do not allow fuzzy match if string contains digits (e.g. "3sem" should not match "4sem")
      if (/\d/.test(token)) return false;

      // Fuzzy match for typos in long words
      for (const word of words) {
        if (word.length >= 4 && Math.abs(word.length - token.length) <= 1) {
          if (getEditDistance(token, word) <= 1) return true;
        }
      }
      return false;
    };

    const queryTokens = activeSearchQuery ? activeSearchQuery.replace(/[,+.]/g, ' ').split(/\s+/).filter(Boolean) : [];

    filteredPapers = allPapers.map(p => {
      // â”€â”€ New schema field extraction â”€â”€
      const pCode      = (p.subjectCode  || '').toLowerCase();
      const pSubject   = (p.subjectName  || '').toLowerCase();
      const pBranch    = (p.branch       || '').toLowerCase();
      const pCourseType = (p.courseType  || '').toLowerCase();
      const pYear      = String(p.year   || '');
      const pMonth     = (p.month        || '').toLowerCase();
      const pDisplayCode = (p.displayCode || '').toLowerCase();

      // Branch filter: compare selected option text against the paper's branch string
      const selectedBranchText = (filterBranch?.options[filterBranch?.selectedIndex]?.textContent || '').toLowerCase().trim();
      const matchB   = !bId  || pBranch === selectedBranchText;
      const matchY   = !yr   || pYear === yr;
      const matchC   = !code || pCode.includes(code);
      const matchSub = !subj || pSubject.includes(subj);
      const matchDeg = !deg  || pCourseType.includes(deg);
      // University and semester are not present in the new schema "” always pass
      const matchU = true;
      const matchS = true;

      // Relevance Scoring for fuzzy search
      let searchScore = 0;
      if (queryTokens.length > 0) {
        let tokenMatches = 0;

        // Extract individual branches if comma-separated (e.g. "AI,AL") to support queries like "AL-305"
        const branchesList = (p.branch || '').split(',').map(b => b.trim()).filter(Boolean);
        const expandedCodes = branchesList.map(b => `${b}-${pCode}`);

        // Build a searchable index string using all new schema fields + permutation codes
        const searchIndex = [
          ...expandedCodes,
          pCode, pSubject, pBranch, pCourseType, pYear, pMonth, pDisplayCode,
          `year ${pYear}`, `${pYear}year`, `year${pYear}`
        ].join(' ').toLowerCase();

        queryTokens.forEach(tok => {
          const token = tok.toLowerCase();
          let matched = false;
          // Avoid matching short digits against substrings like "CS-403" or "2024"
          const isShortNum = token.length <= 2 && /^\d+$/.test(token);

          const exactCodeMatch = expandedCodes.some(c => c.toLowerCase() === token);
          const partialCodeMatch = expandedCodes.some(c => c.toLowerCase().includes(token));

          // Scores by field priority: subjectCode > subjectName > courseType > omni fallback
          if (pCode.toLowerCase() === token)                { searchScore += 10; matched = true; }
          else if (pDisplayCode.toLowerCase() === token || exactCodeMatch) { searchScore += 10; matched = true; }
          else if (!isShortNum && pCode.toLowerCase().includes(token))   { searchScore += 5;  matched = true; }
          else if (!isShortNum && (pDisplayCode.toLowerCase().includes(token) || partialCodeMatch)) { searchScore += 5; matched = true; }
          else if (pSubject.toLowerCase() === token)        { searchScore += 8;  matched = true; }
          else if (!isShortNum && pSubject.toLowerCase().includes(token)) { searchScore += 4;  matched = true; }
          else if (!isShortNum && pCourseType.toLowerCase().includes(token)) { searchScore += 3; matched = true; }
          // Fallback to omni-search (branch, year, month) with typo tolerance
          else if (fuzzyMatch(token, searchIndex))          { searchScore += 1;  matched = true; }

          if (matched) tokenMatches++;
        });

        // AND logic: all tokens must match
        if (tokenMatches !== queryTokens.length) return null;
      }

      // If it passes all dropdown filters
      if (matchU && matchB && matchS && matchY && matchC && matchSub && matchDeg) {
        return { ...p, searchScore };
      }
      return null;
    }).filter(Boolean); // Drop nulls

    // â”€â”€â”€ Update URL to allow sharing filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // Apply exact query string to all Advanced Search navigation links
    document.querySelectorAll('.advanced-search-link').forEach(link => {
      link.href = 'papers.html' + (paramString ? '?' + paramString : '');
    });

    window.history.replaceState({}, '', newUrl);

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
      title:  p => (p.subjectName  || '').toLowerCase(),
      branch: p => (p.branch       || '').toLowerCase(),
      code:   p => (p.subjectCode  || '').toLowerCase(),
      year:   p => parseInt(p.year) || 0,
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

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    return b?.name || p.branch || '"”';
  }
  function getUnivName(p) {
    const u = universities.find(x => x.id === p.universityId);
    return u?.name || p.university || 'RGPV';
  }

  function renderPaperCard(p) {
    const codeLabel    = escHtml(p.displayCode || p.subjectCode || p.code || 'N/A');
    const subjectLabel = escHtml(p.subjectName  || p.title || 'Question Paper');
    const courseLabel  = escHtml(p.courseType   || p.examType || '-');
    const branchLabel  = escHtml(p.branch       || p.branchId || '-');
    const examLabel    = `${p.month ? escHtml(p.month) + ' ' : ''}${p.year || '-'}`;
    
    // Always use getPaperUrl — liveUrl in JSON points to root (/) but files live under /paper/
    const paperUrl = window.getPaperUrl(p.paperId || p.id);
    return `
    <article class="paper-card" role="article">
      <div class="paper-card-top">
        <div class="paper-card-code">&#128196; ${codeLabel}</div>
        <h3 class="paper-card-title">${subjectLabel}</h3>
      </div>
      <div class="paper-card-body">
        <div class="paper-meta-grid">
          <div class="paper-meta-item">
            <label>Course</label>
            <span>${courseLabel}</span>
          </div>
          <div class="paper-meta-item">
            <label>Branch</label>
            <span>${branchLabel}</span>
          </div>
          <div class="paper-meta-item">
            <label>Exam</label>
            <span>${examLabel}</span>
          </div>
        </div>
      </div>
      <div class="paper-card-footer">
        <span class="badge badge-purple">${subjectLabel}</span>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button onclick="sharePaper('${escHtml(p.subjectName || 'Paper')}', '${paperUrl}')" class="btn-share" aria-label="Share paper">
            ${SHARE_ICON}<span class="share-label">Share</span>
          </button>
          <a href="${paperUrl}" class="btn btn-primary" target="_blank" style="text-decoration: none; padding: 6px 14px; border-radius: 8px;" aria-label="View ${escHtml(p.subjectName || 'paper')}">
            &#128073; View Paper
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
    html += `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous"><</button>`;
    for (let i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - currentPage) <= 1) {
        html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
      } else if (Math.abs(i - currentPage) === 2) {
        html += `<span style="padding:0 4px;color:var(--text-muted)">...</span>`;
      }
    }
    html += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === pages ? 'disabled' : ''} aria-label="Next">></button>`;
    paginationEl.innerHTML = html;
  }

  window.changePage = (p) => {
    const pages = Math.ceil(filteredPapers.length / PAGE_SIZE);
    if (p < 1 || p > pages) return;
    currentPage = p;
    renderResults();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // â”€â”€â”€ Active Filters UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function renderActiveFilters() {
    if (!activeFiltersWrap) return;
    const entries = Object.entries(activeFilters);
    if (!entries.length) { activeFiltersWrap.innerHTML = ''; return; }
    activeFiltersWrap.innerHTML = entries.map(([key, val]) =>
      `<span class="active-filter-pill">${escHtml(val)}<button onclick="clearFilter('${key}')" aria-label="Remove ${key} filter">x</button></span>`
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

  // â”€â”€â”€ PDF Viewer removed: cards now navigate directly via liveUrl â”€â”€â”€

  window.openPaperViewer = (id, title, url, type) => {
    // Legacy stub "” redirect to the static paper page instead
    if (url) window.open(url, '_blank');
  };


  // â”€â”€â”€ Sort Controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ View Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  document.querySelectorAll('.view-btn-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn-toggle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      viewMode = btn.dataset.view;
      renderResults();
    });
  });

  // â”€â”€â”€ Search/Filter Events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Cascading Filter Events: Degree â†’ University â†’ Branch â”€â”€â”€
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

  // â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Populate Year Dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function populateYears() {
    if (!filterYear) return;
    const current = new Date().getFullYear();
    for (let y = current; y >= current - 4; y--) {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      filterYear.appendChild(opt);
    }
  }

  // â”€â”€â”€ Init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async function init() {
    populateYears();
    await loadDegrees();
    await loadUniversities();
    await loadBranches();
    await loadPapers();
  }

  if (document.getElementById('papersContainer')) init();

  // â”€â”€â”€ Homepage featured papers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const featuredContainer = document.getElementById('featuredPapers');
  if (featuredContainer) {
    (async () => {
      try {
        const data = await getStaticData();
        const papers = (data.papers || []).slice(0, 6);
        if (!papers.length) { featuredContainer.innerHTML = '<p style="text-align:center;color:var(--text-muted)">No papers yet.</p>'; return; }
        featuredContainer.className = 'card-grid grid-3';
        featuredContainer.innerHTML = papers.map(p => {
          const paperUrl = window.getPaperUrl(p.paperId || p.id);
          return `
          <article class="paper-card">
            <div class="paper-card-top">
              <div class="paper-card-code">&#128196; ${escHtml(p.displayCode || p.subjectCode || 'N/A')}</div>
              <h3 class="paper-card-title">${escHtml(p.subjectName || 'Question Paper')}</h3>
            </div>
            <div class="paper-card-body">
              <div class="paper-meta-grid">
                <div class="paper-meta-item"><label>Course</label><span>${escHtml(p.courseType || '-')}</span></div>
                <div class="paper-meta-item"><label>Branch</label><span>${escHtml(p.branch || '-')}</span></div>
                <div class="paper-meta-item"><label>Exam</label><span>${escHtml(p.month || '')} ${p.year || '-'}</span></div>
              </div>
            </div>
            <div class="paper-card-footer">
              <span class="badge badge-purple">${escHtml(p.subjectName || '-')}</span>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button onclick="sharePaper('${escHtml(p.subjectName || 'Paper')}', '${paperUrl}')" class="btn-share" aria-label="Share paper">
                  ${SHARE_ICON}<span class="share-label">Share</span>
                </button>
                <a href="${paperUrl}" class="btn btn-primary" target="_blank" style="text-decoration: none; padding: 6px 14px; border-radius: 8px;" aria-label="View ${escHtml(p.subjectName || 'paper')}">
                  &#128073; View Paper
                </a>
              </div>
            </div>
          </article>`;
        }).join('');
      } catch (e) { console.error(e); }
    })();
  }

  // â”€â”€â”€ Homepage Stats counters from Firebase â”€â”€
  const statsEl = document.getElementById('liveStats');
  if (statsEl) {
    (async () => {
      try {
        const data = await getStaticData();
        const papersNum = document.querySelector('[data-counter="papers"]');
        const univNum = document.querySelector('[data-counter="universities"]');
        const branchNum = document.querySelector('[data-counter="branches"]');
        if (papersNum) papersNum.setAttribute('data-counter', (data.papers || []).length);
        if (univNum) univNum.setAttribute('data-counter', (data.universities || []).length);
        if (branchNum) branchNum.setAttribute('data-counter', (data.branches || []).length);
      } catch (e) { console.error(e); }
    })();
  }

})();
