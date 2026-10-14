CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  color TEXT NOT NULL DEFAULT '#808080' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE tasks
  ADD COLUMN description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 5000),
  ADD COLUMN due_date DATE,
  ADD COLUMN priority INTEGER NOT NULL DEFAULT 4 CHECK (priority BETWEEN 1 AND 4),
  ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN completed_at TIMESTAMPTZ,
  ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX tasks_project_idx ON tasks(project_id);
CREATE INDEX tasks_due_date_idx ON tasks(due_date) WHERE completed = false AND deleted_at IS NULL;
