// Focal/tests/harness.js
// Test harness — zero npm dependencies, requires Node 18+
//
// Loads the three app source files in a vm.Context with browser-API mocks.
// All files are concatenated into ONE vm.runInContext call so that let/const
// variables in Focal_app.js share a single lexical scope with the injected
// state-accessor helpers (_getS, _setActiveF, etc.).
'use strict';
const vm   = require('vm');
const fs   = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, '..');

// ── In-memory localStorage ──────────────────────────────────────────────────
class LocalStorageMock {
  constructor() { this._d = Object.create(null); }
  getItem(k)    { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; }
  setItem(k, v) { this._d[k] = String(v); }
  removeItem(k) { delete this._d[k]; }
  clear()       { this._d = Object.create(null); }
  key(i)        { return Object.keys(this._d)[i] ?? null; }
  get length()  { return Object.keys(this._d).length; }
}

// ── Proxy that silently absorbs all DOM reads, writes, and calls ─────────────
// Any property access returns either a sensible primitive or another proxy.
// Method calls return proxies (safe for chaining). Assignment is absorbed.
function makeProxy() {
  const noop = new Set(['forEach','map','filter','reduce','find','some','every','flat','flatMap']);
  const handler = {
    get(t, p) {
      if (p === Symbol.toPrimitive)  return () => '';
      if (p === Symbol.toStringTag)  return 'Object';
      if (p === Symbol.iterator)     return () => [][Symbol.iterator]();
      if (p === 'length')            return 0;
      if (noop.has(String(p)))       return () => makeProxy();
      if (p === 'value' || p === 'innerHTML' || p === 'textContent' ||
          p === 'className' || p === 'type')  return '';
      if (p === 'checked' || p === 'disabled' || p === 'hidden') return false;
      if (p === 'options' || p === 'children') return [];
      if (p === 'style') return new Proxy({}, { get: () => '', set: () => true });
      if (Object.prototype.hasOwnProperty.call(t, p)) return t[p];
      const v = new Proxy(function(){}, handler);
      t[p] = v;
      return v;
    },
    set(t, p, v)        { t[p] = v; return true; },
    apply(_t, _th, _as) { return makeProxy(); },
    construct(_t, _as)  { return makeProxy(); },
  };
  return new Proxy(Object.create(null), handler);
}

// ── Build the vm sandbox (the "global" object for the app) ──────────────────
function buildSandbox() {
  const localStorage = new LocalStorageMock();
  const dom = makeProxy();
  const sb = {
    localStorage,
    document:              dom,
    navigator:             { language: 'en', userLanguage: 'en' },
    MutationObserver:      class { constructor(_cb){} observe(){} disconnect(){} },
    indexedDB:             dom,
    performance:           { now: () => Date.now() },
    location:              { href: '' },
    // Suppress async side-effects during load
    setTimeout:            () => 0,
    clearTimeout:          () => {},
    setInterval:           () => 0,
    clearInterval:         () => {},
    requestAnimationFrame: () => 0,
    // Passthrough Node builtins
    console, JSON, Math, Date, Array, Object, String, Number, Boolean,
    Set, Map, WeakMap, WeakSet, Proxy, Symbol, Error, TypeError, RangeError,
    RegExp, Promise, parseInt, parseFloat, isNaN, isFinite,
    encodeURIComponent, decodeURIComponent, encodeURI, decodeURI,
  };
  sb.window    = sb;
  sb.globalThis = sb;
  sb.self      = sb;
  return sb;
}

// ── Test-accessor helpers — MUST run in the same lexical scope as app code ───
// Injected at the end of the combined script so they can read/write the
// app's `let`-declared globals (S, activeF, personFilter, etc.)
const TEST_HELPERS = `
  // Ensure S.settings exists — FILE_DATA has no settings key, so fresh
  // (no-localStorage) loads leave S.settings undefined. Real deployments
  // always have settings from a prior focal_v1 save. Tests need a baseline.
  if (!S.settings) {
    S.settings = { claudeKey: '', aiModel: '', lang: 'en', langAuto: false, theme: 'light' };
  }

  window._getS             = () => S;
  window._setS             = (v)  => { S = v; };
  window._getActiveF       = () => activeF;
  window._setActiveF       = (v)  => { activeF = v; };
  window._getPersonFilter  = () => personFilter;
  window._setPersonFilter  = (v)  => { personFilter = v; };
  window._getBkSuppress    = () => _bkSuppressAutoSync;
  window._resetBkSuppress  = ()  => { _bkSuppressAutoSync = false; };
  window._getTranslations  = () => TRANSLATIONS;
  window._getFocalLangs    = () => FOCAL_LANGS;
`;

// ── Create a fresh app context ───────────────────────────────────────────────
// Each test that needs isolated state should call createApp().
// Sharing a context across tests in one file is fine when tests reset state.
function createApp() {
  const sb  = buildSandbox();
  const ctx = vm.createContext(sb);

  const combined = [
    'Focal_data.default.js',
    'Focal_i18n.js',
    'Focal_app.js',
  ]
    .map(f => fs.readFileSync(path.join(APP_DIR, f), 'utf8'))
    .join('\n;\n')
    + '\n;\n' + TEST_HELPERS;

  vm.runInContext(combined, ctx);
  return ctx;
}

// ── Shared test utilities ────────────────────────────────────────────────────

function isoDate(d) {
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
}

// ISO date string for N days relative to today (negative = past)
function daysFromToday(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

// Number of days until the next Sunday from today (0 if today IS Sunday)
function endOfWeekOffset() {
  return (7 - new Date().getDay()) % 7;
}

// Minimal valid task object — override any field via the overrides arg
function makeTask(overrides = {}) {
  return Object.assign({
    id:               'tst_' + Math.random().toString(36).slice(2),
    task:             'Test task',
    note:             '',
    url:              '',
    priority:         'P3',
    status:           'To Do',
    due:              '',
    lastStatusChange: daysFromToday(0),
    type:             'once',
    rInterval:        '',
    urgent:           0,
    confidential:     false,
    connections:      [],
    outcomes:         [],
    parent:           null,
    kanbanCol:        null,
    kanbanColSince:   null,
    decided:          false,
    lastPrioritizedAt: null,
    pData:            null,
  }, overrides);
}

module.exports = { createApp, LocalStorageMock, isoDate, daysFromToday, endOfWeekOffset, makeTask };
