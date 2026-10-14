export class InputError extends Error {
  constructor(message) { super(message); this.status = 400; }
}
export function validId(value) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > 2147483647) throw new InputError('Invalid ID.');
  return Number(value);
}
export function taskInput(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new InputError('A task is required.');
  const data = {};
  if (!partial || 'title' in body) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.trim().length > 200) throw new InputError('Task name must be 1–200 characters.');
    data.title = body.title.trim();
  }
  if ('description' in body) {
    if (typeof body.description !== 'string' || body.description.length > 5000) throw new InputError('Description must be under 5,000 characters.');
    data.description = body.description;
  }
  if ('priority' in body) {
    if (!Number.isInteger(body.priority) || body.priority < 1 || body.priority > 4) throw new InputError('Priority must be between 1 and 4.');
    data.priority = body.priority;
  }
  if ('due_date' in body) {
    const date = body.due_date;
    if (date !== null) {
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '0001-01-01') throw new InputError('Choose a valid date.');
      const parsed = new Date(`${date}T12:00:00Z`);
      if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new InputError('Choose a valid date.');
    }
    data.due_date = date;
  }
  if ('project_id' in body) data.project_id = body.project_id === null ? null : validId(body.project_id);
  if ('completed' in body) {
    if (typeof body.completed !== 'boolean') throw new InputError('Completed must be true or false.');
    data.completed = body.completed;
  }
  if (partial && !Object.keys(data).length) throw new InputError('No task changes provided.');
  return data;
}
export function projectInput(body) {
  if (typeof body?.name !== 'string' || !body.name.trim() || body.name.trim().length > 80) throw new InputError('Project name must be 1–80 characters.');
  if (typeof body.color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(body.color)) throw new InputError('Choose a valid project color.');
  return { name: body.name.trim(), color: body.color };
}
