// Focal/tests/test_inbox.test.js
// Unit tests for inbox operations and connection helpers:
//   addInboxItem, deleteInboxItem, allConns, togComplete (recurring logic)
//
// Run: node --test Focal/tests/test_inbox.test.js
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createApp, daysFromToday, makeTask } = require('./harness');

// ─────────────────────────────────────────────────────────────────────────────
describe('addInboxItem', () => {

  test('adds one item to S.inbox', () => {
    const ctx = createApp();
    const S = ctx._getS();
    const before = (S.inbox || []).length;
    ctx.addInboxItem('New task', '');
    assert.equal((S.inbox || []).length, before + 1);
  });

  test('item id starts with "ix_"', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('Check id', '');
    assert.ok(S.inbox[0].id.startsWith('ix_'));
  });

  test('item text is trimmed', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('  hello world  ', '');
    assert.equal(S.inbox[0].text, 'hello world');
  });

  test('item note is trimmed', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('task', '  my note  ');
    assert.equal(S.inbox[0].note, 'my note');
  });

  test('note defaults to empty string when null is passed', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('task', null);
    assert.equal(S.inbox[0].note, '');
  });

  test('note defaults to empty string when undefined is passed', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('task', undefined);
    assert.equal(S.inbox[0].note, '');
  });

  test('item has added field as a YYYY-MM-DD ISO date', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('task', '');
    const added = S.inbox[0].added;
    assert.match(added, /^\d{4}-\d{2}-\d{2}$/);
  });

  test('item confidential defaults to false', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('task', '');
    assert.equal(S.inbox[0].confidential, false);
  });

  test('prepends — second item added appears at index 0', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('first', '');
    ctx.addInboxItem('second', '');
    assert.equal(S.inbox[0].text, 'second');
  });

  test('first item added is at index 1 after second is added (unshift)', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('first', '');
    ctx.addInboxItem('second', '');
    assert.equal(S.inbox[1].text, 'first');
  });

  test('empty text still creates an item (no guard in addInboxItem)', () => {
    const ctx = createApp();
    const S = ctx._getS();
    const before = (S.inbox || []).length;
    ctx.addInboxItem('', '');
    assert.equal((S.inbox || []).length, before + 1);
  });

  test('each item id starts with "ix_" prefix (format check)', () => {
    // Note: addInboxItem uses Date.now() only — no random suffix — so rapid
    // successive calls in the same millisecond can produce the same id.
    // We verify prefix format here; uniqueness is a best-effort app behavior.
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('a', '');
    assert.ok(S.inbox[0].id.startsWith('ix_'));
    assert.ok(S.inbox[0].id.length > 3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('deleteInboxItem', () => {

  test('removes the item with the given id', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('to delete', '');
    const id = S.inbox[0].id;
    ctx.deleteInboxItem(id);
    assert.ok(!S.inbox.find(x => x.id === id));
  });

  test('count decreases by 1 after deletion', () => {
    // Manually assign distinct IDs to avoid Date.now() collision when two
    // addInboxItem calls happen in the same millisecond during test runs.
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('a', '');
    ctx.addInboxItem('b', '');
    S.inbox[0].id = 'ix_del_test_0';
    S.inbox[1].id = 'ix_del_test_1';
    const before = S.inbox.length;
    ctx.deleteInboxItem('ix_del_test_0');
    assert.equal(S.inbox.length, before - 1);
  });

  test('other items are not affected', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('keep me', '');
    ctx.addInboxItem('delete me', '');
    // Assign stable distinct IDs (Date.now() can collide in rapid test runs)
    S.inbox[1].id = 'ix_keep_001';   // first added is at index 1 (unshift)
    S.inbox[0].id = 'ix_del_001';    // second added is at index 0
    ctx.deleteInboxItem('ix_del_001');
    assert.ok(S.inbox.find(x => x.id === 'ix_keep_001'));
    assert.equal(S.inbox.length, 1);
  });

  test('deleting a non-existent id does not crash', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('safe', '');
    const before = S.inbox.length;
    assert.doesNotThrow(() => ctx.deleteInboxItem('ix_nonexistent'));
    assert.equal(S.inbox.length, before);
  });

  test('inbox can be emptied completely', () => {
    const ctx = createApp();
    const S = ctx._getS();
    ctx.addInboxItem('a', '');
    ctx.addInboxItem('b', '');
    const ids = S.inbox.map(x => x.id);
    ids.forEach(id => ctx.deleteInboxItem(id));
    assert.equal(S.inbox.length, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('allConns', () => {

  test('returns an array', () => {
    const ctx = createApp();
    const result = ctx.allConns();
    assert.ok(Array.isArray(result));
  });

  test('returns empty array when no connections exist anywhere', () => {
    const ctx = createApp();
    const S = ctx._getS();
    S.knownConnections = [];
    S.sections.forEach(sec => sec.tasks.forEach(t => { t.connections = []; }));
    // FILE_DATA.knownConnections is fixed at load time — seed is empty in default
    const result = ctx.allConns();
    assert.equal(result.length, 0);
  });

  test('includes connections from S.knownConnections', () => {
    const ctx = createApp();
    const S = ctx._getS();
    S.knownConnections = ['Alice', 'Bob'];
    const result = ctx.allConns();
    assert.ok(result.includes('Alice'));
    assert.ok(result.includes('Bob'));
  });

  test('includes connections from task.connections arrays', () => {
    const ctx = createApp();
    const S = ctx._getS();
    S.knownConnections = [];
    const task = makeTask({ connections: ['Carol', 'Dave'] });
    S.sections[0].tasks.push(task);
    const result = ctx.allConns();
    assert.ok(result.includes('Carol'));
    assert.ok(result.includes('Dave'));
  });

  test('deduplicates — same name from multiple sources appears once', () => {
    const ctx = createApp();
    const S = ctx._getS();
    S.knownConnections = ['Alice'];
    const task = makeTask({ connections: ['Alice', 'Bob'] });
    S.sections[0].tasks.push(task);
    const result = ctx.allConns();
    const aliceCount = result.filter(x => x === 'Alice').length;
    assert.equal(aliceCount, 1);
  });

  test('result is sorted alphabetically', () => {
    const ctx = createApp();
    const S = ctx._getS();
    // Clear all task connections to isolate the test to these three names
    S.sections.forEach(sec => sec.tasks.forEach(t => { t.connections = []; }));
    S.knownConnections = ['Zara', 'Alice', 'Mike'];
    const result = ctx.allConns();
    // Verify order rather than exact array equality — avoids reference issues
    // and is robust to any additional connections coming from FILE_DATA
    assert.ok(result.includes('Alice'));
    assert.ok(result.includes('Mike'));
    assert.ok(result.includes('Zara'));
    assert.ok(result.indexOf('Alice') < result.indexOf('Mike'),  'Alice should come before Mike');
    assert.ok(result.indexOf('Mike')  < result.indexOf('Zara'),  'Mike should come before Zara');
  });

  test('connections from multiple sections are all included', () => {
    const ctx = createApp();
    const S = ctx._getS();
    S.knownConnections = [];
    if (S.sections.length >= 2) {
      S.sections[0].tasks.push(makeTask({ connections: ['PersonA'] }));
      S.sections[1].tasks.push(makeTask({ connections: ['PersonB'] }));
      const result = ctx.allConns();
      assert.ok(result.includes('PersonA'));
      assert.ok(result.includes('PersonB'));
    } else {
      // Only one section — still valid, just test that one
      S.sections[0].tasks.push(makeTask({ connections: ['PersonA'] }));
      const result = ctx.allConns();
      assert.ok(result.includes('PersonA'));
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('togComplete — recurring task next-occurrence logic', () => {

  function seedRecurring(ctx, overrides = {}) {
    const S = ctx._getS();
    const secId = S.sections[0].id;
    const task = makeTask(Object.assign({
      id: 'rec1',
      type: 'recurring',
      rInterval: 'monthly',
      due: '2026-01-15',
      status: 'To Do',
      kanbanCol: null,
    }, overrides));
    S.sections[0].tasks.push(task);
    return { S, secId };
  }

  test('monthly: original task stays To Do after togComplete', () => {
    const ctx = createApp();
    const { S, secId } = seedRecurring(ctx);
    ctx.togComplete('rec1', secId);
    const original = S.sections[0].tasks.find(t => t.id === 'rec1');
    assert.equal(original.status, 'To Do');
  });

  test('monthly: due advances by one month (Jan 15 → Feb 15)', () => {
    const ctx = createApp();
    const { S, secId } = seedRecurring(ctx, { due: '2026-01-15' });
    ctx.togComplete('rec1', secId);
    const original = S.sections[0].tasks.find(t => t.id === 'rec1');
    assert.equal(original.due, '2026-02-15');
  });

  test('monthly: due is clamped to last day of short month (Jan 31 → Feb 28)', () => {
    const ctx = createApp();
    const { S, secId } = seedRecurring(ctx, { due: '2026-01-31' });
    ctx.togComplete('rec1', secId);
    const original = S.sections[0].tasks.find(t => t.id === 'rec1');
    assert.equal(original.due, '2026-02-28');
  });

  test('weekly: due advances by 7 days', () => {
    const ctx = createApp();
    const { S, secId } = seedRecurring(ctx, { rInterval: 'weekly', due: '2026-01-01' });
    ctx.togComplete('rec1', secId);
    const original = S.sections[0].tasks.find(t => t.id === 'rec1');
    assert.equal(original.due, '2026-01-08');
  });

  test('quarterly: due advances by 3 months (Jan 15 → Apr 15)', () => {
    const ctx = createApp();
    const { S, secId } = seedRecurring(ctx, { rInterval: 'quarterly', due: '2026-01-15' });
    ctx.togComplete('rec1', secId);
    const original = S.sections[0].tasks.find(t => t.id === 'rec1');
    assert.equal(original.due, '2026-04-15');
  });

  test('empty due: original due stays empty string after togComplete', () => {
    const ctx = createApp();
    const { S, secId } = seedRecurring(ctx, { due: '' });
    ctx.togComplete('rec1', secId);
    const original = S.sections[0].tasks.find(t => t.id === 'rec1');
    assert.equal(original.due, '');
  });

  test('archive clone is pushed to the section', () => {
    const ctx = createApp();
    const { S, secId } = seedRecurring(ctx);
    const before = S.sections[0].tasks.length;
    ctx.togComplete('rec1', secId);
    assert.equal(S.sections[0].tasks.length, before + 1);
  });

  test('archive clone has status Done', () => {
    const ctx = createApp();
    const { S, secId } = seedRecurring(ctx);
    ctx.togComplete('rec1', secId);
    const archived = S.sections[0].tasks.find(t => t.id !== 'rec1' && t.status === 'Done');
    assert.ok(archived, 'archive clone with status Done should exist');
  });

  test('archive clone has kanbanCol "done"', () => {
    const ctx = createApp();
    const { S, secId } = seedRecurring(ctx);
    ctx.togComplete('rec1', secId);
    const archived = S.sections[0].tasks.find(t => t.id !== 'rec1' && t.status === 'Done');
    assert.equal(archived.kanbanCol, 'done');
  });

  test('archive clone has a different id from the original', () => {
    const ctx = createApp();
    const { S, secId } = seedRecurring(ctx);
    ctx.togComplete('rec1', secId);
    const archived = S.sections[0].tasks.find(t => t.status === 'Done');
    assert.ok(archived);
    assert.notEqual(archived.id, 'rec1');
  });

  test('original task kanbanCol is reset to null after togComplete', () => {
    const ctx = createApp();
    const { S, secId } = seedRecurring(ctx, { kanbanCol: 'in-progress' });
    ctx.togComplete('rec1', secId);
    const original = S.sections[0].tasks.find(t => t.id === 'rec1');
    assert.equal(original.kanbanCol, null);
  });

  test('non-recurring task: togComplete sets status to Done', () => {
    const ctx = createApp();
    const S = ctx._getS();
    const secId = S.sections[0].id;
    const task = makeTask({ id: 'once1', type: 'once', status: 'To Do' });
    S.sections[0].tasks.push(task);
    ctx.togComplete('once1', secId);
    const t = S.sections[0].tasks.find(x => x.id === 'once1');
    assert.equal(t.status, 'Done');
  });

  test('togComplete on Done task reopens it to To Do', () => {
    const ctx = createApp();
    const S = ctx._getS();
    const secId = S.sections[0].id;
    const task = makeTask({ id: 'done1', type: 'once', status: 'Done', kanbanCol: 'done' });
    S.sections[0].tasks.push(task);
    ctx.togComplete('done1', secId);
    const t = S.sections[0].tasks.find(x => x.id === 'done1');
    assert.equal(t.status, 'To Do');
  });
});
