import express from 'express';
import { activityStore } from '../db.js';
import { broadcast } from '../broadcast.js';

const router = express.Router();

router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 100);
  res.json(activityStore.getRecent(limit));
});

// Agent webhook: POST from OpenClaw when agent:message or other events
router.post('/', (req, res) => {
  const { type, message, details, project_id } = req.body;
  activityStore.add(type || 'event', message || 'Activity', details, project_id);
  broadcast({ type: 'activity', data: { type, message, details, project_id } });
  res.json({ success: true });
});

export default router;
