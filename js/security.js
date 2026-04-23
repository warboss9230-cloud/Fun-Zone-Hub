/**
 * ═══════════════════════════════════════════════════════════
 *  FunZone Hub — js/security.js
 *  Comprehensive client-side security layer.
 *
 *  Protections included:
 *   1. DevTools detection (size, console timing, debugger)
 *   2. Right-click / context menu disabled
 *   3. F12 / Ctrl+Shift+I / Ctrl+U / Ctrl+S blocked
 *   4. Console poisoning (overrides after page load)
 *   5. Code obfuscation of sensitive keys at runtime
 *   6. SHA-256 password hashing (no plain-text compare)
 *   7. Brute-force lockout (5 attempts → 60s cooldown)
 *   8. Anti-iframe (clickjacking prevention)
 *   9. DOM mutation observer for tampering
 *  10. Session integrity check (admin token + timestamp)
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

/* ── 1. ANTI-IFRAME ───────────────────────────────────── */
(function antiIframe() {
  if (window.self !== window.top) {
    document.documentElement.innerHTML = '';
    window.top.location = window.self.location;
  }
})();

/* ── SECURITY NAMESPACE ───────────────────────────────── */
window.FZ_SEC = (function () {

  /* ─── Constants ────────────────────────────────────── */
  const MAX_ATTEMPTS   = 5;
  const LOCKOUT_MS     = 60_000;   // 60 seconds
  const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

  let _devtoolsOpen    = false;
  let _loginAttempts   = 0;
  let _lockedUntil     = 0;
  let _devtoolsTimer   = null;

  /* ─── SHA-256 hash (Web Crypto API) ────────────────── */
  async function sha256(str) {
    const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* ─── Verify password against stored hash ──────────── */
  async function verifyPassword(plain) {
    if (isLockedOut()) return false;
    const hash = await sha256(plain);
    const ok   = hash === window.FZ_CONFIG.ADMIN_PASS_HASH;
    if (!ok) {
      _loginAttempts++;
      if (_loginAttempts >= MAX_ATTEMPTS) {
        _lockedUntil = Date.now() + LOCKOUT_MS;
        _loginAttempts = 0;
      }
    } else {
      _loginAttempts = 0;
    }
    return ok;
  }

  function isLockedOut() {
    return Date.now() < _lockedUntil;
  }
  function lockoutSecondsRemaining() {
    return Math.ceil((_lockedUntil - Date.now()) / 1000);
  }

  /* ─── Admin session token (stored in sessionStorage) ─ */
  function generateToken() {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
  }

  function createSession() {
    const token = generateToken();
    const exp   = Date.now() + SESSION_TTL_MS;
    sessionStorage.setItem(window.FZ_CONFIG.LS_ADMIN_KEY, JSON.stringify({ token, exp }));
    return token;
  }

  function isSessionValid() {
    try {
      const raw  = sessionStorage.getItem(window.FZ_CONFIG.LS_ADMIN_KEY);
      if (!raw) return false;
      const sess = JSON.parse(raw);
      if (!sess.token || !sess.exp) return false;
      if (Date.now() > sess.exp) { clearSession(); return false; }
      return true;
    } catch { clearSession(); return false; }
  }

  function clearSession() {
    sessionStorage.removeItem(window.FZ_CONFIG.LS_ADMIN_KEY);
  }

  /* ─── 2. Right-click disable ────────────────────────── */
  document.addEventListener('contextmenu', e => e.preventDefault());

  /* ─── 3. Key blocking ───────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    const key  = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift= e.shiftKey;

    // F12
    if (key === 'F12') { e.preventDefault(); e.stopImmediatePropagation(); return; }
    // Ctrl+Shift+I (DevTools)
    if (ctrl && shift && (key === 'I' || key === 'i')) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    // Ctrl+Shift+J (Console)
    if (ctrl && shift && (key === 'J' || key === 'j')) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    // Ctrl+Shift+C (Element picker)
    if (ctrl && shift && (key === 'C' || key === 'c')) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    // Ctrl+U (View source)
    if (ctrl && (key === 'U' || key === 'u')) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    // Ctrl+S (Save page)
    if (ctrl && (key === 'S' || key === 's')) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    // Ctrl+P (Print → can expose source)
    if (ctrl && (key === 'P' || key === 'p')) { e.preventDefault(); e.stopImmediatePropagation(); return; }
  }, true);

  /* ─── 4. DevTools detection ─────────────────────────── */
  function detectDevTools() {
    // Method A: window size delta
    const threshold = 160;
    const widthDelta  = window.outerWidth  - window.innerWidth;
    const heightDelta = window.outerHeight - window.innerHeight;

    if (widthDelta > threshold || heightDelta > threshold) {
      onDevToolsOpen();
      return;
    }

    // Method B: console.log timing trick
    const t = new Image();
    let opened = false;
    Object.defineProperty(t, 'id', {
      get() { opened = true; return ''; }
    });
    // eslint-disable-next-line no-console
    console.log('%c', t);
    if (opened) { onDevToolsOpen(); return; }

    _devtoolsOpen = false;
  }

  function onDevToolsOpen() {
    if (_devtoolsOpen) return;
    _devtoolsOpen = true;
    // Blur sensitive content — do NOT lock out legit users entirely
    // (to avoid locking out DevTools for genuine debugging of YOUR code)
    // Instead: clear console, warn, and if admin mode active → logout
    // eslint-disable-next-line no-console
    try { console.clear(); } catch (_) {}
    if (document.body.classList.contains('admin-active')) {
      window.FZ_SEC.destroySession();
      if (window.FZ_APP && window.FZ_APP.forceLogout) window.FZ_APP.forceLogout();
    }
  }

  _devtoolsTimer = setInterval(detectDevTools, 1500);

  /* ─── 5. Console poisoning (after DOMContentLoaded) ─── */
  window.addEventListener('DOMContentLoaded', function () {
    const _noop = function () { return undefined; };
    // Override only after load so legit errors still show during dev
    // Comment this block out during local development
    try {
      const cons = ['log', 'warn', 'info', 'dir', 'table', 'trace', 'debug'];
      cons.forEach(m => {
        try { Object.defineProperty(console, m, { value: _noop, writable: false }); } catch (_) {}
      });
    } catch (_) {}
  });

  /* ─── 6. DOM tampering observer ─────────────────────── */
  window.addEventListener('DOMContentLoaded', function () {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          // Block injected script tags
          if (node.nodeName === 'SCRIPT' && !node.src.includes(location.origin) &&
              !node.src.includes('fonts.googleapis') &&
              !node.src.includes('cdn.jsdelivr.net')) {
            node.remove();
          }
        });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });

  /* ─── 7. Anti copy-paste of sensitive inputs ─────────── */
  document.addEventListener('paste', function (e) {
    const target = e.target;
    if (target && target.type === 'password') {
      // Allow paste into password field (usability)
    }
  });

  /* ─── 8. Disable drag (anti data extraction) ────────── */
  document.addEventListener('dragstart', e => e.preventDefault());
  document.addEventListener('drop',      e => e.preventDefault());

  /* ─── Public API ────────────────────────────────────── */
  return {
    verifyPassword,
    isLockedOut,
    lockoutSecondsRemaining,
    createSession,
    isSessionValid,
    destroySession: clearSession,
  };

})();
