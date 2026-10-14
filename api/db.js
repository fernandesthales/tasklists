import pg from 'pg';
import { readFile } from 'node:fs/promises';

// A date belongs to the user's calendar, not to a UTC timestamp.
pg.types.setTypeParser(1082, value => value);
export const pool = new pg.Pool();

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(7142026)');
    await client.query(`CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
      completed BOOLEAN NOT NULL DEFAULT false
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const { rowCount } = await client.query('SELECT version FROM schema_migrations WHERE version = 1');
    if (!rowCount) {
      const sql = await readFile(new URL('./migrations/001-task-workspace.sql', import.meta.url), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES (1)');
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
