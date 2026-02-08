import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import db from './db.js';
import projectsRouter from './routes/projects.js';
import costsRouter from './routes/costs.js';
import { connectToGateway } from './services/gateway-ws.js';
import { startCostAggregator, stopCostAggregator } from './services/cost-aggregator.js';

const app = express();
const PORT = 3333;

app.use(cors());
app.use(express.json());
app.use(express.static('client'));

// API routes
app.use('/api/projects', projectsRouter);
app.use('/api/costs', costsRouter);

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

// Legacy endpoint (redirects to new costs router)
app.get('/api/status/costs', (req, res) => {
  res.redirect('/api/costs/summary');
});

// Create HTTP server
const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('🔌 Dashboard client connected');
  
  ws.on('close', () => {
    console.log('⚠️  Dashboard client disconnected');
  });
});

// Broadcast to all connected dashboard clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

// Connect to OpenClaw Gateway
connectToGateway((message) => {
  // Forward relevant Gateway events to dashboard clients
  broadcast({ type: 'gateway_event', data: message });
});

// Insert initial project
const existingProject = db.prepare('SELECT * FROM projects WHERE name = ?').get('Mission Control Dashboard');
if (!existingProject) {
  db.prepare(`
    INSERT INTO projects (name, description, status, priority, progress, tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    'Mission Control Dashboard',
    'Building the central command dashboard for monitoring all agent operations, costs, and projects',
    'in_progress',
    'high',
    10,
    'infrastructure,dashboard,internal-tool'
  );
  console.log('✅ Created initial project: Mission Control Dashboard');
}

// Start cost aggregator
startCostAggregator();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Shutting down...');
  stopCostAggregator();
  process.exit(0);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🚀 MISSION CONTROL                      ║
║   Dashboard: http://127.0.0.1:${PORT}       ║
║   Status: ONLINE                          ║
╚═══════════════════════════════════════════╝
  `);
});
