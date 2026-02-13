import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import projectsRouter from './routes/projects.js';
import costsRouter from './routes/costs.js';
import tasksRouter from './routes/tasks.js';
import skillsRouter from './routes/skills.js';
import cronRouter from './routes/cron.js';
import activityRouter from './routes/activity.js';
import channelsRouter from './routes/channels.js';
import { connectToGateway } from './services/gateway-ws.js';
import { startCostAggregator, stopCostAggregator } from './services/cost-aggregator.js';
import { setBroadcaster, broadcast } from './broadcast.js';
import { activityStore } from './db.js';

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());
app.use(express.static('client'));

// API routes
app.use('/api/projects', projectsRouter);
app.use('/api/costs', costsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/cron', cronRouter);
app.use('/api/activity', activityRouter);
app.use('/api/channels', channelsRouter);

// Phase 5: Agent webhook - OpenClaw can POST here on agent:message or any event
app.post('/api/agent/event', (req, res) => {
  const { type, message, details, project_id } = req.body;
  activityStore.add(type || 'agent_event', message || 'Event', details, project_id);
  broadcast({ type: 'agent_event', data: { type, message, details, project_id } });
  res.json({ success: true });
});

// Get gateway status
app.get('/api/status', (req, res) => {
  res.json({
    online: true,
    agent: 'Clawd',
    model: 'Claude Sonnet 4.5',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/status/costs', (req, res) => {
  res.redirect('/api/costs/summary');
});

// Local dev: full server with WebSocket. Vercel: export app only (no listen).
if (process.env.VERCEL !== '1') {
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('🔌 Dashboard client connected');
    ws.on('close', () => console.log('⚠️  Dashboard client disconnected'));
  });

  function doBroadcast(data) {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(JSON.stringify(data));
    });
  }
  setBroadcaster(doBroadcast);

  connectToGateway((message) => broadcast({ type: 'gateway_event', data: message }));
  startCostAggregator();

  process.on('SIGINT', () => {
    stopCostAggregator();
    process.exit(0);
  });

  const host = '127.0.0.1';
  server.listen(PORT, host, () => {
    console.log(`
╔═══════════════════════════════════════════╗
║   🚀 MISSION CONTROL                      ║
║   Dashboard: http://127.0.0.1:${PORT}       ║
║   Status: ONLINE                          ║
╚═══════════════════════════════════════════╝
  `);
  });
}

export default app;
