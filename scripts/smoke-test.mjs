// Run inside the app container; this test cleans up only the records it creates.
import assert from 'node:assert/strict';
import { pool, migrate } from '/app/api/db.js';
const base = 'http://127.0.0.1:3000';
const ids = [];
let projectId;
async function call(endpoint, method = 'GET', body, expected = 200) {
  const response = await fetch(base + endpoint, { method, headers: { 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  assert.equal(response.status, expected, endpoint);
  return response.json();
}
try {
  const before = await call('/api/tasks');
  await migrate();
  assert.equal((await call('/api/tasks')).length, before.length, 'migration is idempotent');
  const project = await call('/api/projects', 'POST', { name: 'Smoke test project', color: '#4073c5' }, 201);
  projectId = project.id;
  const renamed = await call(`/api/projects/${projectId}`, 'PATCH', { name: 'Smoke test renamed', color: '#db4035' });
  assert.equal(renamed.name, 'Smoke test renamed');
  const task = await call('/api/tasks', 'POST', { title: 'Smoke test task', description: 'Persisted description', priority: 1, due_date: '2028-02-29', project_id: projectId }, 201);
  ids.push(task.id);
  assert.equal(task.due_date, '2028-02-29');
  assert.equal(task.project_id, projectId);
  const completed = await call(`/api/tasks/${task.id}`, 'PATCH', { completed: true });
  assert.equal(completed.completed, true);
  assert.ok(completed.completed_at);
  const reopened = await call(`/api/tasks/${task.id}`, 'PATCH', { completed: false, due_date: null, project_id: null });
  assert.equal(reopened.completed_at, null);
  assert.equal(reopened.due_date, null);
  assert.equal(reopened.project_id, null);
  assert.equal(reopened.description, 'Persisted description');
  await call(`/api/tasks/${task.id}`, 'PATCH', { due_date: '2026-02-30' }, 400);
  await call(`/api/tasks/${task.id}`, 'PATCH', { project_id: 2147483647 }, 400);
  await call(`/api/tasks/${task.id}`, 'DELETE');
  assert.ok(!(await call('/api/tasks')).some(item => item.id === task.id));
  const restored = await call(`/api/tasks/${task.id}/restore`, 'POST');
  assert.equal(restored.title, task.title);
  assert.ok((await call('/api/tasks')).some(item => item.id === task.id));
  await call('/api/tasks', 'POST', { title: ' ' }, 400);
  await call('/api/tasks/abc', 'PATCH', { completed: false }, 400);
  console.log('PASS: migration preservation/idempotence, projects, task CRUD, dates, priorities, completion, validation, deletion and restore.');
} finally {
  for (const id of ids) await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  if (projectId) await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
  await pool.end();
}
