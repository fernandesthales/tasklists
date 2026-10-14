import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const paths = {
  inbox: 'M4 4h16v16H4z M4 13h5l2 3h2l2-3h5',
  today: 'M5 5h14v15H5z M8 3v4 M16 3v4 M5 10h14 M9 14h2v2H9z',
  upcoming: 'M5 5h14v15H5z M8 3v4 M16 3v4 M5 10h14 M9 14l2 2 4-3',
  search: 'M16 16l5 5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  plus: 'M12 5v14 M5 12h14',
  check: 'M5 12l4 4L19 6',
  completed: 'M20 11v1a8 8 0 1 1-5-7 M9 10l3 3 8-8',
  filter: 'M4 6h16 M7 12h10 M10 18h4',
  flag: 'M5 21V4 M5 4c5-4 9 4 14 0v10c-5 4-9-4-14 0',
  hash: 'M9 3L7 21 M17 3l-2 18 M3 8h18 M2 16h18',
  chevron: 'M9 5l7 7-7 7',
  close: 'M6 6l12 12 M18 6L6 18',
  edit: 'M4 16v4h4L20 8l-4-4z M13 7l4 4',
  trash: 'M3 6h18 M9 6V3h6v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  all: 'M5 5h3v3H5z M12 6h8 M5 11h3v3H5z M12 12h8 M5 17h3v3H5z M12 18h8',
  sun: 'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  help: 'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
};
function Icon({ name, size = 20, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.all} /></svg>;
}
const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const plusDays = (date, days) => { const result = new Date(`${date}T12:00:00`); result.setDate(result.getDate() + days); return dateKey(result); };
function dateLabel(date, today) {
  if (date === today) return 'Today';
  if (date === plusDays(today, 1)) return 'Tomorrow';
  if (date === plusDays(today, -1)) return 'Yesterday';
  return new Date(`${date}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric', ...(date.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}) });
}
async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json' } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
const colors = ['#db4035', '#ff9933', '#e4b53e', '#6a9e64', '#14aaf5', '#4073c5', '#a970ff', '#e05194', '#808080'];
function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); dialog.querySelector('input:not([type="radio"]), textarea')?.focus(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="modal-heading"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
    {children}
  </dialog>;
}
function TaskEditor({ task, projects, onSave, onDelete, onClose }) {
  const [draft, setDraft] = useState({ title: '', description: '', priority: 4, ...task, due_date: task?.due_date || '', project_id: task?.project_id || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const change = (key, value) => setDraft(old => ({ ...old, [key]: value }));
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try { await onSave({ title: draft.title, description: draft.description, due_date: new FormData(event.currentTarget).get('due_date') || null, priority: Number(draft.priority), project_id: draft.project_id ? Number(draft.project_id) : null }); onClose(); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  async function remove() {
    setSaving(true); setError('');
    try { await onDelete(task); onClose(); } catch (e) { setError(e.message); setSaving(false); }
  }
  return <Modal title={task?.id ? 'Edit task' : 'Add task'} onClose={() => !saving && onClose()} wide>
    <form onSubmit={submit}>
      <div className="editor-body">
        <label className="sr-only" htmlFor="task-title">Task name</label>
        <input autoFocus id="task-title" className="task-name-input" placeholder="What would you like to do?" value={draft.title} onChange={e => change('title', e.target.value)} maxLength={200} required />
        <label className="sr-only" htmlFor="task-description">Description</label>
        <textarea id="task-description" placeholder="Description" value={draft.description} onChange={e => change('description', e.target.value)} maxLength={5000} rows={3} />
        <div className="editor-fields">
          <label><span><Icon name="today" size={16} /> Due date</span><input type="date" name="due_date" defaultValue={draft.due_date} min="0001-01-01" max="9999-12-31" /></label>
          <label><span><Icon name="flag" size={16} /> Priority</span><select value={draft.priority} onChange={e => change('priority', e.target.value)}><option value="4">P4 · No priority</option><option value="1">P1 · Urgent</option><option value="2">P2 · High</option><option value="3">P3 · Medium</option></select></label>
        </div>
        <label className="project-select"><span>Project</span><select value={draft.project_id} onChange={e => change('project_id', e.target.value)}><option value="">Inbox</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        {error && <p role="alert" className="error">{error}</p>}
      </div>
      <div className="modal-footer">{task?.id && <button type="button" className="delete-button" disabled={saving} onClick={remove}><Icon name="trash" size={17} /> Delete</button>}<div className="footer-actions"><button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancel</button><button className="primary" disabled={saving || !draft.title.trim()}>{saving ? 'Saving…' : task?.id ? 'Save changes' : 'Add task'}</button></div></div>
    </form>
  </Modal>;
}
function ProjectEditor({ project, onSave, onClose }) {
  const [name, setName] = useState(project?.name || '');
  const [color, setColor] = useState(project?.color || colors[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try { await onSave({ name, color }); onClose(); } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  return <Modal title={project?.id ? 'Edit project' : 'Add project'} onClose={() => !saving && onClose()}><form onSubmit={submit}>
    <div className="editor-body"><label className="field-label" htmlFor="project-name">Name</label><input id="project-name" autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="e.g. Work, Personal, A big idea" required />
    <fieldset className="color-picker"><legend>Color</legend>{colors.map(value => <label key={value} style={{ '--project-color': value }}><input type="radio" name="color" value={value} checked={color === value} onChange={() => setColor(value)} aria-label={`Color ${value}`} /><span>{color === value && <Icon name="check" size={15} />}</span></label>)}</fieldset>
    <p className="muted small">Give your tasks a home. Projects keep the different parts of your life organized.</p>{error && <p role="alert" className="error">{error}</p>}</div>
    <div className="modal-footer"><div className="footer-actions"><button type="button" className="secondary" disabled={saving} onClick={onClose}>Cancel</button><button className="primary" disabled={saving || !name.trim()}>{saving ? 'Saving…' : project?.id ? 'Save changes' : 'Add project'}</button></div></div>
  </form></Modal>;
}
function EmptyArt() {
  return <svg className="empty-art" width="190" height="150" viewBox="0 0 190 150" fill="none" aria-hidden="true"><ellipse cx="95" cy="131" rx="64" ry="7" fill="#f3ede7" /><circle cx="95" cy="73" r="57" fill="#faf4ee" /><path d="M41 82l12-46 88 8-11 73-81-9z" fill="#eddfce" /><rect x="54" y="34" width="83" height="83" rx="5" transform="rotate(7 54 34)" fill="white" stroke="#dfcbb8" /><path d="M71 59l4 5 8-8 M68 81l4 5 8-8" stroke="#d44b3e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M91 63l26 3 M88 85l23 3 M65 101l43 5" stroke="#e2d7cb" strokeWidth="3" strokeLinecap="round" /><path d="M140 98c1-20 12-27 17-34 4 14-3 27-17 34z" fill="#829a7b" /><path d="M140 110c-15-4-18-12-23-19 14-2 23 5 23 19z" fill="#a4b599" /><path d="M140 126V93" stroke="#78926f" strokeWidth="2" /><path d="M32 47v9 M28 51h8 M145 27v9 M141 31h8" stroke="#d5b98f" strokeWidth="2" strokeLinecap="round" /></svg>;
}
const views = [
  { id: 'inbox', title: 'Inbox', icon: 'inbox' },
  { id: 'today', title: 'Today', icon: 'today' },
  { id: 'upcoming', title: 'Upcoming', icon: 'upcoming' },
  { id: 'priority', title: 'Priorities', icon: 'flag' },
  { id: 'all', title: 'All tasks', icon: 'all' },
  { id: 'completed', title: 'Completed', icon: 'completed' },
];
function App() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [environment, setEnvironment] = useState('');
  const [view, setView] = useState('inbox');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('priority');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [projectEditor, setProjectEditor] = useState(null);
  const [help, setHelp] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pending, setPending] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [today, setToday] = useState(dateKey());
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(null);
  const searchRef = useRef(null);
  useEffect(() => { load(); const timer = setInterval(() => setToday(dateKey()), 60000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (!toast || toast.undo) return; const timeout = setTimeout(() => setToast(null), 5000); return () => clearTimeout(timeout); }, [toast]);
  useEffect(() => {
    function shortcut(event) {
      if (document.querySelector('dialog[open]')) return;
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); setSidebarOpen(true); requestAnimationFrame(() => searchRef.current?.focus()); return; }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'q' && !loading) { event.preventDefault(); openNew(); }
      if (event.key === '/') { event.preventDefault(); setSidebarOpen(true); requestAnimationFrame(() => searchRef.current?.focus()); }
    }
    document.addEventListener('keydown', shortcut); return () => document.removeEventListener('keydown', shortcut);
  }, [view, selectedDate, today, loading]);
  async function load() {
    setLoading(true); setError('');
    try { const [items, groups, health] = await Promise.all([request('/api/tasks'), request('/api/projects'), request('/api/health')]); setTasks(items); setProjects(groups); setEnvironment(health.environment); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  const project = projects.find(item => `project:${item.id}` === view);
  const active = tasks.filter(task => !task.completed);
  const searching = !!search.trim();
  const pageTitle = searching ? 'Search results' : project?.name || views.find(item => item.id === view)?.title || 'Inbox';
  function navigate(next) { setView(next); setSearch(''); setSidebarOpen(false); setSelectedDate(null); setCalendarOffset(0); }
  function openNew() { setSidebarOpen(false); setEditor({ priority: view === 'priority' ? 1 : 4, project_id: project?.id || null, due_date: view === 'today' ? today : view === 'upcoming' ? selectedDate || today : null }); }
  function upsert(updated) { setTasks(items => items.some(item => item.id === updated.id) ? items.map(item => item.id === updated.id ? updated : item) : [updated, ...items]); }
  async function saveTask(data) {
    const result = await request(editor.id ? `/api/tasks/${editor.id}` : '/api/tasks', { method: editor.id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
    upsert(result); setToast({ message: editor.id ? 'Task updated' : 'Task added' });
  }
  async function toggle(task, forcedValue) {
    if (pending.has(task.id)) return;
    const completed = forcedValue ?? !task.completed;
    setPending(old => new Set(old).add(task.id));
    try { const updated = await request(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ completed }) }); upsert(updated); setToast(completed ? { message: 'Task completed. Nice work!', undo: () => toggle(updated, false) } : { message: 'Task reopened' }); }
    catch (e) { setError(e.message); } finally { setPending(old => { const next = new Set(old); next.delete(task.id); return next; }); }
  }
  async function deleteTask(task) {
    await request(`/api/tasks/${task.id}`, { method: 'DELETE' }); setTasks(items => items.filter(item => item.id !== task.id));
    setToast({ message: 'Task deleted', undo: async () => { const restored = await request(`/api/tasks/${task.id}/restore`, { method: 'POST' }); upsert(restored); setToast({ message: 'Task restored' }); } });
  }
  async function saveProject(data) {
    const result = await request(projectEditor.id ? `/api/projects/${projectEditor.id}` : '/api/projects', { method: projectEditor.id ? 'PATCH' : 'POST', body: JSON.stringify(data) });
    setProjects(items => items.some(item => item.id === result.id) ? items.map(item => item.id === result.id ? result : item) : [...items, result]);
    navigate(`project:${result.id}`); setToast({ message: projectEditor.id ? 'Project updated' : 'Project created' });
  }
  function matches(task) {
    if (searching) return `${task.title} ${task.description} ${projects.find(p => p.id === task.project_id)?.name || 'Inbox'}`.toLowerCase().includes(search.trim().toLowerCase());
    if (view === 'completed') return task.completed;
    if (task.completed) return false;
    if (project) return task.project_id === project.id;
    if (view === 'inbox') return task.project_id === null;
    if (view === 'today') return task.due_date && task.due_date <= today;
    if (view === 'upcoming') return task.due_date && (!selectedDate || task.due_date === selectedDate);
    if (view === 'priority') return task.priority <= 3;
    return true;
  }
  const visible = tasks.filter(matches).sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title);
    if (sort === 'date') return (a.due_date || '9999').localeCompare(b.due_date || '9999') || a.priority - b.priority;
    if (sort === 'newest') return b.id - a.id;
    return a.priority - b.priority || (a.due_date || '9999').localeCompare(b.due_date || '9999') || a.id - b.id;
  });
  const groups = new Map();
  for (const task of visible) {
    let key = '';
    if (!searching && view === 'today') key = task.due_date < today ? 'Overdue' : 'Today';
    if (!searching && view === 'upcoming') key = task.due_date < today ? 'Overdue' : task.due_date;
    if (!searching && view === 'priority') key = `Priority ${task.priority}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(task);
  }
  const grouped = [...groups.entries()].sort(([a], [b]) => a === 'Overdue' ? -1 : b === 'Overdue' ? 1 : a.localeCompare(b));
  const countFor = id => id === 'inbox' ? active.filter(t => t.project_id === null).length : id === 'today' ? active.filter(t => t.due_date && t.due_date <= today).length : null;
  const doneToday = tasks.filter(task => task.completed && task.completed_at && dateKey(new Date(task.completed_at)) === today).length;
  function TaskRow({ task }) {
    const taskProject = projects.find(item => item.id === task.project_id);
    return <li className={`task-row priority-${task.priority} ${task.completed ? 'is-completed' : ''}`}>
      <button className="task-check" aria-label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`} disabled={pending.has(task.id)} onClick={() => toggle(task)}><Icon name="check" size={13} /></button>
      <button className="task-content" onClick={() => setEditor(task)} aria-label={`Edit ${task.title}`}><span className="task-title">{task.title}</span>{task.description && <span className="task-description">{task.description}</span>}
        <span className="task-meta">{task.due_date && <span className={`due ${task.due_date < today && !task.completed ? 'overdue' : task.due_date === today ? 'due-today' : ''}`}><Icon name="today" size={13} />{dateLabel(task.due_date, today)}</span>}{task.priority < 4 && <span className="priority-label"><Icon name="flag" size={12} /> P{task.priority}</span>}{taskProject && <span className="task-project"><span style={{ color: taskProject.color }}>#</span> {taskProject.name}</span>}</span>
      </button><button className="row-edit icon-button" aria-label={`Open details for ${task.title}`} onClick={() => setEditor(task)}><Icon name="edit" size={16} /></button>
    </li>;
  }
  return <div className="app-shell">
    {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
    <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Icon name="check" size={23} /></span><strong>taskist<span className="brand-dot">.</span></strong><button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><Icon name="close" /></button></div>
      <div className="workspace"><span className="avatar">M</span><span>My workspace<small>Personal</small></span><span className="workspace-dot" title="Personal workspace" /></div>
      <button className="quick-add" onClick={openNew} disabled={loading}><span className="plus-disc"><Icon name="plus" size={17} /></span>Add task<kbd>Q</kbd></button>
      <div className="search-box"><Icon name="search" size={18} /><input ref={searchRef} aria-label="Search tasks" placeholder="Search" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setSearch(''); event.target.blur(); } if (event.key === 'Enter') setSidebarOpen(false); }} />{search ? <button className="icon-button" aria-label="Clear search" onClick={() => setSearch('')}><Icon name="close" size={14} /></button> : <kbd>⌘ K</kbd>}</div>
      <nav aria-label="Task views">{views.map(item => <button key={item.id} className={`nav-item ${!searching && view === item.id ? 'selected' : ''}`} onClick={() => navigate(item.id)} aria-current={!searching && view === item.id ? 'page' : undefined}><Icon name={item.icon} /><span>{item.title}</span>{countFor(item.id) > 0 && <span className="nav-count">{countFor(item.id)}</span>}</button>)}</nav>
      <div className="projects-heading"><span>My projects</span><button className="icon-button" aria-label="Add project" disabled={loading} onClick={() => { setSidebarOpen(false); setProjectEditor({}); }}><Icon name="plus" size={18} /></button></div>
      <nav aria-label="Projects" className="project-nav">{projects.map(item => <button key={item.id} className={`nav-item ${!searching && project?.id === item.id ? 'selected' : ''}`} onClick={() => navigate(`project:${item.id}`)} aria-current={!searching && project?.id === item.id ? 'page' : undefined}><Icon name="hash" style={{ color: item.color }} /><span>{item.name}</span><span className="nav-count">{active.filter(task => task.project_id === item.id).length || ''}</span></button>)}{!projects.length && <button className="new-project" disabled={loading} onClick={() => { setSidebarOpen(false); setProjectEditor({}); }}><Icon name="plus" size={16} /> Create your first project</button>}</nav>
      <div className="sidebar-bottom"><div className="progress-note"><span className="progress-icon"><Icon name="completed" size={18} /></span><div><strong>{doneToday} {doneToday === 1 ? 'task' : 'tasks'} completed today</strong><small>Small steps, real progress.</small></div></div><button className="help-button" onClick={() => { setSidebarOpen(false); setHelp(true); }}><Icon name="help" size={16} /> Help & shortcuts<span className="env-badge">{environment || 'local'}</span></button></div>
    </aside>
    <div className="main-panel">
      <header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button><span>My workspace</span><Icon name="chevron" size={13} /><span className="current-breadcrumb">{pageTitle}</span></div><span className="top-date"><Icon name="sun" size={16} />{new Date(`${today}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span></header>
      <main id="main-content">
        <div className="page-heading"><div><div className="eyebrow">{view === 'today' && !searching ? 'MAKE ROOM FOR WHAT MATTERS' : 'A LITTLE MORE CLARITY'}</div><h1>{project && !searching && <span style={{ color: project.color }}># </span>}{pageTitle}</h1><p className="page-subtitle">{searching ? `Matching “${search.trim()}” across all tasks` : view === 'today' ? new Date(`${today}T12:00:00`).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' }) : view === 'upcoming' ? 'A little planning goes a long way.' : view === 'completed' ? 'Look at everything you’ve accomplished.' : project ? 'Your ideas, plans, and next steps. All in one place.' : view === 'priority' ? 'Make time for the things that matter most.' : view === 'all' ? 'The big picture, one task at a time.' : 'A home for everything on your mind.'}</p></div><div className="heading-actions">{project && !searching && <button className="icon-button" aria-label="Edit project" onClick={() => setProjectEditor(project)}><Icon name="edit" size={18} /></button>}<button className="primary header-add" onClick={openNew} disabled={loading}><Icon name="plus" size={17} /> Add task</button></div></div>
        {!searching && view === 'upcoming' && <div className="calendar"><div className="calendar-toolbar"><strong>{new Date(`${plusDays(today, calendarOffset)}T12:00:00`).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</strong><div><button className="text-button" onClick={() => { setCalendarOffset(0); setSelectedDate(null); }}>All dates</button><button className="icon-button" aria-label="Previous week" onClick={() => setCalendarOffset(value => value - 7)}><Icon name="chevron" style={{ transform: 'rotate(180deg)' }} size={16} /></button><button className="icon-button" aria-label="Next week" onClick={() => setCalendarOffset(value => value + 7)}><Icon name="chevron" size={16} /></button></div></div><div className="week-strip">{Array.from({ length: 7 }, (_, index) => { const day = plusDays(today, calendarOffset + index); return <button key={day} className={`${selectedDate === day ? 'chosen' : ''} ${day === today ? 'is-today' : ''}`} onClick={() => setSelectedDate(value => value === day ? null : day)} aria-pressed={selectedDate === day} aria-label={`Show tasks for ${day}`}><span>{new Date(`${day}T12:00:00`).toLocaleDateString('en', { weekday: 'short' })}</span><strong>{Number(day.slice(-2))}</strong><i className={active.some(task => task.due_date === day) ? 'has-tasks' : ''} /></button>; })}</div></div>}
        <div className="list-toolbar"><span><Icon name={view === 'completed' ? 'completed' : 'all'} size={16} />{visible.length} {visible.length === 1 ? 'task' : 'tasks'}{selectedDate ? ` · ${dateLabel(selectedDate, today)}` : ''}</span><label className="sort-control"><Icon name="filter" size={16} /><span className="sr-only">Sort tasks</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="priority">Priority</option><option value="date">Due date</option><option value="newest">Newest first</option><option value="title">Name</option></select></label></div>
        {error && <div role="alert" className="error-banner"><span>{error}</span><button className="text-button" onClick={load}>Retry</button><button className="icon-button" aria-label="Dismiss error" onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}
        {loading ? <div role="status" className="loading-state"><span className="spinner" /> Loading your workspace…</div> : <>
          {grouped.map(([key, items]) => <section className="task-group" key={key} aria-label={key || pageTitle}>{key && <h2 className={key === 'Overdue' ? 'overdue' : ''}>{/^\d{4}-/.test(key) ? dateLabel(key, today) : key}<span>{items.length}</span></h2>}<ul className="task-list">{items.map(task => <TaskRow key={task.id} task={task} />)}</ul></section>)}
          {!visible.length && !error && <div className="empty-state"><EmptyArt /><h2>{searching ? 'No matches just yet' : view === 'completed' ? 'Good things take a first step' : view === 'today' ? 'A clear day ahead' : view === 'upcoming' ? 'Make a little space for the future' : view === 'priority' ? 'Your priorities, in focus' : 'A little less on your mind'}</h2><p>{searching ? 'Try another task name, description, or project.' : view === 'completed' ? 'Complete a task and it will appear here. Every little thing counts.' : view === 'today' ? 'You’re all caught up. Add something for today, or enjoy a moment of calm.' : view === 'priority' ? 'Give a task priority 1, 2, or 3 to find it here.' : view === 'upcoming' ? 'Add a task with a due date to start planning ahead.' : 'Capture a task, a plan, or a passing thought. You can figure out the details as you go.'}</p>{!searching && view !== 'completed' && <button className="primary" onClick={openNew}><Icon name="plus" size={17} /> Add a task</button>}</div>}
          {!!visible.length && view !== 'completed' && !searching && <button className="inline-add" onClick={openNew}><span><Icon name="plus" size={18} /></span>Add task</button>}
        </>}
        <div className="page-footnote"><span className="footnote-line" /><span>One thing at a time.</span><span className="footnote-line" /></div>
      </main>
    </div>
    {editor && <TaskEditor task={editor} projects={projects} onSave={saveTask} onDelete={deleteTask} onClose={() => setEditor(null)} />}
    {projectEditor && <ProjectEditor project={projectEditor} onSave={saveProject} onClose={() => setProjectEditor(null)} />}
    {help && <Modal title="A little help getting started" onClose={() => setHelp(false)}><div className="editor-body help-content"><p>Capture tasks in <strong>Inbox</strong>, give them a date to find them in <strong>Today</strong> or <strong>Upcoming</strong>, and organize them into projects.</p><p>Click any task to edit its description, date, priority, or project. Completed tasks stay in <strong>Completed</strong>, where you can reopen them.</p><div className="shortcut-row"><span>Quick add a task</span><kbd>Q</kbd></div><div className="shortcut-row"><span>Search everything</span><kbd>⌘ / Ctrl K</kbd></div><div className="shortcut-row"><span>Close a dialog</span><kbd>Esc</kbd></div><p className="muted small">Taskist is your self-hosted learning app, inspired by Todoist. This workspace is shared by everyone with access; accounts and team collaboration are not enabled.</p></div></Modal>}
    {toast && <Toast toast={toast} onClose={() => setToast(null)} onError={message => setError(message)} />}
  </div>;
}
function Toast({ toast, onClose, onError }) {
  const [busy, setBusy] = useState(false);
  return <div className="toast" role="status"><Icon name="completed" size={18} /><span>{toast.message}</span>{toast.undo && <button disabled={busy} onClick={async () => { setBusy(true); try { await toast.undo(); } catch (e) { onError(e.message); } finally { setBusy(false); } }}>Undo</button>}<button className="toast-close" aria-label="Dismiss notification" onClick={onClose}><Icon name="close" size={16} /></button></div>;
}
createRoot(document.getElementById('root')).render(<App />);
