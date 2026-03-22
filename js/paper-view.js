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
    
    // Setup Full Screen Viewer
    const openBtn = document.getElementById('openViewerBtn');
    if (p.fileUrl && openBtn) {
      openBtn.addEventListener('click', () => {
        const viewerModal = document.getElementById('viewerModal');
        const loader = viewerModal.querySelector('.viewer-loader');
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
          
          if (loader) loader.style.display = 'flex';
          pdfContainer.style.display = 'none';
          [pagination, prevPageBtn, nextPageBtn, zoomInBtn, zoomOutBtn].forEach(el => el && (el.style.display = 'none'));
          
          let pdfDoc = null;
          let pageNum = 1;
          let currentScale = 1.2; // Default render scale
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
          
          // Actually setting width is better for layout, but transform is faster 
          // We will use CSS width so scrolling natively works.
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
          }, {passive: false});

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
             // For 1 finger, do nothing so the browser can natively scroll!
          }, {passive: false});
          
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
            pdfDoc.getPage(num).then((page) => {
              const viewport = page.getViewport({ scale: currentScale });
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
                if (nextPageBtn) nextPageBtn.disabled = num >= pdfDoc.numPages;
                
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
            if (pageNum <= 1) return;
            pageNum--;
            resetTransform();
            queueRenderPage(pageNum);
          };

          const onNextPage = () => {
            if (pageNum >= pdfDoc.numPages) return;
            pageNum++;
            resetTransform();
            queueRenderPage(pageNum);
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
                
                const loadingTask = window.pdfjsLib.getDocument(p.fileUrl);
                pdfDoc = await loadingTask.promise;
                
                if (pageCountSpan) pageCountSpan.textContent = pdfDoc.numPages;
                
                // Render first page
                renderPage(pageNum);
                
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
          
          // Close button logic - Return to the paper details view
          const closeBtn = document.getElementById('closeViewer');
          if (closeBtn) {
            closeBtn.onclick = () => {
              // Clean up memory
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              pdfDoc = null;
              
              viewerModal.classList.remove('active');
              document.body.style.overflow = '';
            };
          }
        }
      });
    } else if (openBtn) {
      openBtn.disabled = true;
      openBtn.textContent = 'PDF Not Available';
      openBtn.style.opacity = '0.7';
    }
    
    // Wire up Share Button
    const shareBtn = document.getElementById('sharePaperBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (window.sharePaper) {
          window.sharePaper(titleText, window.location.href);
        }
      });
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
