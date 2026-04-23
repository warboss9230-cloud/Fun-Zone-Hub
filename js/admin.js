/**
 * ═══════════════════════════════════════════════════════════
 *  FunZone Hub — js/admin.js
 *  Admin panel: password login, add/delete/sync, table render.
 *  Exposes window.FZ_ADMIN namespace.
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

window.FZ_ADMIN = (function () {

  const CFG = window.FZ_CONFIG;
  let _admFilter = 'all';

  /* ══════════════════════════════════════════════════
     PASSWORD MODAL
  ══════════════════════════════════════════════════ */
  function openPwModal() {
    if (FZ_SEC.isLockedOut()) {
      FZ_APP.toast(`🔒 Too many attempts. Wait ${FZ_SEC.lockoutSecondsRemaining()}s.`, 'err');
      return;
    }
    const backdrop = document.getElementById('pwBackdrop');
    const input    = document.getElementById('pwInput');
    if (!backdrop) return;

    input.value = '';
    document.getElementById('pwError').textContent = '';
    renderPwDots('');
    backdrop.hidden = false;
    requestAnimationFrame(() => input.focus());
  }

  function closePwModal() {
    const backdrop = document.getElementById('pwBackdrop');
    if (backdrop) backdrop.hidden = true;
    document.getElementById('pwInput').value = '';
    document.getElementById('pwError').textContent = '';
    renderPwDots('');
  }

  function renderPwDots(val) {
    const container = document.getElementById('pwDots');
    if (!container) return;
    const len = Math.min(val.length, 14);
    container.innerHTML = Array.from({ length: 14 }, (_, i) =>
      `<div class="pw-dot${i < len ? ' on' : ''}"></div>`
    ).join('');
  }

  async function submitPassword() {
    if (FZ_SEC.isLockedOut()) {
      document.getElementById('pwError').textContent =
        `Locked. Try again in ${FZ_SEC.lockoutSecondsRemaining()}s.`;
      return;
    }

    const input = document.getElementById('pwInput');
    const val   = input.value;

    const ok = await FZ_SEC.verifyPassword(val);
    if (ok) {
      FZ_SEC.createSession();
      closePwModal();
      activateAdmin();
    } else {
      input.value = '';
      renderPwDots('');
      const errEl = document.getElementById('pwError');
      if (FZ_SEC.isLockedOut()) {
        errEl.textContent = `❌ Too many attempts! Locked for ${FZ_SEC.lockoutSecondsRemaining()}s.`;
      } else {
        errEl.textContent = '❌ Galat password! Phir try karo.';
      }
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 400);
    }
  }

  /* ══════════════════════════════════════════════════
     ADMIN MODE
  ══════════════════════════════════════════════════ */
  function activateAdmin() {
    document.body.classList.add('admin-active');
    document.getElementById('adminBanner').hidden = false;
    FZ_RENDER.refreshAll();
    FZ_APP.toast('🛡️ Admin mode active! Welcome Harendra.', 'ok');
  }

  function deactivateAdmin() {
    document.body.classList.remove('admin-active');
    document.getElementById('adminBanner').hidden = true;
    FZ_SEC.destroySession();
    closeAdminPanel();
    FZ_RENDER.refreshAll();
    FZ_APP.toast('👋 Admin mode se logout ho gaye.', '');
  }

  function isAdminActive() {
    return document.body.classList.contains('admin-active') && FZ_SEC.isSessionValid();
  }

  /* ══════════════════════════════════════════════════
     ADMIN PANEL MODAL
  ══════════════════════════════════════════════════ */
  function openAdminPanel() {
    if (!isAdminActive()) { openPwModal(); return; }
    updateAdmStats();
    renderAdmTable(_admFilter);
    updateAdmSbStatus();
    document.getElementById('adminBackdrop').hidden = false;
  }

  function closeAdminPanel() {
    document.getElementById('adminBackdrop').hidden = true;
  }

  function updateAdmStats() {
    ['games','quiz','comics','stories'].forEach(cat => {
      const el = document.getElementById('adm' + cap(cat));
      if (el) el.textContent = FZ_DB.getCategory(cat).length;
    });
    const visEl = document.getElementById('admVisitors');
    if (visEl) visEl.textContent = FZ_APP.getVisitorCount();
  }

  function updateAdmSbStatus() {
    const dot = document.getElementById('admSbDot');
    const lbl = document.getElementById('admSbLabel');
    if (!dot || !lbl) return;
    const c = FZ_DB.isConnected();
    dot.className = 'sb-dot sm' + (c ? ' ok' : ' err');
    lbl.textContent = c ? 'Connected' : 'Local Only';
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ── Admin Table ──────────────────────────────────────── */
  function renderAdmTable(filter) {
    _admFilter = filter;
    const tbody = document.getElementById('admTableBody');
    if (!tbody) return;

    const cats = filter === 'all' ? CFG.CATEGORIES : [filter];
    let rows = '';

    cats.forEach(cat => {
      FZ_DB.getCategory(cat).forEach(s => {
        rows += `
          <tr>
            <td class="tbl-emoji" aria-label="icon">${FZ_RENDER.esc(s.emoji || '🌐')}</td>
            <td class="tbl-name">${FZ_RENDER.esc(s.name)}</td>
            <td class="tbl-url">
              <a href="${FZ_RENDER.esc(s.url)}" target="_blank" rel="noopener noreferrer"
                 title="${FZ_RENDER.esc(s.url)}">
                ${FZ_RENDER.esc(s.url.replace(/https?:\/\//, '').slice(0, 32))}
              </a>
            </td>
            <td><span class="tbl-cat-badge badge-${cat}">${cat}</span></td>
            <td>
              <button class="tbl-del-btn"
                      data-delcat="${FZ_RENDER.esc(cat)}"
                      data-delid="${FZ_RENDER.esc(s.id)}"
                      aria-label="Delete ${FZ_RENDER.esc(s.name)}">
                🗑️ Delete
              </button>
            </td>
          </tr>`;
      });
    });

    if (!rows) {
      rows = `<tr><td colspan="5" class="adm-empty">Koi website nahi hai.</td></tr>`;
    }

    tbody.innerHTML = rows;

    // Attach delete button listeners
    tbody.querySelectorAll('.tbl-del-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const c  = this.dataset.delcat;
        const id = this.dataset.delid;
        adminDelete(c, id);
      });
    });
  }

  /* ── Admin filter tabs ────────────────────────────────── */
  function setupAdmTabs() {
    document.querySelectorAll('.adm-tab').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.adm-tab').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        renderAdmTable(this.dataset.admcat);
      });
    });
  }

  /* ══════════════════════════════════════════════════
     ADD SITE
  ══════════════════════════════════════════════════ */
  function adminAddSite() {
    if (!isAdminActive()) { FZ_APP.toast('⚠️ Admin login karo pehle.', 'err'); return; }

    const cat    = document.getElementById('admCat').value.trim();
    const name   = document.getElementById('admName').value.trim();
    const url    = document.getElementById('admUrl').value.trim();
    const desc   = document.getElementById('admDesc').value.trim();
    const emoji  = document.getElementById('admEmoji').value.trim() || '🌐';
    const visits = document.getElementById('admVisits').value.trim() || 'New';
    const rating = document.getElementById('admRating').value.trim() || '—';

    // Validation
    if (!name)   { FZ_APP.toast('❌ Website ka naam zaroor bharo!', 'err'); return; }
    if (!url)    { FZ_APP.toast('❌ URL zaroor bharo!', 'err'); return; }
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('bad protocol');
    } catch (_) {
      FZ_APP.toast('❌ Sahi URL bharo (https://...)', 'err'); return;
    }
    if (name.length > 80)   { FZ_APP.toast('❌ Naam 80 characters se chota rakho.', 'err'); return; }
    if (url.length > 500)   { FZ_APP.toast('❌ URL 500 characters se chota rakho.', 'err'); return; }
    if (desc.length > 300)  { FZ_APP.toast('❌ Description 300 characters se choti rakho.', 'err'); return; }

    const added = FZ_DB.addSite(cat, { name, url, desc, emoji, visits, rating });
    if (added) {
      FZ_RENDER.refreshAll();
      renderAdmTable(_admFilter);
      updateAdmStats();
      clearAdmForm();
      FZ_APP.toast(`✅ "${name}" add ho gaya!`, 'ok');
    }
  }

  function clearAdmForm() {
    ['admName','admUrl','admDesc','admEmoji','admVisits','admRating'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  }

  /* ══════════════════════════════════════════════════
     DELETE SITE
  ══════════════════════════════════════════════════ */
  function adminDelete(cat, id) {
    if (!isAdminActive()) return;
    const sites = FZ_DB.getCategory(cat);
    const site  = sites.find(s => s.id === id);
    const name  = site ? site.name : 'Website';
    if (!confirm(`"${name}" delete karna chahte ho?`)) return;

    FZ_DB.deleteSite(cat, id);
    FZ_RENDER.refreshAll();
    renderAdmTable(_admFilter);
    updateAdmStats();
    FZ_APP.toast(`🗑️ "${name}" delete ho gaya.`, '');
  }

  // Quick delete from card button
  function quickDelete(cat, id) {
    adminDelete(cat, id);
  }

  /* ── Clear all ────────────────────────────────────────── */
  function clearAll() {
    if (!isAdminActive()) return;
    if (!confirm('⚠️ SARI websites delete karna chahte ho? Yeh wapis nahi aayegi!')) return;
    FZ_DB.clearAll();
    FZ_RENDER.refreshAll();
    renderAdmTable(_admFilter);
    updateAdmStats();
    FZ_APP.toast('🗑️ Sab clear ho gaya.', 'err');
  }

  /* ── Sync to Supabase ─────────────────────────────────── */
  async function syncSupabase() {
    if (!isAdminActive()) return;
    FZ_APP.toast('☁️ Syncing to Supabase…', '');
    const result = await FZ_DB.syncToSupabase();
    FZ_APP.toast(result.msg, result.ok ? 'ok' : 'err');
  }

  /* ══════════════════════════════════════════════════
     SETUP LISTENERS
  ══════════════════════════════════════════════════ */
  function setupListeners() {
    // Password modal
    document.getElementById('pwSubmitBtn')?.addEventListener('click', submitPassword);
    document.getElementById('pwCancelBtn')?.addEventListener('click', closePwModal);
    document.getElementById('pwClose')?.addEventListener('click', closePwModal);
    document.getElementById('pwInput')?.addEventListener('input', function () {
      renderPwDots(this.value);
      document.getElementById('pwError').textContent = '';
    });
    document.getElementById('pwInput')?.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitPassword();
    });

    // Password backdrop click
    document.getElementById('pwBackdrop')?.addEventListener('click', function (e) {
      if (e.target === this) closePwModal();
    });

    // Admin banner
    document.getElementById('openAdminBtn')?.addEventListener('click', openAdminPanel);
    document.getElementById('logoutBtn')?.addEventListener('click', deactivateAdmin);

    // Admin panel
    document.getElementById('adminClose')?.addEventListener('click', closeAdminPanel);
    document.getElementById('adminCloseBtn')?.addEventListener('click', closeAdminPanel);
    document.getElementById('adminBackdrop')?.addEventListener('click', function (e) {
      if (e.target === this) closeAdminPanel();
    });

    // Admin form buttons
    document.getElementById('admAddBtn')?.addEventListener('click', adminAddSite);
    document.getElementById('admSyncBtn')?.addEventListener('click', syncSupabase);
    document.getElementById('admClearBtn')?.addEventListener('click', clearAll);

    // Admin tabs
    setupAdmTabs();

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closePwModal();
        closeAdminPanel();
      }
    });
  }

  /* ── Public API ───────────────────────────────────────── */
  return {
    openPwModal,
    closePwModal,
    openAdminPanel,
    closeAdminPanel,
    activateAdmin,
    deactivateAdmin,
    isAdminActive,
    adminAddSite,
    adminDelete,
    quickDelete,
    clearAll,
    syncSupabase,
    setupListeners,
  };

})();
