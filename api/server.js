import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, migrate } from './db.js';
import { taskInput, projectInput, validId } from './validation.js';

await migrate();
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', environment: process.env.APP_ENV || 'local' });
});
app.get('/api/projects', async (req, res) => {
  res.json((await pool.query('SELECT * FROM projects ORDER BY id')).rows);
});
app.post('/api/projects', async (req, res) => {
  const data = projectInput(req.body);
  res.status(201).json((await pool.query('INSERT INTO projects (name, color) VALUES ($1, $2) RETURNING *', [data.name, data.color])).rows[0]);
});
app.patch('/api/projects/:id', async (req, res) => {
  const id = validId(req.params.id);
  const data = projectInput(req.body);
  const { rows } = await pool.query('UPDATE projects SET name = $1, color = $2 WHERE id = $3 RETURNING *', [data.name, data.color, id]);
  if (!rows.length) return res.status(404).json({ error: 'Project not found.' });
  res.json(rows[0]);
});
app.get('/api/tasks', async (req, res) => {
  res.json((await pool.query('SELECT * FROM tasks WHERE deleted_at IS NULL ORDER BY id DESC')).rows);
});
app.post('/api/tasks', async (req, res) => {
  const data = taskInput(req.body);
  const { rows } = await pool.query(`INSERT INTO tasks (title, description, due_date, priority, project_id, completed, completed_at)
    VALUES ($1, $2, $3, $4, $5, $6, CASE WHEN $6 THEN now() ELSE NULL END) RETURNING *`,
  [data.title, data.description || '', data.due_date || null, data.priority || 4, data.project_id || null, data.completed || false]);
  res.status(201).json(rows[0]);
});
app.patch('/api/tasks/:id', async (req, res) => {
  const id = validId(req.params.id);
  const data = taskInput(req.body, true);
  // Keys come exclusively from taskInput's allowlist, never from arbitrary input.
  const keys = Object.keys(data);
  const assignments = keys.map((key, index) => `${key} = $${index + 1}`);
  if ('completed' in data) assignments.push(`completed_at = ${data.completed ? 'now()' : 'NULL'}`);
  const { rows } = await pool.query(`UPDATE tasks SET ${assignments.join(', ')} WHERE id = $${keys.length + 1} AND deleted_at IS NULL RETURNING *`, [...Object.values(data), id]);
  if (!rows.length) return res.status(404).json({ error: 'Task not found.' });
  res.json(rows[0]);
});
app.delete('/api/tasks/:id', async (req, res) => {
  const { rows } = await pool.query('UPDATE tasks SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id', [validId(req.params.id)]);
  if (!rows.length) return res.status(404).json({ error: 'Task not found.' });
  res.json({ id: rows[0].id });
});
app.post('/api/tasks/:id/restore', async (req, res) => {
  const { rows } = await pool.query('UPDATE tasks SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING *', [validId(req.params.id)]);
  if (!rows.length) return res.status(404).json({ error: 'Deleted task not found.' });
  res.json(rows[0]);
});
app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint not found.' }));
app.use(express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web/dist')));
app.use((error, req, res, next) => {
  console.error(error.message);
  if (error.code === '23503') return res.status(400).json({ error: 'That project no longer exists. Choose another project.' });
  const status = error.status === 400 ? 400 : error.status === 413 ? 413 : 500;
  res.status(status).json({ error: status === 400 ? (error.type === 'entity.parse.failed' ? 'Invalid JSON.' : error.message) : status === 413 ? 'Request too large.' : 'Request failed. Please try again.' });
});
const server = app.listen(3000, '0.0.0.0', () => console.log('Taskist listening on port 3000'));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => { await pool.end(); process.exit(0); });
    setTimeout(() => process.exit(1), 10000).unref();
  });
}
