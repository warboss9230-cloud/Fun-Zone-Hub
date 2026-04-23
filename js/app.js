/**
 * ═══════════════════════════════════════════════════════════
 *  FunZone Hub — js/app.js
 *  Main application bootstrap.
 *  Handles: init, 7-tap logo, filter tabs, toast, scroll.
 *  Exposes window.FZ_APP namespace.
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

window.FZ_APP = (function () {

  const CFG = window.FZ_CONFIG;

  /* ══════════════════════════════════════════════════
     TOAST
  ══════════════════════════════════════════════════ */
  let _toastTimer = null;

  function toast(msg, type) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'toast show' + (type ? ' ' + type : '');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  /* ══════════════════════════════════════════════════
     7-TAP LOGO SECRET
  ══════════════════════════════════════════════════ */
  let _tapCount = 0;
  let _tapTimer = null;

  function setupLogoTap() {
    const logo = document.getElementById('logoTapZone');
    const hint = document.getElementById('tapHint');
    if (!logo) return;

    function handleTap() {
      _tapCount++;

      // Visual flash
      logo.style.opacity = '.6';
      setTimeout(() => { logo.style.opacity = '1'; }, 120);

      const remaining = CFG.LOGO_TAP_REQUIRED - _tapCount;

      if (_tapTimer) clearTimeout(_tapTimer);

      if (remaining > 0) {
        hint.textContent = `${remaining} more tap${remaining > 1 ? 's' : ''}…`;
        _tapTimer = setTimeout(() => {
          _tapCount = 0;
          hint.textContent = '';
        }, CFG.TAP_WINDOW_MS);
      } else {
        // Reached!
        _tapCount = 0;
        hint.textContent = '';
        if (_tapTimer) clearTimeout(_tapTimer);

        if (FZ_ADMIN.isAdminActive()) {
          FZ_ADMIN.openAdminPanel();
        } else {
          FZ_ADMIN.openPwModal();
        }
      }
    }

    // Support both click (desktop) and touchend (mobile)
    logo.addEventListener('click', handleTap);
    logo.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTap(); }
    });
  }

  /* ══════════════════════════════════════════════════
     FILTER TABS
  ══════════════════════════════════════════════════ */
  function setupFilterTabs() {
    document.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', function () {
        FZ_RENDER.showFilter(this.dataset.cat);
      });
    });

    // Also wire nav links
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.addEventListener('click', function () {
        const f = this.dataset.filter;
        if (!f) return;
        document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        FZ_RENDER.showFilter(f);
      });
    });
  }

  /* ══════════════════════════════════════════════════
     SCROLL — navbar shadow
  ══════════════════════════════════════════════════ */
  function setupScroll() {
    const nav = document.querySelector('.navbar');
    if (!nav) return;
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  /* ══════════════════════════════════════════════════
     SESSION RECOVERY
  ══════════════════════════════════════════════════ */
  function recoverSession() {
    if (FZ_SEC.isSessionValid()) {
      FZ_ADMIN.activateAdmin();
    }
  }

  /* ══════════════════════════════════════════════════
     FORCE LOGOUT (called by security.js on devtools)
  ══════════════════════════════════════════════════ */
  function forceLogout() {
    FZ_ADMIN.deactivateAdmin();
    toast('⚠️ Security event detected. Admin session ended.', 'err');
  }

  /* ══════════════════════════════════════════════════
     VISITOR COUNTER
  ══════════════════════════════════════════════════ */
  function trackVisitor() {
    const key = 'fz_visitor_count';
    const count = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, count);
  }

  function getVisitorCount() {
    return parseInt(localStorage.getItem('fz_visitor_count') || '0', 10);
  }

  /* ══════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    // Track this visit
    trackVisitor();
    FZ_RENDER.showFilter('all');
    FZ_RENDER.refreshAll();

    // Initialize Supabase
    FZ_DB.init();

    // Setup UI interactions
    setupLogoTap();
    setupFilterTabs();
    setupScroll();
    FZ_ADMIN.setupListeners();

    // Recover admin session if valid
    recoverSession();

    // Prevent accidental page unload while in admin mode
    window.addEventListener('beforeunload', function (e) {
      if (FZ_ADMIN.isAdminActive()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  });

  /* ── Public API ───────────────────────────────────────── */
  return {
    toast,
    forceLogout,
    getVisitorCount,
  };

})();
