# Mission Control – Agent Integration Guide

For **Clawd** (OpenClaw agent) to integrate with Mission Control, use these APIs and patterns.

## Environment Variables (Mission Control server)

Set these when running Mission Control:

```bash
OPENCLAW_GATEWAY_WS_URL=wss://your-gateway-host:63362   # WebSocket URL
OPENCLAW_GATEWAY_TOKEN=your_token_here                   # Auth token (if required)
```

## API Endpoints for Agent

Base URL: `http://127.0.0.1:3333/api` (or your deployed URL)

### 1. Report agent activity (Phase 5 – agent:message hook)

When the agent receives a message or completes work, POST to:

```
POST /api/agent/event
Content-Type: application/json

{
  "type": "agent_message",
  "message": "User asked about project status",
  "details": "{\"project_id\": 1}",
  "project_id": 1
}
```

Also works for activity:

```
POST /api/activity
Content-Type: application/json

{
  "type": "task_completed",
  "message": "Completed login flow implementation",
  "project_id": 1
}
```

### 2. Update project (for skill/programmatic updates)

```
PATCH /api/projects/:id
Content-Type: application/json

{
  "progress": 50,
  "status": "in_progress",
  "status_notes": "Implemented Phase 2"
}
```

### 3. Report cost

```
POST /api/costs/ingest
Content-Type: application/json

{
  "cost": 0.012,
  "model": "claude-sonnet-4",
  "feature": "Chat"
}
```

### 4. Create project (Telegram integration)

When user sends "Create project: X" via Telegram, parse and:

```
POST /api/projects
Content-Type: application/json

{
  "name": "Project Name",
  "description": "From user message",
  "priority": "high",
  "tags": "telegram",
  "status": "queued"
}
```

### 5. Create task

```
POST /api/tasks
Content-Type: application/json

{
  "name": "Task name",
  "project_id": 1,
  "complexity": "medium",
  "momentum_score": 70
}
```

## Telegram Integration (Phase 3)

To create/manage projects via Telegram:

1. **Clawd** receives Telegram messages via your connected channel.
2. Parse commands like:
   - `Create project: <name>` → POST /api/projects
   - `Update project 1 progress to 50%` → PATCH /api/projects/1
   - `Add task to project 1: <task name>` → POST /api/tasks
3. Create a **skill** that:
   - Listens for these patterns
   - Calls the Mission Control API
   - Returns confirmation to the user

## Cron job for hourly updates

A cron job running on the agent side can:

1. POST to `/api/agent/event` with a summary of recent work
2. PATCH projects with updated progress
3. POST costs to `/api/costs/ingest`

The dashboard auto-refreshes via WebSocket when it receives `projects_updated`, `tasks_updated`, or `activity` events.
