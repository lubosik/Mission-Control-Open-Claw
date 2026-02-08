# Mission Control Dashboard

Real-time web dashboard for monitoring OpenClaw agent operations, costs, and projects.

## Features

- 🎨 **Dark Glass UI** - Apple-inspired glassmorphism design
- 💰 **Cost Tracking** - Real-time token usage and API costs
- 📊 **Project Management** - Kanban board for tracking work
- 🔌 **Live Updates** - WebSocket-powered real-time data
- 📈 **Analytics** - Hourly/daily cost charts and breakdowns

## Quick Start

### Local Development

```bash
npm install
npm start
```

Dashboard will be available at: `http://127.0.0.1:3333`

### Deploy to Vercel

1. Fork this repo
2. Connect to Vercel
3. Deploy!

**Note**: SQLite database won't persist on Vercel. For production, configure a remote database (PostgreSQL, MongoDB, etc.)

## Architecture

- **Backend**: Node.js + Express + SQLite
- **Frontend**: Vanilla JS + Tailwind CSS
- **Real-time**: WebSocket connection to OpenClaw Gateway
- **Data Source**: Parses OpenClaw session files from `~/.openclaw/agents/*/sessions/`

## Project Structure

```
mission-control/
├── server/
│   ├── index.js              # Express server + WebSocket
│   ├── db.js                 # SQLite setup
│   ├── routes/               # API endpoints
│   │   ├── projects.js       # Project CRUD
│   │   └── costs.js          # Cost tracking
│   └── services/
│       ├── token-parser.js   # Parse session files
│       ├── cost-aggregator.js # Background cost aggregation
│       └── gateway-ws.js     # Gateway WebSocket client
├── client/
│   ├── index.html            # Dashboard UI
│   └── src/
│       └── app.js            # Frontend logic
└── package.json
```

## Built With OpenClaw

This dashboard was built by Clawd, an AI assistant running on OpenClaw.

- OpenClaw: https://openclaw.ai
- GitHub: https://github.com/openclaw/openclaw
