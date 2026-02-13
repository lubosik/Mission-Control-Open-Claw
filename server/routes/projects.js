import express from 'express';
import { projectStore, taskStore, activityStore } from '../db.js';
import { broadcast } from '../broadcast.js';

const router = express.Router();

// Get all projects
router.get('/', (req, res) => {
  const projects = projectStore.getAll();
  res.json(projects);
});

// Get single project by ID (with tasks + momentum)
router.get('/:id', (req, res) => {
  const project = projectStore.getById(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  let projectTasks = taskStore.getByProjectId(req.params.id);
  projectTasks = projectTasks.map(t => ({ ...t, momentum_score: computeMomentum(t) }));
  res.json({ ...project, tasks: projectTasks });
});

function computeMomentum(task) {
  let score = task.momentum_score ?? 50;
  const created = new Date(task.created_at).getTime();
  const ageHours = (Date.now() - created) / (1000 * 60 * 60);
  const recencyBonus = Math.max(0, 20 - ageHours * 2);
  score += recencyBonus;
  const complexityBonus = { high: 15, medium: 5, low: 0 }[task.complexity] ?? 5;
  score += complexityBonus;
  return Math.min(100, Math.max(0, Math.round(score)));
}

// Create project
router.post('/', (req, res) => {
  const { name, description, priority, tags, status } = req.body;
  const project = projectStore.create({
    name,
    description,
    priority: priority || 'medium',
    tags,
    status: status || 'queued',
    progress: 0
  });
  activityStore.add('project_created', `Created project: ${name}`, null, project.id);
  broadcast({ type: 'projects_updated' });
  res.json(project);
});

// Update project
router.patch('/:id', (req, res) => {
  const { status, progress, actual_cost, status_notes, name, description, priority, tags } = req.body;
  const updates = {};
  if (status !== undefined) updates.status = status;
  if (progress !== undefined) updates.progress = progress;
  if (actual_cost !== undefined) updates.actual_cost = actual_cost;
  if (status_notes !== undefined) updates.status_notes = status_notes;
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (priority !== undefined) updates.priority = priority;
  if (tags !== undefined) updates.tags = tags;

  const project = projectStore.update(req.params.id, updates);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  activityStore.add('project_updated', `Updated: ${project.name}`, JSON.stringify(updates), project.id);
  broadcast({ type: 'projects_updated' });
  res.json(project);
});

// Delete project
router.delete('/:id', (req, res) => {
  const ok = projectStore.delete(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Project not found' });
  broadcast({ type: 'projects_updated' });
  res.json({ success: true });
});

export default router;
