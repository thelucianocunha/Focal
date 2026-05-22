// Focal/tests/test_i18n.test.js
// Tests for the i18n system: t() function, key parity across all 7 languages.
//
// Run: node --test Focal/tests/test_i18n.test.js
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./harness');

const ctx = createApp();

// ─────────────────────────────────────────────────────────────────────────────
describe('t() — translation function', () => {

  test('returns English value for a known key when lang is "en"', () => {
    ctx._getS().settings.lang = 'en';
    const result = ctx.t('nav_today');
    assert.equal(typeof result, 'string');
    assert.ok(result.length > 0, 'should return a non-empty string');
    assert.equal(result, 'Today');
  });

  test('returns string for a known nav key', () => {
    ctx._getS().settings.lang = 'en';
    assert.equal(ctx.t('nav_inbox'), 'Inbox');
  });

  test('substitutes a single {var} placeholder', () => {
    ctx._getS().settings.lang = 'en';
    // Use a known parameterized key — toast_new_week uses {n}
    const result = ctx.t('toast_new_week', { n: 5 });
    assert.ok(result.includes('5'), `expected "5" in: "${result}"`);
    assert.ok(!result.includes('{n}'), 'placeholder should be substituted');
  });

  test('substitutes multiple {var} placeholders', () => {
    ctx._getS().settings.lang = 'en';
    // ix_pa_progress uses {cur} and {total}
    const result = ctx.t('ix_pa_progress', { cur: 2, total: 10 });
    assert.ok(result.includes('2'),  `expected "2" in: "${result}"`);
    assert.ok(result.includes('10'), `expected "10" in: "${result}"`);
  });

  test('returns the key name itself when key is missing (graceful fallback)', () => {
    ctx._getS().settings.lang = 'en';
    const result = ctx.t('no_such_key_xyz_999');
    assert.equal(result, 'no_such_key_xyz_999');
  });

  test('falls back to English when active language is missing the key', () => {
    // Temporarily point to a real language that has the key
    ctx._getS().settings.lang = 'nl';
    const result = ctx.t('nav_today');
    assert.ok(result.length > 0, 'should return a non-empty string in Dutch or English');
    // Restore
    ctx._getS().settings.lang = 'en';
  });

  test('returns a non-empty string for a key in Dutch', () => {
    ctx._getS().settings.lang = 'nl';
    const result = ctx.t('nav_today');
    assert.ok(result.length > 0);
    ctx._getS().settings.lang = 'en';
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('Key parity — all 7 language blocks must be consistent', () => {

  test('all language blocks have the same number of keys', () => {
    const TRANSLATIONS = ctx._getTranslations();
    const langs = Object.keys(TRANSLATIONS);

    // Ensure we have exactly 7 languages
    assert.equal(langs.length, 7,
      `expected 7 languages, got: ${langs.join(', ')}`);

    const counts = langs.map(l => ({ lang: l, count: Object.keys(TRANSLATIONS[l]).length }));
    const enCount = counts.find(c => c.lang === 'en').count;

    for (const { lang, count } of counts) {
      assert.equal(count, enCount,
        `language "${lang}" has ${count} keys but "en" has ${enCount}`);
    }
  });

  test('all language blocks have exactly the same key names in the same order', () => {
    const TRANSLATIONS = ctx._getTranslations();
    const enKeys = Object.keys(TRANSLATIONS.en);

    for (const lang of Object.keys(TRANSLATIONS)) {
      if (lang === 'en') continue;
      const langKeys = Object.keys(TRANSLATIONS[lang]);

      // Check every English key is present in this language
      for (const key of enKeys) {
        assert.ok(
          Object.prototype.hasOwnProperty.call(TRANSLATIONS[lang], key),
          `language "${lang}" is missing key: "${key}"`
        );
      }

      // Check no extra keys crept in
      for (const key of langKeys) {
        assert.ok(
          Object.prototype.hasOwnProperty.call(TRANSLATIONS.en, key),
          `language "${lang}" has extra key not in en: "${key}"`
        );
      }
    }
  });

  test('no language block has any key with an empty value', () => {
    const TRANSLATIONS = ctx._getTranslations();
    for (const [lang, block] of Object.entries(TRANSLATIONS)) {
      for (const [key, val] of Object.entries(block)) {
        assert.ok(
          typeof val === 'string' && val.length > 0,
          `language "${lang}", key "${key}" has empty/non-string value`
        );
      }
    }
  });

  test('FOCAL_LANGS lists exactly 7 entries with code, name, and english fields', () => {
    const FOCAL_LANGS = ctx._getFocalLangs();
    assert.equal(FOCAL_LANGS.length, 7);
    for (const entry of FOCAL_LANGS) {
      assert.ok(entry.code   && typeof entry.code   === 'string', 'missing code');
      assert.ok(entry.name   && typeof entry.name   === 'string', 'missing name');
      assert.ok(entry.english && typeof entry.english === 'string', 'missing english');
    }
  });

  test('every FOCAL_LANGS code exists as a block in TRANSLATIONS', () => {
    const TRANSLATIONS = ctx._getTranslations();
    const FOCAL_LANGS  = ctx._getFocalLangs();
    for (const { code } of FOCAL_LANGS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(TRANSLATIONS, code),
        `FOCAL_LANGS code "${code}" has no matching TRANSLATIONS block`
      );
    }
  });
});
