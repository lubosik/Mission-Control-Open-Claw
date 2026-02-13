import express from 'express';
import { taskStore, projectStore, activityStore } from '../db.js';
import { broadcast } from '../broadcast.js';

const router = express.Router();

/**
 * Momentum scoring: urgency + recency + complexity.
 * Higher = more ready for execution.
 * Base 50, +recency (0-20), +complexity bonus (high=+15, medium=+5, low=0), +explicit override.
 */
function computeMomentum(task) {
  let score = task.momentum_score ?? 50;
  const created = new Date(task.created_at).getTime();
  const ageHours = (Date.now() - created) / (1000 * 60 * 60);
  const recencyBonus = Math.max(0, 20 - ageHours * 2); // Newer = higher
  score += recencyBonus;
  const complexityBonus = { high: 15, medium: 5, low: 0 }[task.complexity] ?? 5;
  score += complexityBonus;
  return Math.min(100, Math.max(0, Math.round(score)));
}

// Get all tasks (optionally filter by project_id or status)
router.get('/', (req, res) => {
  const { project_id, status } = req.query;
  let tasks = taskStore.getAll();
  if (project_id) tasks = tasks.filter(t => t.project_id === +project_id);
  if (status) tasks = tasks.filter(t => t.status === status);
  tasks = tasks.map(t => ({ ...t, momentum_score: computeMomentum(t) }));
  tasks.sort((a, b) => (b.momentum_score || 0) - (a.momentum_score || 0) || new Date(b.created_at) - new Date(a.created_at));
  res.json(tasks);
});

// Get single task
router.get('/:id', (req, res) => {
  const task = taskStore.getById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (task.project_id) {
    const project = projectStore.getById(task.project_id);
    res.json({ ...task, project });
  } else {
    res.json(task);
  }
});

// Create task
router.post('/', (req, res) => {
  const { name, description, project_id, complexity, momentum_score, status } = req.body;
  const task = taskStore.create({
    name,
    description,
    project_id,
    complexity: complexity || 'medium',
    momentum_score: momentum_score ?? 50,
    status: status || 'pending'
  });
  activityStore.add('task_created', `Task: ${name}`, null, project_id);
  broadcast({ type: 'tasks_updated' });
  res.json(task);
});

// Update task (including momentum score)
router.patch('/:id', (req, res) => {
  const updates = { ...req.body };
  delete updates.id;
  delete updates.created_at;
  const task = taskStore.update(req.params.id, updates);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  broadcast({ type: 'tasks_updated' });
  res.json(task);
});

// Delete task
router.delete('/:id', (req, res) => {
  const ok = taskStore.delete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Task not found' });
  broadcast({ type: 'tasks_updated' });
  res.json({ success: true });
});

export default router;
