// Focal/tests/test_filters.test.js
// Unit tests for filter and matching logic:
//   _fMatch, matchesFilter, matchesPerson, matchesAll
//
// Filter pills (activeF) and personFilter are set via the injected test helpers
// because they are `let` globals in the app's lexical scope.
//
// Run: node --test Focal/tests/test_filters.test.js
'use strict';
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, daysFromToday, makeTask } = require('./harness');

const ctx = createApp();

// Reset filter state before each test so tests don't bleed into each other
function resetFilters() {
  ctx._setActiveF(new Set(['all']));
  ctx._setPersonFilter([]);
}

// ─────────────────────────────────────────────────────────────────────────────
describe('_fMatch — single filter primitive', () => {

  test('"all" matches any task', () => {
    const t = makeTask({ status: 'Backlog', priority: 'P4' });
    assert.equal(ctx._fMatch('all', t), true);
  });

  test('"p1" matches only P1 priority', () => {
    assert.equal(ctx._fMatch('p1', makeTask({ priority: 'P1' })), true);
    assert.equal(ctx._fMatch('p1', makeTask({ priority: 'P2' })), false);
    assert.equal(ctx._fMatch('p1', makeTask({ priority: 'P3' })), false);
  });

  test('"p2" matches only P2 priority', () => {
    assert.equal(ctx._fMatch('p2', makeTask({ priority: 'P2' })), true);
    assert.equal(ctx._fMatch('p2', makeTask({ priority: 'P1' })), false);
  });

  test('"prog" matches only In Progress status', () => {
    assert.equal(ctx._fMatch('prog', makeTask({ status: 'In Progress' })), true);
    assert.equal(ctx._fMatch('prog', makeTask({ status: 'To Do' })),       false);
    assert.equal(ctx._fMatch('prog', makeTask({ status: 'Done' })),        false);
  });

  test('"rec" matches only recurring type', () => {
    assert.equal(ctx._fMatch('rec', makeTask({ type: 'recurring' })), true);
    assert.equal(ctx._fMatch('rec', makeTask({ type: 'once' })),      false);
    assert.equal(ctx._fMatch('rec', makeTask({ type: 'decision' })),  false);
  });

  test('"conf" matches only confidential tasks', () => {
    assert.equal(ctx._fMatch('conf', makeTask({ confidential: true  })), true);
    assert.equal(ctx._fMatch('conf', makeTask({ confidential: false })), false);
  });

  test('"backlog" matches only Backlog status', () => {
    assert.equal(ctx._fMatch('backlog', makeTask({ status: 'Backlog' })),     true);
    assert.equal(ctx._fMatch('backlog', makeTask({ status: 'To Do' })),       false);
    assert.equal(ctx._fMatch('backlog', makeTask({ status: 'In Progress' })), false);
  });

  test('"aging" matches tasks whose ageLevel is not none', () => {
    // 20-day-old To Do hits the yellow threshold (14)
    const aged  = makeTask({ status: 'To Do', lastStatusChange: daysFromToday(-20) });
    const fresh = makeTask({ status: 'To Do', lastStatusChange: daysFromToday(-1)  });
    assert.equal(ctx._fMatch('aging', aged),  true);
    assert.equal(ctx._fMatch('aging', fresh), false);
  });

  test('"aging" does not match Done tasks even if very old', () => {
    const t = makeTask({ status: 'Done', lastStatusChange: daysFromToday(-200) });
    assert.equal(ctx._fMatch('aging', t), false);
  });

  test('"overdue" matches tasks with a past due date', () => {
    const overdue = makeTask({ due: daysFromToday(-3) });
    const future  = makeTask({ due: daysFromToday(5)  });
    const nodueD  = makeTask({ due: '' });
    assert.equal(ctx._fMatch('overdue', overdue), true);
    assert.equal(ctx._fMatch('overdue', future),  false);
    assert.equal(ctx._fMatch('overdue', nodueD),  false);
  });

  test('"week" matches tasks due today', () => {
    const t = makeTask({ due: daysFromToday(0) });
    assert.equal(ctx._fMatch('week', t), true);
  });

  test('"week" matches tasks due this week but not past due', () => {
    // Due tomorrow is always this week (Sunday or not)
    const t = makeTask({ due: daysFromToday(1) });
    // Only fails if today is Sunday and tomorrow starts next week — but
    // daysFromToday(1) on Sunday = Monday, while endOfWeek = Sunday = today,
    // so Monday would be 'n'. Let's use a more robust check:
    const ds = ctx.ds(daysFromToday(1));
    const expected = ds === 's';
    assert.equal(ctx._fMatch('week', t), expected);
  });

  test('"week" does not match tasks with no due date', () => {
    const t = makeTask({ due: '' });
    assert.equal(ctx._fMatch('week', t), false);
  });

  test('unknown filter returns false', () => {
    const t = makeTask();
    assert.equal(ctx._fMatch('xyz', t), false);
    assert.equal(ctx._fMatch('',    t), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('matchesFilter — activeF set', () => {

  beforeEach(resetFilters);

  test('activeF=["all"] matches every task', () => {
    ctx._setActiveF(new Set(['all']));
    assert.equal(ctx.matchesFilter(makeTask({ status: 'Backlog', priority: 'P4' })), true);
  });

  test('activeF=["p1"] matches P1 tasks', () => {
    ctx._setActiveF(new Set(['p1']));
    assert.equal(ctx.matchesFilter(makeTask({ priority: 'P1' })), true);
  });

  test('activeF=["p1"] does not match P2 tasks', () => {
    ctx._setActiveF(new Set(['p1']));
    assert.equal(ctx.matchesFilter(makeTask({ priority: 'P2' })), false);
  });

  test('activeF=["p1","p2"] uses OR logic — P2 matches', () => {
    ctx._setActiveF(new Set(['p1', 'p2']));
    assert.equal(ctx.matchesFilter(makeTask({ priority: 'P2' })), true);
  });

  test('activeF=["p1","p2"] does not match P3', () => {
    ctx._setActiveF(new Set(['p1', 'p2']));
    assert.equal(ctx.matchesFilter(makeTask({ priority: 'P3' })), false);
  });

  test('activeF=["prog","conf"] matches In Progress task', () => {
    ctx._setActiveF(new Set(['prog', 'conf']));
    assert.equal(ctx.matchesFilter(makeTask({ status: 'In Progress' })), true);
  });

  test('activeF=["prog","conf"] matches confidential task', () => {
    ctx._setActiveF(new Set(['prog', 'conf']));
    assert.equal(ctx.matchesFilter(makeTask({ confidential: true })), true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('matchesPerson — person filter', () => {

  beforeEach(() => {
    resetFilters();
    // Ensure no groups exist in the shared state
    ctx._getS().personGroups = [];
  });

  test('empty personFilter matches any task', () => {
    ctx._setPersonFilter([]);
    assert.equal(ctx.matchesPerson(makeTask({ connections: [] })), true);
    assert.equal(ctx.matchesPerson(makeTask({ connections: ['Alice'] })), true);
  });

  test('matches when task connections include the filtered person (exact case)', () => {
    ctx._setPersonFilter(['Alice']);
    assert.equal(ctx.matchesPerson(makeTask({ connections: ['Alice', 'Bob'] })), true);
  });

  test('case-insensitive connection match', () => {
    ctx._setPersonFilter(['alice']);
    assert.equal(ctx.matchesPerson(makeTask({ connections: ['Alice'] })), true);
  });

  test('does not match when person is not in connections', () => {
    ctx._setPersonFilter(['Carol']);
    assert.equal(ctx.matchesPerson(makeTask({ connections: ['Alice', 'Bob'] })), false);
  });

  test('multiple persons in personFilter use OR logic', () => {
    ctx._setPersonFilter(['Alice', 'Carol']);
    assert.equal(ctx.matchesPerson(makeTask({ connections: ['Carol'] })), true);
  });

  test('group filter expands to members — direct group name match', () => {
    ctx._getS().personGroups = [
      { id: 'grp1', name: 'Team Alpha', color: '#000', members: ['Alice', 'Bob'] },
    ];
    ctx._setPersonFilter(['Team Alpha']);
    // Task connected to a group member should match
    assert.equal(ctx.matchesPerson(makeTask({ connections: ['Bob'] })), true);
  });

  test('group filter does not match people outside the group', () => {
    ctx._getS().personGroups = [
      { id: 'grp1', name: 'Team Alpha', color: '#000', members: ['Alice', 'Bob'] },
    ];
    ctx._setPersonFilter(['Team Alpha']);
    assert.equal(ctx.matchesPerson(makeTask({ connections: ['Carol'] })), false);
  });

  test('task with no connections does not match a non-empty filter', () => {
    ctx._setPersonFilter(['Alice']);
    assert.equal(ctx.matchesPerson(makeTask({ connections: [] })), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('matchesAll — AND combination', () => {

  beforeEach(resetFilters);

  test('both conditions true → true', () => {
    ctx._setActiveF(new Set(['p1']));
    ctx._setPersonFilter(['Alice']);
    const t = makeTask({ priority: 'P1', connections: ['Alice'] });
    assert.equal(ctx.matchesAll(t), true);
  });

  test('pill filter fails → false even if person matches', () => {
    ctx._setActiveF(new Set(['p1']));
    ctx._setPersonFilter(['Alice']);
    const t = makeTask({ priority: 'P2', connections: ['Alice'] });
    assert.equal(ctx.matchesAll(t), false);
  });

  test('person filter fails → false even if pill matches', () => {
    ctx._setActiveF(new Set(['p1']));
    ctx._setPersonFilter(['Alice']);
    const t = makeTask({ priority: 'P1', connections: ['Bob'] });
    assert.equal(ctx.matchesAll(t), false);
  });

  test('both conditions default (all + empty) → true for any task', () => {
    const t = makeTask({ priority: 'P4', connections: [] });
    assert.equal(ctx.matchesAll(t), true);
  });
});
