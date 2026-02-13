import express from 'express';
import { channelsStore } from '../db.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(channelsStore.getAll());
});

export default router;
