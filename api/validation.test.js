import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskInput, projectInput, validId } from './validation.js';

test('task edits preserve absent fields and allow date/project clearing', () => {
  assert.deepEqual(taskInput({ completed: false }, true), { completed: false });
  assert.deepEqual(taskInput({ due_date: null, project_id: null }, true), { due_date: null, project_id: null });
  assert.deepEqual(taskInput({ title: '  A task  ' }), { title: 'A task' });
});
test('calendar dates are validated without accepting impossible dates', () => {
  assert.equal(taskInput({ due_date: '2028-02-29' }, true).due_date, '2028-02-29');
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '0000-01-01', '', 'tomorrow', 42]) {
    assert.throws(() => taskInput({ due_date: date }, true));
  }
});
test('invalid and unrecognized edits are rejected', () => {
  for (const input of [{ title: ' ' }, { priority: 0 }, { priority: 5 }, { priority: '1' }, { completed: 'false' }, { description: 'a'.repeat(5001) }, { project_id: -1 }, { deleted_at: null }]) {
    assert.throws(() => taskInput(input, true));
  }
  assert.throws(() => taskInput(null));
  assert.throws(() => taskInput({}));
});
test('project and ID validation protects database constraints', () => {
  assert.deepEqual(projectInput({ name: ' Work ', color: '#db4035' }), { name: 'Work', color: '#db4035' });
  assert.throws(() => projectInput({ name: ' ', color: '#db4035' }));
  assert.throws(() => projectInput({ name: 'Work', color: 'red' }));
  for (const id of ['1 OR 1=1', 0, -1, 2.5, 2147483648]) assert.throws(() => validId(id));
});
