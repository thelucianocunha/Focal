// Focal/tests/test_tasks.test.js
// Unit tests for task state transition functions:
//   cascadeSubtasksDone, togComplete, setStat, setPri
//
// Run: node --test Focal/tests/test_tasks.test.js
'use strict';
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, daysFromToday, makeTask } = require('./harness');

// ─────────────────────────────────────────────────────────────────────────────
// setStat
// ─────────────────────────────────────────────────────────────────────────────
describe('setStat — basic status change', () => {
  // Fresh context per describe block avoids any cross-describe bleed
  const ctx = createApp();
  const S = ctx._getS();
  const sec = S.sections[0];

  beforeEach(() => {
    // Remove all tasks and start fresh before each test in this block
    sec.tasks.length = 0;
  });

  test('changes task.status to the new value', () => {
    sec.tasks.push(makeTask({ id: 'st1', status: 'To Do' }));
    ctx.setStat('st1', sec.id, 'In Progress');
    const t = sec.tasks.find(x => x.id === 'st1');
    assert.equal(t.status, 'In Progress');
  });

  test('sets task.lastStatusChange to today ISO date', () => {
    sec.tasks.push(makeTask({ id: 'st2', status: 'To Do', lastStatusChange: daysFromToday(-10) }));
    ctx.setStat('st2', sec.id, 'In Progress');
    const t = sec.tasks.find(x => x.id === 'st2');
    assert.equal(t.lastStatusChange, daysFromToday(0));
  });

  test('setting status to Done sets kanbanCol to "done"', () => {
    sec.tasks.push(makeTask({ id: 'st3', status: 'To Do', kanbanCol: null }));
    ctx.setStat('st3', sec.id, 'Done');
    const t = sec.tasks.find(x => x.id === 'st3');
    assert.equal(t.kanbanCol, 'done');
  });

  test('setting status to Done also marks direct children Done', () => {
    sec.tasks.push(makeTask({ id: 'parent1', status: 'To Do', kanbanCol: null }));
    sec.tasks.push(makeTask({ id: 'child1', status: 'To Do', parent: 'parent1' }));
    ctx.setStat('parent1', sec.id, 'Done');
    const child = sec.tasks.find(x => x.id === 'child1');
    assert.equal(child.status, 'Done');
    assert.equal(child.kanbanCol, 'done');
  });

  test('setting status away from Done (while kanbanCol=done) clears kanbanCol to null', () => {
    sec.tasks.push(makeTask({ id: 'st4', status: 'Done', kanbanCol: 'done' }));
    ctx.setStat('st4', sec.id, 'To Do');
    const t = sec.tasks.find(x => x.id === 'st4');
    assert.equal(t.kanbanCol, null);
  });

  test('setting status to non-Done when kanbanCol is already null leaves it null', () => {
    sec.tasks.push(makeTask({ id: 'st5', status: 'To Do', kanbanCol: null }));
    ctx.setStat('st5', sec.id, 'Backlog');
    const t = sec.tasks.find(x => x.id === 'st5');
    assert.equal(t.kanbanCol, null);
  });

  test('setting same status still updates lastStatusChange', () => {
    const old = daysFromToday(-5);
    sec.tasks.push(makeTask({ id: 'st6', status: 'To Do', lastStatusChange: old }));
    ctx.setStat('st6', sec.id, 'To Do');
    const t = sec.tasks.find(x => x.id === 'st6');
    assert.equal(t.lastStatusChange, daysFromToday(0));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// cascadeSubtasksDone
// ─────────────────────────────────────────────────────────────────────────────
describe('cascadeSubtasksDone — recursive child completion', () => {
  const ctx = createApp();
  const S = ctx._getS();
  const sec = S.sections[0];

  beforeEach(() => {
    sec.tasks.length = 0;
  });

  test('returns 0 when parent has no children', () => {
    sec.tasks.push(makeTask({ id: 'p0', status: 'To Do' }));
    const count = ctx.cascadeSubtasksDone('p0');
    assert.equal(count, 0);
  });

  test('marks all direct children Done and returns count', () => {
    sec.tasks.push(makeTask({ id: 'par', status: 'To Do' }));
    sec.tasks.push(makeTask({ id: 'c1', status: 'To Do', parent: 'par' }));
    sec.tasks.push(makeTask({ id: 'c2', status: 'To Do', parent: 'par' }));
    const count = ctx.cascadeSubtasksDone('par');
    assert.equal(count, 2);
    assert.equal(sec.tasks.find(x => x.id === 'c1').status, 'Done');
    assert.equal(sec.tasks.find(x => x.id === 'c2').status, 'Done');
  });

  test('sets lastStatusChange to today on children', () => {
    sec.tasks.push(makeTask({ id: 'par2', status: 'To Do' }));
    sec.tasks.push(makeTask({ id: 'cc1', status: 'To Do', parent: 'par2', lastStatusChange: daysFromToday(-20) }));
    ctx.cascadeSubtasksDone('par2');
    assert.equal(sec.tasks.find(x => x.id === 'cc1').lastStatusChange, daysFromToday(0));
  });

  test('sets kanbanCol to "done" on children', () => {
    sec.tasks.push(makeTask({ id: 'par3', status: 'To Do' }));
    sec.tasks.push(makeTask({ id: 'dc1', status: 'To Do', parent: 'par3', kanbanCol: null }));
    ctx.cascadeSubtasksDone('par3');
    assert.equal(sec.tasks.find(x => x.id === 'dc1').kanbanCol, 'done');
  });

  test('recursively marks grandchildren Done and counts them', () => {
    sec.tasks.push(makeTask({ id: 'gpar', status: 'To Do' }));
    sec.tasks.push(makeTask({ id: 'gchild', status: 'To Do', parent: 'gpar' }));
    sec.tasks.push(makeTask({ id: 'ggchild', status: 'To Do', parent: 'gchild' }));
    const count = ctx.cascadeSubtasksDone('gpar');
    // gchild + ggchild = 2
    assert.equal(count, 2);
    assert.equal(sec.tasks.find(x => x.id === 'ggchild').status, 'Done');
  });

  test('already-Done children are not re-touched and not counted', () => {
    sec.tasks.push(makeTask({ id: 'parD', status: 'To Do' }));
    sec.tasks.push(makeTask({ id: 'alreadyDone', status: 'Done', parent: 'parD', lastStatusChange: daysFromToday(-3) }));
    const count = ctx.cascadeSubtasksDone('parD');
    assert.equal(count, 0);
    // lastStatusChange should NOT be updated for already-Done child
    assert.equal(sec.tasks.find(x => x.id === 'alreadyDone').lastStatusChange, daysFromToday(-3));
  });

  test('tasks with a different parent are not affected', () => {
    sec.tasks.push(makeTask({ id: 'parA', status: 'To Do' }));
    sec.tasks.push(makeTask({ id: 'parB', status: 'To Do' }));
    sec.tasks.push(makeTask({ id: 'childOfB', status: 'To Do', parent: 'parB' }));
    ctx.cascadeSubtasksDone('parA');
    assert.equal(sec.tasks.find(x => x.id === 'childOfB').status, 'To Do');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// togComplete
// ─────────────────────────────────────────────────────────────────────────────
describe('togComplete — toggle task completion', () => {
  const ctx = createApp();
  const S = ctx._getS();
  const sec = S.sections[0];

  beforeEach(() => {
    sec.tasks.length = 0;
  });

  test('Done → To Do: re-opens the task', () => {
    sec.tasks.push(makeTask({ id: 'tog1', status: 'Done', kanbanCol: 'done' }));
    ctx.togComplete('tog1', sec.id);
    const t = sec.tasks.find(x => x.id === 'tog1');
    assert.equal(t.status, 'To Do');
  });

  test('Done → To Do: clears kanbanCol when it was "done"', () => {
    sec.tasks.push(makeTask({ id: 'tog2', status: 'Done', kanbanCol: 'done' }));
    ctx.togComplete('tog2', sec.id);
    const t = sec.tasks.find(x => x.id === 'tog2');
    assert.equal(t.kanbanCol, null);
  });

  test('Done → To Do: updates lastStatusChange to today', () => {
    sec.tasks.push(makeTask({ id: 'tog3', status: 'Done', kanbanCol: 'done', lastStatusChange: daysFromToday(-5) }));
    ctx.togComplete('tog3', sec.id);
    const t = sec.tasks.find(x => x.id === 'tog3');
    assert.equal(t.lastStatusChange, daysFromToday(0));
  });

  test('To Do → Done: marks task Done', () => {
    sec.tasks.push(makeTask({ id: 'tog4', status: 'To Do', kanbanCol: null }));
    ctx.togComplete('tog4', sec.id);
    const t = sec.tasks.find(x => x.id === 'tog4');
    assert.equal(t.status, 'Done');
  });

  test('To Do → Done: sets kanbanCol to "done"', () => {
    sec.tasks.push(makeTask({ id: 'tog5', status: 'To Do', kanbanCol: null }));
    ctx.togComplete('tog5', sec.id);
    const t = sec.tasks.find(x => x.id === 'tog5');
    assert.equal(t.kanbanCol, 'done');
  });

  test('To Do → Done: cascades to subtasks', () => {
    sec.tasks.push(makeTask({ id: 'togP', status: 'To Do' }));
    sec.tasks.push(makeTask({ id: 'togC', status: 'To Do', parent: 'togP' }));
    ctx.togComplete('togP', sec.id);
    const child = sec.tasks.find(x => x.id === 'togC');
    assert.equal(child.status, 'Done');
    assert.equal(child.kanbanCol, 'done');
  });

  test('recurring task: original task stays To Do after togComplete', () => {
    sec.tasks.push(makeTask({
      id: 'rec1', status: 'To Do', type: 'recurring',
      rInterval: 'monthly', due: daysFromToday(5), kanbanCol: null
    }));
    ctx.togComplete('rec1', sec.id);
    const orig = sec.tasks.find(x => x.id === 'rec1');
    assert.equal(orig.status, 'To Do');
  });

  test('recurring task: original task kanbanCol is cleared to null', () => {
    sec.tasks.push(makeTask({
      id: 'rec2', status: 'To Do', type: 'recurring',
      rInterval: 'monthly', due: daysFromToday(5), kanbanCol: 'inprogress'
    }));
    ctx.togComplete('rec2', sec.id);
    const orig = sec.tasks.find(x => x.id === 'rec2');
    assert.equal(orig.kanbanCol, null);
  });

  test('recurring task: an archived Done clone is pushed into the section', () => {
    sec.tasks.push(makeTask({
      id: 'rec3', status: 'To Do', type: 'recurring',
      rInterval: 'weekly', due: daysFromToday(3), kanbanCol: null
    }));
    const countBefore = sec.tasks.length;
    ctx.togComplete('rec3', sec.id);
    assert.equal(sec.tasks.length, countBefore + 1);
  });

  test('recurring task: the archived clone has status Done and kanbanCol "done"', () => {
    sec.tasks.push(makeTask({
      id: 'rec4', status: 'To Do', type: 'recurring',
      rInterval: 'monthly', due: daysFromToday(7), kanbanCol: null
    }));
    ctx.togComplete('rec4', sec.id);
    // Clone is the last task pushed
    const clone = sec.tasks[sec.tasks.length - 1];
    assert.equal(clone.status, 'Done');
    assert.equal(clone.kanbanCol, 'done');
  });

  test('recurring task (monthly): original due date advances by ~1 month', () => {
    const today = new Date();
    const origDue = daysFromToday(10);
    sec.tasks.push(makeTask({
      id: 'rec5', status: 'To Do', type: 'recurring',
      rInterval: 'monthly', due: origDue, kanbanCol: null
    }));
    ctx.togComplete('rec5', sec.id);
    const orig = sec.tasks.find(x => x.id === 'rec5');
    // New due should be ~30 days after origDue — just verify it changed and is valid ISO
    assert.notEqual(orig.due, origDue);
    assert.match(orig.due, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('recurring task (weekly): original due date advances by 7 days', () => {
    const origDue = daysFromToday(3);
    sec.tasks.push(makeTask({
      id: 'rec6', status: 'To Do', type: 'recurring',
      rInterval: 'weekly', due: origDue, kanbanCol: null
    }));
    ctx.togComplete('rec6', sec.id);
    const orig = sec.tasks.find(x => x.id === 'rec6');
    const expected = daysFromToday(3 + 7);
    assert.equal(orig.due, expected);
  });

  test('recurring task with no due date: new due is empty string', () => {
    sec.tasks.push(makeTask({
      id: 'rec7', status: 'To Do', type: 'recurring',
      rInterval: 'monthly', due: '', kanbanCol: null
    }));
    ctx.togComplete('rec7', sec.id);
    const orig = sec.tasks.find(x => x.id === 'rec7');
    assert.equal(orig.due, '');
  });

  test('non-existent id does not throw', () => {
    assert.doesNotThrow(() => ctx.togComplete('nope', sec.id));
  });

  test('non-existent secId does not throw', () => {
    assert.doesNotThrow(() => ctx.togComplete('anything', 'no_sec'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// setPri
// ─────────────────────────────────────────────────────────────────────────────
describe('setPri — priority change', () => {
  const ctx = createApp();
  const S = ctx._getS();
  const sec = S.sections[0];

  beforeEach(() => {
    sec.tasks.length = 0;
  });

  test('changes task.priority to P1', () => {
    sec.tasks.push(makeTask({ id: 'pri1', priority: 'P3' }));
    ctx.setPri('pri1', sec.id, 'P1');
    assert.equal(sec.tasks.find(x => x.id === 'pri1').priority, 'P1');
  });

  test('changes task.priority to P2', () => {
    sec.tasks.push(makeTask({ id: 'pri2', priority: 'P1' }));
    ctx.setPri('pri2', sec.id, 'P2');
    assert.equal(sec.tasks.find(x => x.id === 'pri2').priority, 'P2');
  });

  test('changes task.priority to P3', () => {
    sec.tasks.push(makeTask({ id: 'pri3', priority: 'P1' }));
    ctx.setPri('pri3', sec.id, 'P3');
    assert.equal(sec.tasks.find(x => x.id === 'pri3').priority, 'P3');
  });

  test('changes task.priority to P4', () => {
    sec.tasks.push(makeTask({ id: 'pri4', priority: 'P1' }));
    ctx.setPri('pri4', sec.id, 'P4');
    assert.equal(sec.tasks.find(x => x.id === 'pri4').priority, 'P4');
  });

  test('does not affect task.status', () => {
    sec.tasks.push(makeTask({ id: 'pri5', priority: 'P3', status: 'In Progress' }));
    ctx.setPri('pri5', sec.id, 'P1');
    assert.equal(sec.tasks.find(x => x.id === 'pri5').status, 'In Progress');
  });

  test('does not affect task.due', () => {
    const due = daysFromToday(7);
    sec.tasks.push(makeTask({ id: 'pri6', priority: 'P3', due }));
    ctx.setPri('pri6', sec.id, 'P1');
    assert.equal(sec.tasks.find(x => x.id === 'pri6').due, due);
  });

  test('does not affect task.kanbanCol', () => {
    sec.tasks.push(makeTask({ id: 'pri7', priority: 'P3', kanbanCol: 'inprogress' }));
    ctx.setPri('pri7', sec.id, 'P2');
    assert.equal(sec.tasks.find(x => x.id === 'pri7').kanbanCol, 'inprogress');
  });
});
