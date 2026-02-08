import db from '../db.js';
import { parseSessionUsage } from './token-parser.js';

let aggregatorInterval = null;

/**
 * Background job to aggregate costs every 5 minutes
 */
export function startCostAggregator() {
  console.log('📊 Starting cost aggregator (runs every 5 minutes)');
  
  // Run immediately on start
  aggregateCosts();
  
  // Then run every 5 minutes
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
    
    // Store snapshot of current costs
    const stmt = db.prepare(`
      INSERT INTO costs (timestamp, model, feature, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, total_cost)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Aggregate by model
    for (const [model, data] of Object.entries(usage.byModel)) {
      stmt.run(
        now,
        model,
        'aggregate',
        0, 0, 0, 0,
        data.cost
      );
    }
    
    console.log(`✅ Aggregated costs: Today=$${usage.today.cost.toFixed(4)} Week=$${usage.week.cost.toFixed(4)} Month=$${usage.month.cost.toFixed(4)}`);
  } catch (err) {
    console.error('❌ Cost aggregation failed:', err.message);
  }
}
