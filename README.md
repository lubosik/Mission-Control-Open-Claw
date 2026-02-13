# Mission Control Dashboard

Real-time web dashboard for monitoring OpenClaw agent operations, costs, and projects.

## Features

- 🎨 **Dark Glass UI** - Apple-inspired glassmorphism design
- 💰 **Cost Tracking** - Token usage, API costs, budget alerts (from session files or agent POST)
- 📊 **Project Management** - Kanban board with drag-and-drop
- 🔧 **Workshop (Task Queue)** - Tasks sorted by momentum score
- 📋 **Project Detail Modal** - Full view with tasks, progress, cost
- 🔌 **Live Updates** - WebSocket-powered (local) or polling (Vercel)

## Quick Start

### Local Development

```bash
npm install
npm start
```

Dashboard: **http://127.0.0.1:3333**

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENCLAW_GATEWAY_WS_URL` | WebSocket URL for OpenClaw Gateway (default: `ws://127.0.0.1:63362`) |
| `OPENCLAW_GATEWAY_TOKEN` | Auth token for Gateway (add to `.env`, never commit) |
| `OPENCLAW_SESSIONS_PATH` | Path to `~/.openclaw` for session file parsing (default: `~/.openclaw`) |
| `PORT` | Server port (default: 3333) |

Create a `.env` file from `.env.example` and add your Gateway token there.

### Cost Tracking

- **Local**: Reads session files from `~/.openclaw/agents/*/sessions/sessions.json`
- **Remote/Vercel**: Use `POST /api/costs/ingest` to report usage from OpenClaw agent:
  ```json
  { "cost": 0.012, "model": "claude-sonnet-4", "feature": "Chat" }
  ```

## Deploy to Vercel

1. Fork this repo
2. Connect to Vercel
3. Deploy

**Note**: Vercel uses in-memory storage (no persistence). For production persistence, add a remote DB (Postgres, MongoDB) and swap `server/store.js`. WebSocket is disabled on Vercel; the dashboard uses polling instead.

## Architecture

- **Backend**: Node.js + Express + in-memory store
- **Frontend**: Vanilla JS + Tailwind CSS
- **Real-time**: WebSocket (local) or polling (Vercel)

## Project Structure

```
mission-control/
├── server/
│   ├── index.js          # Express server + WebSocket
│   ├── db.js             # Data layer (exports store)
│   ├── store.js          # In-memory storage
│   ├── routes/
│   │   ├── projects.js   # Project CRUD
│   │   ├── costs.js      # Cost data + ingest API
│   │   └── tasks.js      # Task CRUD + momentum
│   └── services/
│       ├── token-parser.js    # Parse session files
│       ├── cost-aggregator.js # Background aggregation
│       └── gateway-ws.js      # WebSocket to Gateway
├── client/
│   ├── index.html
│   └── src/
│       └── app.js
└── vercel.json
```

## Momentum Scoring

Tasks are scored by: base score + recency bonus + complexity bonus. Higher = more ready for execution.

## Built With OpenClaw

This dashboard was built by Clawd, an AI assistant running on OpenClaw.

- OpenClaw: https://openclaw.ai
- GitHub: https://github.com/openclaw/openclaw
