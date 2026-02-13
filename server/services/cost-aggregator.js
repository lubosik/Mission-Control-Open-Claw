import { costStore } from '../db.js';
import { parseSessionUsage } from './token-parser.js';

let aggregatorInterval = null;

/**
 * Background job to aggregate costs every 5 minutes.
 * Skips on Vercel (no long-running processes).
 */
export function startCostAggregator() {
  if (process.env.VERCEL === '1') {
    console.log('⚠️  Cost aggregator skipped (Vercel serverless)');
    return;
  }

  console.log('📊 Starting cost aggregator (runs every 5 minutes)');
  aggregateCosts();
  aggregatorInterval = setInterval(aggregateCosts, 5 * 60 * 1000);
}

export function stopCostAggregator() {
  if (aggregatorInterval) {
    clearInterval(aggregatorInterval);
    aggregatorInterval = null;
    console.log('⚠️  Cost aggregator stopped');
  }
}

function aggregateCosts() {
  try {
    const usage = parseSessionUsage();
    const now = new Date().toISOString();

    for (const [model, data] of Object.entries(usage.byModel)) {
      costStore.add({
        model,
        feature: 'aggregate',
        input_tokens: 0,
        output_tokens: 0,
        cache_read_tokens: 0,
        cache_write_tokens: 0,
        total_cost: data.cost
      });
    }

    console.log(
      `✅ Aggregated costs: Today=$${usage.today.cost.toFixed(4)} Week=$${usage.week.cost.toFixed(4)} Month=$${usage.month.cost.toFixed(4)}`
    );
  } catch (err) {
    console.error('❌ Cost aggregation failed:', err.message);
  }
}
