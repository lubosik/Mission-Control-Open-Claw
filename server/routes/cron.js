import express from 'express';
import { cronJobsStore } from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(cronJobsStore.getAll());
});

export default router;
