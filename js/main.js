// =========================================
// Main JS — Navbar, Scroll, Shared Utils
// =========================================

document.addEventListener('DOMContentLoaded', () => {

  /* ─── Navbar Scroll ──────────────────── */
  const navbar = document.getElementById('navbar');
  const scrollTopBtn = document.getElementById('scrollTop');

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (navbar) navbar.classList.toggle('scrolled', y > 40);
    if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', y > 300);
  }, { passive: true });

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* ─── Mobile Menu ────────────────────── */
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', open);
      hamburger.querySelectorAll('span').forEach((s, i) => {
        if (open) {
          if (i === 0) s.style.transform = 'translateY(7px) rotate(45deg)';
          if (i === 1) s.style.opacity = '0';
          if (i === 2) s.style.transform = 'translateY(-7px) rotate(-45deg)';
        } else {
          s.style.transform = ''; s.style.opacity = '';
        }
      });
    });
    // Close on outside click
    document.addEventListener('click', e => {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('open');
        hamburger.querySelectorAll('span').forEach(s => { s.style.transform = ''; s.style.opacity = ''; });
      }
    });
  }

  /* ─── Active Nav Links ───────────────── */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ─── Animate on Scroll (AOS-lite) ──── */
  const animateEls = document.querySelectorAll('[data-animate]');
  if (animateEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    animateEls.forEach(el => observer.observe(el));
  }

  /* ─── Counter Animations ─────────────── */
  const counters = document.querySelectorAll('[data-counter]');
  if (counters.length) {
    const cObs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          cObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(c => cObs.observe(c));
  }

  function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-counter'));
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 1800;
    const start = performance.now();
    const update = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  /* ─── Toast Utility ──────────────────── */
  window.showToast = (message, type = '') => {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: '✅', error: '❌', '': 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
  };

  /* ─── Modal Utility ──────────────────── */
  window.openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
  };
  window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) { modal.classList.remove('active'); document.body.style.overflow = ''; }
  };
  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => closeModal(m.id));
    }
  });

  /* ─── Lazy Image Loading ─────────────── */
  if ('loading' in HTMLImageElement.prototype) {
    document.querySelectorAll('img[loading="lazy"]').forEach(img => {
      if (img.dataset.src) img.src = img.dataset.src;
    });
  }

  /* ─── Year in Footer ─────────────────── */
  const yearEl = document.getElementById('currentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ─── Global Share Utility ───────────── */
  window.sharePaper = async (title, relativeUrl) => {
    // Construct full URL (handles both relative and full paths)
    const url = relativeUrl.startsWith('http') 
      ? relativeUrl 
      : `${window.location.origin}/${relativeUrl.replace(/^\//, '')}`;
    
    const shareData = {
      title: title || 'RGPV Question Paper',
      text: `Check out this ${title || 'question paper'} on RGPV Papers!`,
      url: url
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share not supported');
      }
    } catch (err) {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        if (window.showToast) window.showToast('Link copied to clipboard!', 'success');
      } catch (clipErr) {
        console.error('Clipboard error:', clipErr);
        if (window.showToast) window.showToast('Failed to copy link.', 'error');
      }
    }
  };

  /* ─── Global AdSense Lazy Loader ─────── */
  // Load AdSense after page load to prevent LCP blocking but ensure ads show on all pages.
  let adsenseLoaded = false;
  function loadAdSense() {
    if (adsenseLoaded) return;
    adsenseLoaded = true;
    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7137088600747138';
    script.async = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }

  // Load AdSense early on interaction, or fallback to timer
  ['scroll', 'mousemove', 'touchstart', 'click'].forEach(evt => 
    window.addEventListener(evt, loadAdSense, { once: true, passive: true })
  );
  // Fallback: If no interaction within 3 seconds, load it anyway so impressions aren't lost
  setTimeout(loadAdSense, 3000);

});
