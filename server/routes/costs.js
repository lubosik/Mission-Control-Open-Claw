import express from 'express';
import db from '../db.js';
import { parseSessionUsage, getCurrentSessionStats } from '../services/token-parser.js';

const router = express.Router();

// Get detailed cost summary
router.get('/summary', (req, res) => {
  const usage = parseSessionUsage();
  res.json(usage);
});

// Get cost breakdown by model
router.get('/by-model', (req, res) => {
  const usage = parseSessionUsage();
  res.json(usage.byModel);
});

// Get cost breakdown by feature
router.get('/by-feature', (req, res) => {
  const usage = parseSessionUsage();
  res.json(usage.byFeature);
});

// Get hourly cost data (last 24 hours)
router.get('/hourly', (req, res) => {
  const usage = parseSessionUsage();
  res.json(usage.hourly);
});

// Get daily cost data (last 30 days)
router.get('/daily', (req, res) => {
  const usage = parseSessionUsage();
  res.json(usage.daily);
});

// Get budget status
router.get('/budget', (req, res) => {
  const usage = parseSessionUsage();
  
  // Default budgets (can be made configurable later)
  const budgets = {
    daily: 10.00,
    monthly: 200.00
  };
  
  const dailyPercent = (usage.today.cost / budgets.daily) * 100;
  const monthlyPercent = (usage.month.cost / budgets.month) * 100;
  
  res.json({
    daily: {
      spent: usage.today.cost,
      limit: budgets.daily,
      percent: dailyPercent,
      alert: dailyPercent >= 90 ? 'danger' : dailyPercent >= 75 ? 'warning' : dailyPercent >= 50 ? 'caution' : 'safe'
    },
    monthly: {
      spent: usage.month.cost,
      limit: budgets.monthly,
      percent: monthlyPercent,
      alert: monthlyPercent >= 90 ? 'danger' : monthlyPercent >= 75 ? 'warning' : monthlyPercent >= 50 ? 'caution' : 'safe'
    }
  });
});

// Get current session stats
router.get('/session-stats', (req, res) => {
  const stats = getCurrentSessionStats();
  res.json(stats || { status: 'unknown', lastActivity: null });
});

export default router;
