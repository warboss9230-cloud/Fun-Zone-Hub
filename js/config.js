/**
 * ═══════════════════════════════════════════════════════════
 *  FunZone Hub — js/config.js
 *  All configuration constants in one place.
 *  ⚠️  Change SUPABASE_URL and SUPABASE_ANON_KEY before deploy.
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

window.FZ_CONFIG = Object.freeze({

  /* ── Supabase ─────────────────────────────────────────── */
  SUPABASE_URL:      'https://cvqfhigyunshybaiychd.supabase.co',        // https://xxxx.supabase.co
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cWZoaWd5dW5zaHliYWl5Y2hkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjU3NjQsImV4cCI6MjA5MjM0MTc2NH0.EkSs9pT6ZISJUR4l79ZdP8S-QpyrdD72wIpEmPVrlqY',  // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  SUPABASE_TABLE:    'funzone_sites',

  /* ── Admin Auth ───────────────────────────────────────── */
  // ⚠️  Hash is SHA-256 of "Harendra91"
  // To generate a new hash: run btoa(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('YourPass')))
  // then store the hex. DO NOT store plain-text passwords.
  ADMIN_PASS_HASH:   '5192512cb1f9c737e8a3af331c89bd151df251769b2fc8adb1b9b38c3add3f30',

  /* ── Secret Logo Tap ──────────────────────────────────── */
  LOGO_TAP_REQUIRED: 7,       // Number of taps to open admin login
  TAP_WINDOW_MS:     3000,    // Tap reset window in milliseconds

  /* ── localStorage key ────────────────────────────────── */
  LS_DATA_KEY:  'fz_sites_v2',
  LS_ADMIN_KEY: 'fz_admin_v2',

  /* ── Categories ───────────────────────────────────────── */
  CATEGORIES: ['games', 'quiz', 'comics', 'stories'],

  /* ── Default seed data (used if no DB or localStorage) ── */
  DEFAULT_DATA: {
    games: [
      { id:'g1', name:'Coolmath Games', url:'https://www.coolmathgames.com', desc:'Math-based fun games jo dimag tez kare.', emoji:'🧮', visits:'12M+', rating:'4.8' },
      { id:'g2', name:'Poki',           url:'https://poki.com',              desc:'Hundreds of free online games — action, puzzle, sports.', emoji:'🕹️', visits:'50M+', rating:'4.7' },
      { id:'g3', name:'Miniclip',       url:'https://www.miniclip.com',      desc:'Classic games jo bachpan ki yaad dilate hain.', emoji:'🎯', visits:'20M+', rating:'4.6' },
    ],
    quiz: [
      { id:'q1', name:'Sporcle',  url:'https://www.sporcle.com', desc:'Lakho quiz — GK, sports, movies aur bahut kuch.', emoji:'❓', visits:'8M+',   rating:'4.9' },
      { id:'q2', name:'Kahoot!',  url:'https://kahoot.com',      desc:'Live quiz games classroom se ghar tak.', emoji:'🏆', visits:'300M+', rating:'4.8' },
    ],
    comics: [
      { id:'c1', name:'Webtoon',    url:'https://www.webtoons.com',    desc:'Thousands of free comics Hindi aur English mein.', emoji:'📚', visits:'89M+', rating:'4.9' },
      { id:'c2', name:'ComicExtra', url:'https://ww1.comicextra.com',  desc:'Marvel, DC aur baki comics bilkul free.', emoji:'🦸', visits:'5M+',  rating:'4.5' },
    ],
    stories: [
      { id:'s1', name:'Pratilipi', url:'https://pratilipi.com',    desc:'Hindi mein lakho original kahaniyan aur upanyas.', emoji:'✍️', visits:'40M+', rating:'4.8' },
      { id:'s2', name:'Wattpad',   url:'https://www.wattpad.com',  desc:'Fan fiction aur original stories English & Hindi.', emoji:'📖', visits:'90M+', rating:'4.7' },
    ],
  },
});
