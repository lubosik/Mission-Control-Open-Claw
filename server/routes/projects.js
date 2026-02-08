import express from 'express';
import db from '../db.js';

const router = express.Router();

// Get all projects
router.get('/', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(projects);
});

// Create project
router.post('/', (req, res) => {
  const { name, description, priority, tags } = req.body;
  const stmt = db.prepare(`
    INSERT INTO projects (name, description, priority, tags, progress)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, description, priority || 'medium', tags || '', 0);
  res.json({ id: result.lastInsertRowid, name, description, priority });
});

// Update project
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { status, progress, actual_cost, status_notes } = req.body;
  
  const updates = [];
  const values = [];
  
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  if (progress !== undefined) { updates.push('progress = ?'); values.push(progress); }
  if (actual_cost !== undefined) { updates.push('actual_cost = ?'); values.push(actual_cost); }
  if (status_notes !== undefined) { updates.push('status_notes = ?'); values.push(status_notes); }
  
  updates.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  
  const stmt = db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  
  res.json({ success: true });
});

export default router;
