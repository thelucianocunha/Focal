// Focal/tests/test_outcomes.test.js
// Unit tests for outcome management and filter pill state machine:
//   deleteOutcome, toggleOutcomeActive, setF (filter state machine)
//
// Run: node --test Focal/tests/test_outcomes.test.js
'use strict';
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const vm   = require('vm');
const { createApp, makeTask } = require('./harness');

// ── Inject a modalOutcomes accessor into an existing vm context ───────────────
// The harness TEST_HELPERS block doesn't expose modalOutcomes, but since all
// app code and test helpers run in the same vm script, we can inject more
// window helpers via a second vm.runInContext call on the returned ctx object.
function addModalAccessors(ctx) {
  vm.runInContext(
    'window._getModalOutcomes = () => modalOutcomes;' +
    'window._setModalOutcomes = (v) => { modalOutcomes = v; };',
    ctx
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

// Add a minimal outcome to S.outcomes and return it
function addOutcome(ctx, overrides = {}) {
  const id = 'oc_' + Math.random().toString(36).slice(2);
  const o = Object.assign({ id, name: 'Test Outcome', color: '#059669', active: true, sort: 0 }, overrides);
  ctx._getS().outcomes.push(o);
  return o;
}

// Add a task with given outcome ids to the first section in S
function addTaskWithOutcomes(ctx, outcomeIds) {
  const t = makeTask({ outcomes: [...outcomeIds] });
  ctx._getS().sections[0].tasks.push(t);
  return t;
}

// ─────────────────────────────────────────────────────────────────────────────
describe('deleteOutcome', () => {

  let ctx;
  beforeEach(() => { ctx = createApp(); });

  test('removes the outcome from S.outcomes', () => {
    const o = addOutcome(ctx);
    ctx.deleteOutcome(o.id);
    assert.equal(ctx._getS().outcomes.find(x => x.id === o.id), undefined);
  });

  test('outcomeById returns undefined after deletion', () => {
    const o = addOutcome(ctx);
    ctx.deleteOutcome(o.id);
    assert.equal(ctx.outcomeById(o.id), undefined);
  });

  test('leaves other outcomes intact', () => {
    const o1 = addOutcome(ctx, { id: 'oc_a', name: 'Alpha' });
    const o2 = addOutcome(ctx, { id: 'oc_b', name: 'Beta' });
    ctx.deleteOutcome(o1.id);
    assert.ok(ctx._getS().outcomes.find(x => x.id === o2.id), 'o2 should still exist');
    assert.equal(ctx._getS().outcomes.find(x => x.id === o1.id), undefined);
  });

  test('strips the deleted id from task.outcomes on every task across all sections', () => {
    const o = addOutcome(ctx);
    const t = addTaskWithOutcomes(ctx, [o.id]);
    ctx.deleteOutcome(o.id);
    const updatedTask = ctx._getS().sections[0].tasks.find(x => x.id === t.id);
    assert.deepEqual(updatedTask.outcomes, []);
  });

  test('strips id from tasks that reference it among multiple outcomes', () => {
    const o1 = addOutcome(ctx, { id: 'oc_x' });
    const o2 = addOutcome(ctx, { id: 'oc_y' });
    const t = addTaskWithOutcomes(ctx, [o1.id, o2.id]);
    ctx.deleteOutcome(o1.id);
    const updatedTask = ctx._getS().sections[0].tasks.find(x => x.id === t.id);
    assert.deepEqual(updatedTask.outcomes, [o2.id]);
  });

  test('tasks that did not reference the outcome are unchanged', () => {
    const o = addOutcome(ctx);
    const unrelated = addTaskWithOutcomes(ctx, ['some_other_oc']);
    ctx.deleteOutcome(o.id);
    const updatedTask = ctx._getS().sections[0].tasks.find(x => x.id === unrelated.id);
    assert.deepEqual(updatedTask.outcomes, ['some_other_oc']);
  });

  test('deleting across multiple sections strips the id from each', () => {
    const o = addOutcome(ctx);
    // Add a second section with its own tasks
    const sec2 = { id: 'sec2', icon: '📋', title: 'Section 2', tasks: [] };
    ctx._getS().sections.push(sec2);
    const t1 = makeTask({ outcomes: [o.id] });
    const t2 = makeTask({ outcomes: [o.id] });
    ctx._getS().sections[0].tasks.push(t1);
    sec2.tasks.push(t2);
    ctx.deleteOutcome(o.id);
    assert.deepEqual(ctx._getS().sections[0].tasks.find(x => x.id === t1.id).outcomes, []);
    assert.deepEqual(sec2.tasks.find(x => x.id === t2.id).outcomes, []);
  });

  test('deleting a non-existent id does not crash and leaves S.outcomes unchanged', () => {
    const o = addOutcome(ctx);
    const before = ctx._getS().outcomes.length;
    assert.doesNotThrow(() => ctx.deleteOutcome('does_not_exist'));
    assert.equal(ctx._getS().outcomes.length, before);
  });

  test('deleting an already-deleted id is a no-op (second call does not crash)', () => {
    const o = addOutcome(ctx);
    ctx.deleteOutcome(o.id);
    assert.doesNotThrow(() => ctx.deleteOutcome(o.id));
  });

  test('tasks whose outcomes array is undefined are not corrupted', () => {
    const o = addOutcome(ctx);
    // Add a task without an outcomes field
    const t = makeTask({ outcomes: undefined });
    delete t.outcomes; // ensure the property is truly missing
    ctx._getS().sections[0].tasks.push(t);
    assert.doesNotThrow(() => ctx.deleteOutcome(o.id));
    // Task still exists without outcomes key mutated to a broken state
    const updated = ctx._getS().sections[0].tasks.find(x => x.id === t.id);
    assert.ok(updated, 'task should still exist');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('toggleOutcomeActive', () => {

  let ctx;
  beforeEach(() => { ctx = createApp(); });

  test('flips active from true to false', () => {
    const o = addOutcome(ctx, { active: true });
    ctx.toggleOutcomeActive(o.id);
    assert.equal(ctx._getS().outcomes.find(x => x.id === o.id).active, false);
  });

  test('flips active from false to true', () => {
    const o = addOutcome(ctx, { active: false });
    ctx.toggleOutcomeActive(o.id);
    assert.equal(ctx._getS().outcomes.find(x => x.id === o.id).active, true);
  });

  test('double toggle restores original active state (true → false → true)', () => {
    const o = addOutcome(ctx, { active: true });
    ctx.toggleOutcomeActive(o.id);
    ctx.toggleOutcomeActive(o.id);
    assert.equal(ctx._getS().outcomes.find(x => x.id === o.id).active, true);
  });

  test('does not affect other outcome fields (name, color, sort)', () => {
    const o = addOutcome(ctx, { id: 'oc_chk', name: 'Preserve Me', color: '#2563EB', sort: 5, active: true });
    ctx.toggleOutcomeActive(o.id);
    const updated = ctx._getS().outcomes.find(x => x.id === o.id);
    assert.equal(updated.name, 'Preserve Me');
    assert.equal(updated.color, '#2563EB');
    assert.equal(updated.sort, 5);
  });

  test('does not affect other outcomes in the array', () => {
    const o1 = addOutcome(ctx, { id: 'oc_1', active: true });
    const o2 = addOutcome(ctx, { id: 'oc_2', active: true });
    ctx.toggleOutcomeActive(o1.id);
    assert.equal(ctx._getS().outcomes.find(x => x.id === o2.id).active, true);
  });

  test('non-existent id is a no-op and does not throw', () => {
    const before = ctx._getS().outcomes.length;
    assert.doesNotThrow(() => ctx.toggleOutcomeActive('no_such_id'));
    assert.equal(ctx._getS().outcomes.length, before);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('toggleModalOutcome', () => {

  let ctx;
  beforeEach(() => {
    ctx = createApp();
    addModalAccessors(ctx);
    ctx._setModalOutcomes([]);
  });

  test('adds outcome id to modalOutcomes when not present', () => {
    const o = addOutcome(ctx);
    ctx.toggleModalOutcome(o.id);
    assert.ok(ctx._getModalOutcomes().includes(o.id));
  });

  test('removes outcome id from modalOutcomes when already present (toggle off)', () => {
    const o = addOutcome(ctx);
    ctx._setModalOutcomes([o.id]);
    ctx.toggleModalOutcome(o.id);
    assert.equal(ctx._getModalOutcomes().includes(o.id), false);
  });

  test('idempotent double toggle leaves state as empty (add then remove)', () => {
    const o = addOutcome(ctx);
    ctx.toggleModalOutcome(o.id); // add
    ctx.toggleModalOutcome(o.id); // remove
    assert.deepEqual(ctx._getModalOutcomes(), []);
  });

  test('can hold two outcomes at once', () => {
    const o1 = addOutcome(ctx, { id: 'oc_m1' });
    const o2 = addOutcome(ctx, { id: 'oc_m2' });
    ctx.toggleModalOutcome(o1.id);
    ctx.toggleModalOutcome(o2.id);
    const mo = ctx._getModalOutcomes();
    assert.ok(mo.includes(o1.id));
    assert.ok(mo.includes(o2.id));
  });

  test('does not add a third outcome (cap at 2) — modalOutcomes stays at 2', () => {
    const o1 = addOutcome(ctx, { id: 'oc_c1' });
    const o2 = addOutcome(ctx, { id: 'oc_c2' });
    const o3 = addOutcome(ctx, { id: 'oc_c3' });
    ctx._setModalOutcomes([o1.id, o2.id]);
    ctx.toggleModalOutcome(o3.id); // should be blocked by the cap
    assert.equal(ctx._getModalOutcomes().length, 2);
    assert.equal(ctx._getModalOutcomes().includes(o3.id), false);
  });

  test('removing one of two outcomes allows adding a third', () => {
    const o1 = addOutcome(ctx, { id: 'oc_d1' });
    const o2 = addOutcome(ctx, { id: 'oc_d2' });
    const o3 = addOutcome(ctx, { id: 'oc_d3' });
    ctx._setModalOutcomes([o1.id, o2.id]);
    ctx.toggleModalOutcome(o1.id); // remove o1 → now 1 item
    ctx.toggleModalOutcome(o3.id); // add o3 → now 2 items
    const mo = ctx._getModalOutcomes();
    assert.ok(mo.includes(o2.id));
    assert.ok(mo.includes(o3.id));
    assert.equal(mo.includes(o1.id), false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('setF — filter pill state machine', () => {

  // Share one context for all setF tests (state is reset before each test)
  const ctx = createApp();

  beforeEach(() => {
    ctx._setActiveF(new Set(['all']));
  });

  // ── Plain click (no ctrl) ──────────────────────────────────────────────────

  test('plain click sets activeF to a single-element set containing f', () => {
    ctx.setF('p1', null, { ctrlKey: false });
    assert.deepEqual([...ctx._getActiveF()], ['p1']);
  });

  test('plain click on "all" sets activeF to {"all"}', () => {
    ctx._setActiveF(new Set(['p1']));
    ctx.setF('all', null, { ctrlKey: false });
    assert.deepEqual([...ctx._getActiveF()], ['all']);
  });

  test('plain click on "all" resets a multi-item activeF to {"all"}', () => {
    ctx._setActiveF(new Set(['p1', 'p2']));
    ctx.setF('all', null, { ctrlKey: false });
    assert.deepEqual([...ctx._getActiveF()], ['all']);
  });

  test('plain click on already-active single filter toggles back to {"all"}', () => {
    ctx._setActiveF(new Set(['p1']));
    ctx.setF('p1', null, { ctrlKey: false });
    assert.deepEqual([...ctx._getActiveF()], ['all']);
  });

  test('plain click replaces an existing single filter with the new one', () => {
    ctx._setActiveF(new Set(['p1']));
    ctx.setF('p2', null, { ctrlKey: false });
    const af = ctx._getActiveF();
    assert.ok(af.has('p2'));
    assert.equal(af.has('p1'), false);
    assert.equal(af.size, 1);
  });

  test('plain click with no evt arg (undefined) behaves like no ctrl', () => {
    ctx.setF('p3', null, undefined);
    assert.deepEqual([...ctx._getActiveF()], ['p3']);
  });

  // ── Ctrl+click (multi-select) ─────────────────────────────────────────────

  test('ctrl+click adds a second filter — both are present', () => {
    ctx._setActiveF(new Set(['p1']));
    ctx.setF('p2', null, { ctrlKey: true });
    const af = ctx._getActiveF();
    assert.ok(af.has('p1'));
    assert.ok(af.has('p2'));
    assert.equal(af.has('all'), false);
  });

  test('ctrl+click removes "all" from the set when adding a filter', () => {
    ctx._setActiveF(new Set(['all']));
    ctx.setF('prog', null, { ctrlKey: true });
    assert.equal(ctx._getActiveF().has('all'), false);
  });

  test('ctrl+click on an active filter removes it from the set', () => {
    ctx._setActiveF(new Set(['p1', 'p2']));
    ctx.setF('p1', null, { ctrlKey: true });
    const af = ctx._getActiveF();
    assert.equal(af.has('p1'), false);
    assert.ok(af.has('p2'));
  });

  test('ctrl+click removing the last filter falls back to {"all"}', () => {
    ctx._setActiveF(new Set(['p1']));
    ctx.setF('p1', null, { ctrlKey: true });
    assert.deepEqual([...ctx._getActiveF()], ['all']);
  });

  test('ctrl+click on "all" resets activeF to {"all"} regardless of current state', () => {
    ctx._setActiveF(new Set(['p1', 'p2']));
    ctx.setF('all', null, { ctrlKey: true });
    assert.deepEqual([...ctx._getActiveF()], ['all']);
  });

  test('ctrl+click on "all" from single non-all filter resets to {"all"}', () => {
    ctx._setActiveF(new Set(['conf']));
    ctx.setF('all', null, { ctrlKey: true });
    assert.deepEqual([...ctx._getActiveF()], ['all']);
  });

  test('multiple ctrl+clicks build a set of three filters', () => {
    ctx.setF('p1',   null, { ctrlKey: false });
    ctx.setF('p2',   null, { ctrlKey: true  });
    ctx.setF('prog', null, { ctrlKey: true  });
    const af = ctx._getActiveF();
    assert.ok(af.has('p1'));
    assert.ok(af.has('p2'));
    assert.ok(af.has('prog'));
    assert.equal(af.size, 3);
  });

  test('metaKey (mac cmd) behaves the same as ctrlKey for multi-select', () => {
    ctx._setActiveF(new Set(['p1']));
    ctx.setF('p2', null, { ctrlKey: false, metaKey: true });
    const af = ctx._getActiveF();
    assert.ok(af.has('p1'));
    assert.ok(af.has('p2'));
  });

  // ── Disabled pill guard ───────────────────────────────────────────────────

  test('pill with disabled class (el.classList.contains pill-disabled) is a no-op', () => {
    ctx._setActiveF(new Set(['all']));
    // Simulate a real element whose classList.contains returns true for 'pill-disabled'
    const fakeEl = { classList: { contains: (c) => c === 'pill-disabled' } };
    ctx.setF('p1', fakeEl, { ctrlKey: false });
    // Should not change activeF
    assert.deepEqual([...ctx._getActiveF()], ['all']);
  });
});
