// Focal/tests/test_aging.test.js
// Unit tests for task-aging functions: ageDays, ageLevel, ageTip
//
// AGE_THRESH:
//   'To Do':      yellow ≥ 14 days, red ≥ 30
//   'In Progress': yellow ≥ 7 days,  red ≥ 21
//   'Backlog':    yellow ≥ 30 days, red ≥ 90
//
// Run: node --test Focal/tests/test_aging.test.js
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, daysFromToday, makeTask } = require('./harness');

const ctx = createApp();

// ─────────────────────────────────────────────────────────────────────────────
describe('ageDays', () => {

  test('returns 0 when lastStatusChange is today', () => {
    const t = makeTask({ lastStatusChange: daysFromToday(0) });
    assert.equal(ctx.ageDays(t), 0);
  });

  test('returns correct count for a past date', () => {
    const t = makeTask({ lastStatusChange: daysFromToday(-10) });
    assert.equal(ctx.ageDays(t), 10);
  });

  test('returns 0 when lastStatusChange is null', () => {
    const t = makeTask({ lastStatusChange: null });
    assert.equal(ctx.ageDays(t), 0);
  });

  test('returns 0 when lastStatusChange is empty string', () => {
    const t = makeTask({ lastStatusChange: '' });
    assert.equal(ctx.ageDays(t), 0);
  });

  test('returns 0 for an invalid date string', () => {
    const t = makeTask({ lastStatusChange: 'not-a-date' });
    assert.equal(ctx.ageDays(t), 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ageLevel', () => {

  test('Done tasks always return "none"', () => {
    const t = makeTask({ status: 'Done', lastStatusChange: daysFromToday(-100) });
    assert.equal(ctx.ageLevel(t), 'none');
  });

  test('unknown status returns "none"', () => {
    const t = makeTask({ status: 'Whatever', lastStatusChange: daysFromToday(-50) });
    assert.equal(ctx.ageLevel(t), 'none');
  });

  // To Do thresholds: yellow=14, red=30
  // Note: threshold+2 is used instead of exact threshold to avoid DST edge cases.
  // A spring-forward within the window reduces Math.floor(diff/86400000) by 1,
  // so "exactly 14 days" can compute as 13. Using 16/32 guarantees we cross the threshold.
  test('To Do — 13 days → none (below yellow threshold of 14)', () => {
    const t = makeTask({ status: 'To Do', lastStatusChange: daysFromToday(-13) });
    assert.equal(ctx.ageLevel(t), 'none');
  });

  test('To Do — 16 days → yellow (above threshold of 14)', () => {
    const t = makeTask({ status: 'To Do', lastStatusChange: daysFromToday(-16) });
    assert.equal(ctx.ageLevel(t), 'yellow');
  });

  test('To Do — 29 days → yellow (below red threshold of 30)', () => {
    const t = makeTask({ status: 'To Do', lastStatusChange: daysFromToday(-29) });
    assert.equal(ctx.ageLevel(t), 'yellow');
  });

  test('To Do — 32 days → red (above threshold of 30)', () => {
    const t = makeTask({ status: 'To Do', lastStatusChange: daysFromToday(-32) });
    assert.equal(ctx.ageLevel(t), 'red');
  });

  // In Progress thresholds: yellow=7, red=21
  test('In Progress — 6 days → none (below yellow threshold of 7)', () => {
    const t = makeTask({ status: 'In Progress', lastStatusChange: daysFromToday(-6) });
    assert.equal(ctx.ageLevel(t), 'none');
  });

  test('In Progress — 9 days → yellow (above threshold of 7)', () => {
    const t = makeTask({ status: 'In Progress', lastStatusChange: daysFromToday(-9) });
    assert.equal(ctx.ageLevel(t), 'yellow');
  });

  test('In Progress — 23 days → red (above threshold of 21)', () => {
    const t = makeTask({ status: 'In Progress', lastStatusChange: daysFromToday(-23) });
    assert.equal(ctx.ageLevel(t), 'red');
  });

  // Backlog thresholds: yellow=30, red=90
  test('Backlog — 29 days → none (below yellow threshold of 30)', () => {
    const t = makeTask({ status: 'Backlog', lastStatusChange: daysFromToday(-29) });
    assert.equal(ctx.ageLevel(t), 'none');
  });

  test('Backlog — 32 days → yellow (above threshold of 30)', () => {
    const t = makeTask({ status: 'Backlog', lastStatusChange: daysFromToday(-32) });
    assert.equal(ctx.ageLevel(t), 'yellow');
  });

  test('Backlog — 92 days → red (above threshold of 90)', () => {
    const t = makeTask({ status: 'Backlog', lastStatusChange: daysFromToday(-92) });
    assert.equal(ctx.ageLevel(t), 'red');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('ageTip', () => {

  test('returns empty string when ageLevel is none', () => {
    const t = makeTask({ status: 'To Do', lastStatusChange: daysFromToday(-1) });
    assert.equal(ctx.ageTip(t), '');
  });

  test('returns empty string for Done tasks', () => {
    const t = makeTask({ status: 'Done', lastStatusChange: daysFromToday(-100) });
    assert.equal(ctx.ageTip(t), '');
  });

  test('includes "Overdue" when task has a past due date', () => {
    const t = makeTask({
      status: 'To Do',
      lastStatusChange: daysFromToday(-20),
      due: daysFromToday(-5),
    });
    const tip = ctx.ageTip(t);
    assert.ok(tip.includes('Overdue') || tip.includes('day'), `tip: "${tip}"`);
  });

  test('includes "day" count for aged To Do without due date', () => {
    const t = makeTask({ status: 'To Do', lastStatusChange: daysFromToday(-20) });
    const tip = ctx.ageTip(t);
    assert.ok(tip.includes('20'), `expected day count "20" in: "${tip}"`);
    assert.ok(tip.includes('day'), `expected "day" in: "${tip}"`);
  });

  test('mentions "update status or move to backlog" for aged To Do', () => {
    const t = makeTask({ status: 'To Do', lastStatusChange: daysFromToday(-20) });
    const tip = ctx.ageTip(t);
    assert.ok(tip.includes('update status') || tip.includes('backlog'), `tip: "${tip}"`);
  });

  test('mentions "activate or delete" for aged Backlog task', () => {
    const t = makeTask({ status: 'Backlog', lastStatusChange: daysFromToday(-35) });
    const tip = ctx.ageTip(t);
    assert.ok(tip.includes('activate') || tip.includes('delete'), `tip: "${tip}"`);
  });
});
