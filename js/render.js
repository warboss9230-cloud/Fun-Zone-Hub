/**
 * ═══════════════════════════════════════════════════════════
 *  FunZone Hub — js/render.js
 *  Renders cards, sections, empty states.
 *  Exposes window.FZ_RENDER namespace.
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

window.FZ_RENDER = (function () {

  const CFG = window.FZ_CONFIG;

  const CAT_LABEL = {
    games:   '🎮 Game',
    quiz:    '🧠 Quiz',
    comics:  '💥 Comic',
    stories: '📖 Story',
  };

  /* ── XSS-safe HTML escaping ───────────────────────────── */
  function esc(str) {
    return String(str || '')
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#x27;');
  }

  /* ── URL validation (no javascript: etc.) ─────────────── */
  function safeUrl(url) {
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return '#';
      return esc(u.href);
    } catch (_) { return '#'; }
  }

  /* ── Render a single card HTML ────────────────────────── */
  function cardHTML(cat, site, idx) {
    return `
      <div class="card" data-cat="${esc(cat)}" data-id="${esc(site.id)}" role="listitem"
           style="animation-delay:${idx * 0.055}s">
        <button class="card-del" aria-label="Delete ${esc(site.name)}"
                data-delcat="${esc(cat)}" data-delid="${esc(site.id)}">✕ Delete</button>
        <div class="card-thumb" aria-hidden="true">${esc(site.emoji || '🌐')}</div>
        <div class="card-body">
          <span class="card-tag">${CAT_LABEL[cat] || cat}</span>
          <h3 class="card-title">${esc(site.name)}</h3>
          <p class="card-desc">${esc(site.desc || 'A great website to explore!')}</p>
          <div class="card-foot">
            <div class="card-meta">
              <span>⭐ ${esc(site.rating || '—')}</span>
            </div>
            <a href="${safeUrl(site.url)}" target="_blank" rel="noopener noreferrer"
               class="card-visit" aria-label="Visit ${esc(site.name)}">
              Visit →
            </a>
          </div>
        </div>
      </div>`;
  }

  /* ── Render one category grid ─────────────────────────── */
  function renderCategory(cat) {
    const grid  = document.getElementById('grid-' + cat);
    if (!grid) return;

    const items = window.FZ_DB.getCategory(cat);

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <p>Abhi koi website nahi hai.<br>
             Admin panel se add karo!</p>
        </div>`;
      return;
    }

    grid.innerHTML = items.map((site, i) => cardHTML(cat, site, i)).join('');

    // Attach delete listeners
    grid.querySelectorAll('.card-del').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const c  = this.dataset.delcat;
        const id = this.dataset.delid;
        if (c && id && window.FZ_ADMIN) window.FZ_ADMIN.quickDelete(c, id);
      });
    });
  }

  /* ── Refresh all categories ───────────────────────────── */
  function refreshAll() {
    CFG.CATEGORIES.forEach(renderCategory);
    updateTotalCount();
  }

  /* ── Update hero stat ─────────────────────────────────── */
  function updateTotalCount() {
    const el = document.getElementById('totalCount');
    if (el) el.textContent = window.FZ_DB.totalCount();
  }

  /* ── Visible sections based on active filter ──────────── */
  function showFilter(cat) {
    CFG.CATEGORIES.forEach(c => {
      const sec = document.getElementById('sec-' + c);
      if (!sec) return;
      sec.classList.toggle('visible', cat === 'all' || cat === c);
    });

    // Update filter tab active state
    document.querySelectorAll('.filter-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === cat);
      btn.setAttribute('aria-selected', btn.dataset.cat === cat ? 'true' : 'false');
    });
  }

  /* ── Public API ───────────────────────────────────────── */
  return {
    renderCategory,
    refreshAll,
    updateTotalCount,
    showFilter,
    esc,
  };

})();
