// Focal/tests/test_dates.test.js
// Unit tests for date utility functions:
//   isValidISODate, safeDate, ldStr, addMonthsClamped, ds, dsNW, fd
//
// Run: node --test Focal/tests/test_dates.test.js
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, daysFromToday, endOfWeekOffset } = require('./harness');

const ctx = createApp();

// ─────────────────────────────────────────────────────────────────────────────
describe('isValidISODate', () => {

  test('accepts a normal valid date', () => {
    assert.equal(ctx.isValidISODate('2026-01-15'), true);
  });

  test('accepts last day of month', () => {
    assert.equal(ctx.isValidISODate('2026-01-31'), true);
  });

  test('accepts Feb 28 in a non-leap year', () => {
    assert.equal(ctx.isValidISODate('2026-02-28'), true);
  });

  test('accepts Feb 29 in a leap year', () => {
    assert.equal(ctx.isValidISODate('2024-02-29'), true);
  });

  test('accepts Dec 31', () => {
    assert.equal(ctx.isValidISODate('2026-12-31'), true);
  });

  test('rejects Feb 29 in a non-leap year', () => {
    assert.equal(ctx.isValidISODate('2026-02-29'), false);
  });

  test('rejects Feb 30', () => {
    assert.equal(ctx.isValidISODate('2026-02-30'), false);
  });

  test('rejects month 13', () => {
    assert.equal(ctx.isValidISODate('2026-13-01'), false);
  });

  test('rejects month 0', () => {
    assert.equal(ctx.isValidISODate('2026-00-01'), false);
  });

  test('rejects day 0', () => {
    assert.equal(ctx.isValidISODate('2026-01-00'), false);
  });

  test('rejects unpadded month/day', () => {
    assert.equal(ctx.isValidISODate('2026-1-5'), false);
  });

  test('rejects plain text', () => {
    assert.equal(ctx.isValidISODate('not-a-date'), false);
  });

  test('rejects empty string', () => {
    assert.equal(ctx.isValidISODate(''), false);
  });

  test('rejects null', () => {
    assert.equal(ctx.isValidISODate(null), false);
  });

  test('rejects undefined', () => {
    assert.equal(ctx.isValidISODate(undefined), false);
  });

  test('rejects number', () => {
    assert.equal(ctx.isValidISODate(20260115), false);
  });

  test('rejects datetime string', () => {
    assert.equal(ctx.isValidISODate('2026-01-15T00:00:00'), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('safeDate', () => {

  test('returns a Date for a valid ISO string', () => {
    const d = ctx.safeDate('2026-06-01');
    assert.ok(d instanceof Date);
    assert.equal(d.getFullYear(), 2026);
    assert.equal(d.getMonth(), 5);  // June = index 5
    assert.equal(d.getDate(), 1);
  });

  test('returns null for an invalid date', () => {
    assert.equal(ctx.safeDate('2026-02-30'), null);
  });

  test('returns null for empty string', () => {
    assert.equal(ctx.safeDate(''), null);
  });

  test('returns null for null', () => {
    assert.equal(ctx.safeDate(null), null);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ldStr', () => {

  test('formats a date as YYYY-MM-DD', () => {
    const d = new Date(2026, 5, 1);  // June 1, 2026 (month is 0-indexed)
    assert.equal(ctx.ldStr(d), '2026-06-01');
  });

  test('zero-pads single-digit month and day', () => {
    const d = new Date(2026, 0, 5);  // Jan 5
    assert.equal(ctx.ldStr(d), '2026-01-05');
  });

  test('roundtrips through safeDate', () => {
    const original = '2026-11-30';
    const d = ctx.safeDate(original);
    assert.equal(ctx.ldStr(d), original);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('addMonthsClamped', () => {

  test('adds months without clamping on a mid-month date', () => {
    const d = new Date(2026, 0, 15);  // Jan 15
    const r = ctx.addMonthsClamped(d, 3);
    assert.equal(r.getMonth(), 3);   // April
    assert.equal(r.getDate(), 15);
  });

  test('clamps Jan 31 + 1 month to Feb 28 in a non-leap year', () => {
    const d = new Date(2026, 0, 31);  // Jan 31, 2026 (not a leap year)
    const r = ctx.addMonthsClamped(d, 1);
    assert.equal(r.getMonth(), 1);   // February
    assert.equal(r.getDate(), 28);
  });

  test('clamps Jan 31 + 1 month to Feb 29 in a leap year', () => {
    const d = new Date(2024, 0, 31);  // Jan 31, 2024 (leap year)
    const r = ctx.addMonthsClamped(d, 1);
    assert.equal(r.getMonth(), 1);
    assert.equal(r.getDate(), 29);
  });

  test('clamps Mar 31 + 1 month to Apr 30', () => {
    const d = new Date(2026, 2, 31);  // Mar 31
    const r = ctx.addMonthsClamped(d, 1);
    assert.equal(r.getMonth(), 3);   // April
    assert.equal(r.getDate(), 30);
  });

  test('wraps December to January of next year', () => {
    const d = new Date(2026, 11, 31);  // Dec 31
    const r = ctx.addMonthsClamped(d, 1);
    assert.equal(r.getFullYear(), 2027);
    assert.equal(r.getMonth(), 0);    // January
    assert.equal(r.getDate(), 31);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ds — due date status code', () => {

  test('returns "e" for empty string', () => {
    assert.equal(ctx.ds(''), 'e');
  });

  test('returns "e" for null', () => {
    assert.equal(ctx.ds(null), 'e');
  });

  test('returns "e" for an invalid date', () => {
    assert.equal(ctx.ds('not-a-date'), 'e');
  });

  test('returns "u" for a past date (yesterday)', () => {
    assert.equal(ctx.ds(daysFromToday(-1)), 'u');
  });

  test('returns "u" for a date 30 days in the past', () => {
    assert.equal(ctx.ds(daysFromToday(-30)), 'u');
  });

  test('returns "s" for today', () => {
    assert.equal(ctx.ds(daysFromToday(0)), 's');
  });

  test('returns "s" for end-of-current-week', () => {
    // End of week = next Sunday (or today if today is Sunday)
    const eowOffset = endOfWeekOffset();
    assert.equal(ctx.ds(daysFromToday(eowOffset)), 's');
  });

  test('returns "n" for the day after end-of-current-week', () => {
    const eowOffset = endOfWeekOffset();
    assert.equal(ctx.ds(daysFromToday(eowOffset + 1)), 'n');
  });

  test('returns "n" for a date 30 days in the future', () => {
    assert.equal(ctx.ds(daysFromToday(30)), 'n');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('dsNW — is due next week?', () => {

  test('returns false for empty string', () => {
    assert.equal(ctx.dsNW(''), false);
  });

  test('returns false for today', () => {
    assert.equal(ctx.dsNW(daysFromToday(0)), false);
  });

  test('returns false for a past date', () => {
    assert.equal(ctx.dsNW(daysFromToday(-1)), false);
  });

  test('returns false for end-of-current-week', () => {
    assert.equal(ctx.dsNW(daysFromToday(endOfWeekOffset())), false);
  });

  test('returns true for the first day of next week', () => {
    assert.equal(ctx.dsNW(daysFromToday(endOfWeekOffset() + 1)), true);
  });

  test('returns true for the last day of next week', () => {
    assert.equal(ctx.dsNW(daysFromToday(endOfWeekOffset() + 7)), true);
  });

  test('returns false for a date beyond next week', () => {
    assert.equal(ctx.dsNW(daysFromToday(endOfWeekOffset() + 8)), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('fd — format due date for display', () => {

  test('formats a valid date as "Mon D" (e.g. "Jun 1")', () => {
    const result = ctx.fd('2026-06-01');
    assert.ok(result.includes('Jun'), `expected "Jun" in "${result}"`);
    assert.ok(result.includes('1'),   `expected "1" in "${result}"`);
  });

  test('returns the em-dash for an empty string', () => {
    assert.equal(ctx.fd(''), '—');
  });

  test('returns the em-dash for an invalid date', () => {
    assert.equal(ctx.fd('2026-02-30'), '—');
  });
});
