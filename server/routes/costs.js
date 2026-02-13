import express from 'express';
import { costStore } from '../db.js';
import { parseSessionUsage, getCurrentSessionStats } from '../services/token-parser.js';

const router = express.Router();

// POST: OpenClaw agent reports cost (for remote deployment when session files unavailable)
router.post('/ingest', (req, res) => {
  const { cost, model, feature, input_tokens, output_tokens } = req.body;
  costStore.addReported({ cost: cost || 0, model: model || 'unknown', feature: feature || 'agent' });
  res.json({ success: true });
});

// Merge session parser output with reported costs from agent
function getMergedUsage() {
  const usage = parseSessionUsage();
  const r = costStore.reportedUsage;
  usage.today.cost += r.today;
  usage.week.cost += r.week;
  usage.month.cost += r.month;
  for (const [model, cost] of Object.entries(r.byModel)) {
    if (!usage.byModel[model]) usage.byModel[model] = { cost: 0, tokens: 0 };
    usage.byModel[model].cost += cost;
  }
  for (const [feature, cost] of Object.entries(r.byFeature)) {
    if (!usage.byFeature[feature]) usage.byFeature[feature] = { cost: 0 };
    usage.byFeature[feature].cost += cost;
  }
  return usage;
}

// Get detailed cost summary
router.get('/summary', (req, res) => {
  res.json(getMergedUsage());
});

// Get cost breakdown by model
router.get('/by-model', (req, res) => {
  res.json(getMergedUsage().byModel);
});

// Get cost breakdown by feature
router.get('/by-feature', (req, res) => {
  res.json(getMergedUsage().byFeature);
});

// Get hourly cost data (last 24 hours)
router.get('/hourly', (req, res) => {
  res.json(getMergedUsage().hourly);
});

// Get daily cost data (last 30 days)
router.get('/daily', (req, res) => {
  res.json(getMergedUsage().daily);
});

// Get budget status
router.get('/budget', (req, res) => {
  const usage = getMergedUsage();
  
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
