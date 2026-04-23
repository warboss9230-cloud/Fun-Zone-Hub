/**
 * ═══════════════════════════════════════════════════════════
 *  FunZone Hub — js/db.js
 *  Data layer: Supabase (primary) + localStorage (fallback).
 *  Exposes window.FZ_DB namespace.
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

window.FZ_DB = (function () {

  const CFG = window.FZ_CONFIG;
  let _sb   = null;       // Supabase client
  let _connected = false;

  /* ── Internal state ───────────────────────────────────── */
  let _data = deepClone(CFG.DEFAULT_DATA); // live in-memory store

  /* ── Helpers ──────────────────────────────────────────── */
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ── LocalStorage ─────────────────────────────────────── */
  function saveLocal() {
    try {
      localStorage.setItem(CFG.LS_DATA_KEY, JSON.stringify(_data));
    } catch (e) {
      console.warn('localStorage save failed:', e.message);
    }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(CFG.LS_DATA_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Validate shape
        if (parsed && typeof parsed === 'object') {
          CFG.CATEGORIES.forEach(cat => {
            if (!Array.isArray(parsed[cat])) parsed[cat] = [];
          });
          _data = parsed;
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  /* ── Supabase Init ────────────────────────────────────── */
  function initSupabase() {
    if (CFG.SUPABASE_URL === 'YOUR_SUPABASE_URL' ||
        CFG.SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
      _connected = false;
      setUiStatus(false, 'Local');
      return;
    }
    try {
      _sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
      setUiStatus(null, 'Connecting…');
      fetchFromSupabase();
    } catch (e) {
      _connected = false;
      setUiStatus(false, 'Error');
    }
  }

  function setUiStatus(ok, label) {
    _connected = !!ok;
    const dot  = document.getElementById('sbDot');
    const text = document.getElementById('sbText');
    const admDot = document.getElementById('admSbDot');
    const admLbl = document.getElementById('admSbLabel');
    const footer = document.getElementById('footerDb');

    if (dot)    dot.className  = 'sb-dot' + (ok === true ? ' ok' : ok === false ? ' err' : '');
    if (text)   text.textContent = label || 'DB';
    if (admDot) admDot.className = 'sb-dot sm' + (ok === true ? ' ok' : ok === false ? ' err' : '');
    if (admLbl) admLbl.textContent = ok === true ? 'Connected' : (label || 'Supabase');
    if (footer) footer.textContent = ok === true ? '☁️ Supabase Connected' : '💾 localStorage Mode';
  }

  /* ── Fetch from Supabase ──────────────────────────────── */
  async function fetchFromSupabase() {
    if (!_sb) return;
    try {
      const { data, error } = await _sb
        .from(CFG.SUPABASE_TABLE)
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (Array.isArray(data) && data.length > 0) {
        const rebuilt = { games: [], quiz: [], comics: [], stories: [] };
        data.forEach(row => {
          if (rebuilt[row.category]) {
            rebuilt[row.category].push({
              id:      row.id   || uid(),
              name:    row.name,
              url:     row.url,
              desc:    row.description || '',
              emoji:   row.emoji  || '🌐',
              visits:  row.visits || '',
              rating:  row.rating || '—',
            });
          }
        });
        _data = rebuilt;
        saveLocal();
        if (window.FZ_RENDER) window.FZ_RENDER.refreshAll();
      }
      setUiStatus(true, 'Supabase');
    } catch (e) {
      setUiStatus(false, 'Offline');
    }
  }

  /* ── Sync to Supabase ─────────────────────────────────── */
  async function syncToSupabase() {
    if (!_sb) return { ok: false, msg: 'Supabase not configured.' };
    try {
      // Delete all rows first
      await _sb.from(CFG.SUPABASE_TABLE).delete().neq('id', 0);

      // Build flat row array
      const rows = [];
      CFG.CATEGORIES.forEach(cat => {
        (_data[cat] || []).forEach(s => {
          rows.push({
            category:    cat,
            name:        s.name,
            url:         s.url,
            description: s.desc || '',
            emoji:       s.emoji || '🌐',
            visits:      s.visits || '',
            rating:      s.rating || '—',
          });
        });
      });

      if (rows.length > 0) {
        const { error } = await _sb.from(CFG.SUPABASE_TABLE).insert(rows);
        if (error) throw error;
      }
      setUiStatus(true, 'Supabase');
      return { ok: true, msg: `✅ ${rows.length} websites Supabase mein sync ho gayi!` };
    } catch (e) {
      return { ok: false, msg: '❌ Sync failed: ' + e.message };
    }
  }

  /* ── CRUD ─────────────────────────────────────────────── */
  function getAll() { return deepClone(_data); }
  function getCategory(cat) { return deepClone(_data[cat] || []); }

  function addSite(cat, site) {
    if (!CFG.CATEGORIES.includes(cat)) return false;
    site.id = site.id || uid();
    _data[cat].push(site);
    saveLocal();
    return true;
  }

  function deleteSite(cat, id) {
    if (!CFG.CATEGORIES.includes(cat)) return false;
    const before = _data[cat].length;
    _data[cat] = _data[cat].filter(s => s.id !== id);
    if (_data[cat].length < before) { saveLocal(); return true; }
    return false;
  }

  function clearAll() {
    CFG.CATEGORIES.forEach(cat => { _data[cat] = []; });
    saveLocal();
  }

  function totalCount() {
    return CFG.CATEGORIES.reduce((sum, cat) => sum + (_data[cat] || []).length, 0);
  }

  /* ── Boot ─────────────────────────────────────────────── */
  (function boot() {
    const fromLocal = loadLocal();
    if (!fromLocal) {
      _data = deepClone(CFG.DEFAULT_DATA);
      saveLocal();
    }
  })();

  /* ── Public API ───────────────────────────────────────── */
  return {
    init:            initSupabase,
    fetchFromSupabase,
    syncToSupabase,
    getAll,
    getCategory,
    addSite,
    deleteSite,
    clearAll,
    totalCount,
    isConnected:     () => _connected,
  };

})();
