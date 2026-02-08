import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const OPENCLAW_DIR = join(homedir(), '.openclaw');

/**
 * Parse session files to extract token usage and costs
 */
export function parseSessionUsage() {
  const usage = {
    today: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
    week: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
    month: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 },
    byModel: {},
    byFeature: {},
    hourly: Array(24).fill(0).map((_, i) => ({ hour: i, cost: 0 })),
    daily: []
  };

  try {
    const agentsDir = join(OPENCLAW_DIR, 'agents');
    if (!readdirSync(agentsDir).length) return usage;

    const agents = readdirSync(agentsDir);
    
    for (const agent of agents) {
      const sessionsFile = join(agentsDir, agent, 'sessions', 'sessions.json');
      
      try {
        const data = JSON.parse(readFileSync(sessionsFile, 'utf-8'));
        
        // Process each session
        for (const [sessionKey, session] of Object.entries(data)) {
          if (!session.messages) continue;
          
          for (const msg of session.messages) {
            if (!msg.usage || !msg.timestamp) continue;
            
            const timestamp = new Date(msg.timestamp);
            const now = new Date();
            const daysDiff = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24));
            
            const tokenData = {
              input: msg.usage.input || 0,
              output: msg.usage.output || 0,
              cacheRead: msg.usage.cacheRead || 0,
              cacheWrite: msg.usage.cacheWrite || 0,
              cost: msg.cost?.total || 0
            };
            
            // Aggregate by time period
            if (daysDiff === 0) {
              usage.today.input += tokenData.input;
              usage.today.output += tokenData.output;
              usage.today.cacheRead += tokenData.cacheRead;
              usage.today.cacheWrite += tokenData.cacheWrite;
              usage.today.cost += tokenData.cost;
              
              // Hourly breakdown
              const hour = timestamp.getHours();
              usage.hourly[hour].cost += tokenData.cost;
            }
            
            if (daysDiff < 7) {
              usage.week.input += tokenData.input;
              usage.week.output += tokenData.output;
              usage.week.cacheRead += tokenData.cacheRead;
              usage.week.cacheWrite += tokenData.cacheWrite;
              usage.week.cost += tokenData.cost;
            }
            
            if (daysDiff < 30) {
              usage.month.input += tokenData.input;
              usage.month.output += tokenData.output;
              usage.month.cacheRead += tokenData.cacheRead;
              usage.month.cacheWrite += tokenData.cacheWrite;
              usage.month.cost += tokenData.cost;
            }
            
            // By model
            const model = msg.model || 'unknown';
            if (!usage.byModel[model]) {
              usage.byModel[model] = { cost: 0, tokens: 0 };
            }
            usage.byModel[model].cost += tokenData.cost;
            usage.byModel[model].tokens += tokenData.input + tokenData.output;
            
            // By feature (inferred from message role/type)
            const feature = inferFeature(msg);
            if (!usage.byFeature[feature]) {
              usage.byFeature[feature] = { cost: 0 };
            }
            usage.byFeature[feature].cost += tokenData.cost;
          }
        }
      } catch (err) {
        console.error(`Failed to parse ${sessionsFile}:`, err.message);
      }
    }
    
    // Generate daily breakdown for last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      usage.daily.push({ date: dateStr, cost: 0 }); // TODO: aggregate by date
    }
    
  } catch (err) {
    console.error('Failed to parse session usage:', err.message);
  }
  
  return usage;
}

function inferFeature(msg) {
  if (msg.toolCalls?.length) return 'Skills';
  if (msg.role === 'system') return 'System';
  if (msg.thinking) return 'Thinking';
  return 'Chat';
}

/**
 * Get real-time session stats from current session
 */
export function getCurrentSessionStats() {
  try {
    const mainSessionFile = join(OPENCLAW_DIR, 'agents', 'main', 'sessions', 'sessions.json');
    const data = JSON.parse(readFileSync(mainSessionFile, 'utf-8'));
    
    // Find the most recent active session
    let latestSession = null;
    let latestTime = 0;
    
    for (const [key, session] of Object.entries(data)) {
      if (session.messages?.length) {
        const lastMsg = session.messages[session.messages.length - 1];
        const msgTime = new Date(lastMsg.timestamp).getTime();
        if (msgTime > latestTime) {
          latestTime = msgTime;
          latestSession = session;
        }
      }
    }
    
    if (!latestSession) return null;
    
    return {
      status: latestSession.status || 'idle',
      lastActivity: new Date(latestTime).toISOString(),
      messageCount: latestSession.messages.length
    };
  } catch (err) {
    return null;
  }
}
