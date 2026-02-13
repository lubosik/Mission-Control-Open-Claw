import express from 'express';
import { skillsStore } from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(skillsStore.getAll());
});

router.post('/record', (req, res) => {
  const { name } = req.body;
  if (name) skillsStore.recordUsage(name);
  res.json({ success: true });
});

export default router;
