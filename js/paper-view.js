// paper-view.js - Standalone viewer for a single paper
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const paperId = urlParams.get('id');
  
  const loadingState = document.getElementById('loadingState');
  const errorState = document.getElementById('errorState');
  const paperContent = document.getElementById('paperContent');
  
  if (!paperId) {
    showError();
    return;
  }
  
  try {
    const db = window.RGPV?.db;
    if (!db) throw new Error("Firebase DB not initialized");
    
    // Fetch individual paper
    const doc = await db.collection('papers').doc(paperId).get();
    
    if (!doc.exists) {
      showError();
      return;
    }
    
    const p = { id: doc.id, ...doc.data() };
    
    // Attempt to fetch University, Branch, Subject names by ID (if they exist)
    // We do this concurrently to make it fast
    let uniName = p.university || '—';
    let branchName = p.branch || '—';
    let subjectName = p.subject || '—';
    
    const promises = [];
    if (p.universityId) promises.push(db.collection('universities').doc(p.universityId).get().then(d => { if(d.exists) uniName = d.data().name; }));
    if (p.branchId) promises.push(db.collection('branches').doc(p.branchId).get().then(d => { if(d.exists) branchName = d.data().name; }));
    if (p.subjectId) promises.push(db.collection('subjects').doc(p.subjectId).get().then(d => { if(d.exists) subjectName = d.data().name; }));
    
    await Promise.all(promises);
    
    // Populate UI
    const titleText = p.title || subjectName || 'Question Paper';
    document.getElementById('pTitle').textContent = titleText;
    document.getElementById('pCode').textContent = p.code || 'No Code';
    document.getElementById('pSem').textContent = `Semester ${p.semester || '—'}`;
    document.getElementById('pYear').textContent = p.year || '—';
    
    document.getElementById('pSubject').textContent = subjectName;
    document.getElementById('pUni').textContent = uniName;
    document.getElementById('pBranch').textContent = branchName;
    
    const dateStr = p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric'}) : '—';
    document.getElementById('pDate').textContent = dateStr;
    
    // Update Meta Tags dynamically so if someone shares this exact URL, social cards unfurl properly
    document.title = `${titleText} (${p.year}) - RGPV Papers`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    const descriptionText = `Download or view the ${p.year} ${titleText} (${p.code || ''}) question paper for ${branchName}, Semester ${p.semester}. Free RGPV previous year paper.`;
    metaDesc.content = descriptionText;
    
    // Update Open Graph tags
    updateMeta('property', 'og:title', document.title);
    updateMeta('property', 'og:description', descriptionText);
    updateMeta('property', 'og:url', window.location.href);
    
    // Load PDF
    const frame = document.getElementById('viewerFrame');
    if (p.fileUrl) {
      // Adding #toolbar=0 prevents easy downloading in most embedded PDF viewers
      frame.src = p.fileUrl + '#toolbar=0&navpanes=0';
      
      // Hide loader once iframe loads
      frame.onload = () => {
        const loader = document.querySelector('.viewer-loader');
        if (loader) loader.style.display = 'none';
      };
    } else {
      frame.parentElement.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">PDF file is missing for this paper.</div>';
    }
    
    // Swap screens
    loadingState.style.display = 'none';
    paperContent.style.display = 'block';
    
  } catch (err) {
    console.error("Error loading paper:", err);
    showError();
  }
  
  function showError() {
    loadingState.style.display = 'none';
    errorState.style.display = 'block';
  }
  
  function updateMeta(attrName, attrValue, content) {
    let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.content = content;
  }
});
