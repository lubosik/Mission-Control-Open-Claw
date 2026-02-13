# Full Prompt for OpenClawd: Mission Control Dashboard – Finish, Deploy & Integrate

You are Clawd. Your user has a **Mission Control** dashboard for monitoring your operations, costs, and projects. Your tasks are to:

1. **Finish** any remaining dashboard work (if needed).
2. **Deploy** Mission Control to Vercel and get the live URL.
3. **Integrate** so you effectively use the dashboard and keep it accurate.

---

## Part 1: What Mission Control Is

- **Repo**: Mission Control Open Claw (this codebase).
- **Stack**: Vanilla JS + Tailwind (frontend), Express + in-memory store (backend).
- **Features**: Status strip, Cost Tracker, Projects Kanban, Workshop (task queue), Skills panel, Cron Jobs, Activity Feed, Connected Channels. APIs for projects, tasks, costs, activity, skills, cron, channels.
- **Vercel**: Already configured (`vercel.json`). Backend is serverless; no WebSocket on Vercel (polling only). Data is in-memory (resets on cold start unless you add a DB later).

---

## Part 2: What You Need To Do

### A. Finish the dashboard (if anything is broken)

- Run the app locally: `cd <repo> && npm install && npm start` → open http://127.0.0.1:3333.
- Confirm: status bar, cost tracker, projects Kanban, task queue, Skills, Cron, Activity Feed, Channels all load.
- If something fails (e.g. missing API, wrong route), fix it. The frontend uses `/api` when not on localhost; the server exports the Express app for Vercel (no `listen()` when `VERCEL=1`).

### B. Deploy to Vercel and get the link

1. **If the repo is already connected to Vercel**
   - Push to the connected branch (e.g. `main`) or trigger a deploy from the Vercel dashboard.
   - After deploy, open the project in Vercel → **Settings** → **Domains** (or the deployment URL). The Mission Control link is:  
     **`https://<your-project>.vercel.app`** (or the custom domain you set).

2. **If not connected**
   - User connects the GitHub repo to Vercel (Import Project → select repo → leave defaults; `vercel.json` is already there).
   - After first deploy, get the URL from the Vercel dashboard (e.g. `https://mission-control-xxx.vercel.app`).

3. **Tell the user**
   - Reply with: “Mission Control is deployed. You can open it here: **<LINK>**.”
   - Save this URL; you will use it as `MISSION_CONTROL_URL` when calling the APIs.

### C. Ensure you use the dashboard effectively

You need to **send data to** Mission Control so the dashboard reflects real work and costs.

---

## Part 3: Skills and Capabilities You Need

You don’t need new “skills” in the OpenClaw skill sense unless you want named commands. You need:

1. **HTTP client**  
   Ability to send `fetch()` (or equivalent) requests from your runtime to the Mission Control API (local or Vercel URL).

2. **Environment variable**  
   `MISSION_CONTROL_URL` – the base URL of Mission Control (e.g. `https://your-app.vercel.app` or `http://127.0.0.1:3333`). You (or the user) must set this where you run so you know where to POST.

3. **Logic to call the API at the right times**  
   - When you create or update a project (in conversation or via Telegram): call Mission Control.
   - When you complete a task or milestone: update project progress and/or post activity.
   - When you have cost data (e.g. from a run): send it to `/api/costs/ingest`.
   - Optionally: when you receive a user message that is “agent activity”, post to `/api/agent/event` so the Activity Feed stays live.

---

## Part 4: API Reference (How You Update the Dashboard)

Base URL: **`MISSION_CONTROL_URL`** (no trailing slash). All request bodies are JSON; send header `Content-Type: application/json`.

| What you want to do | Method | Endpoint | Body (example) |
|---------------------|--------|----------|----------------|
| Report an agent event (e.g. message received, task done) | POST | `/api/agent/event` | `{ "type": "task_completed", "message": "Implemented login flow", "project_id": 1 }` |
| Add activity line (also appears in Activity Feed) | POST | `/api/activity` | `{ "type": "task_completed", "message": "Completed Phase 2", "project_id": 1 }` |
| Create a project | POST | `/api/projects` | `{ "name": "Project Name", "description": "...", "priority": "high", "tags": "telegram", "status": "queued" }` |
| Update project (progress, status, notes) | PATCH | `/api/projects/:id` | `{ "progress": 50, "status": "in_progress", "status_notes": "Phase 2 done" }` |
| Create a task | POST | `/api/tasks` | `{ "name": "Task name", "project_id": 1, "complexity": "medium", "momentum_score": 70 }` |
| Report cost (when you have usage/cost data) | POST | `/api/costs/ingest` | `{ "cost": 0.012, "model": "claude-sonnet-4", "feature": "Chat" }` |

- Use **project_id** so the dashboard can link activity/tasks to the right project.
- After you create or update projects/tasks, the dashboard will show updates (on Vercel it polls; locally it can also use WebSocket).

---

## Part 5: When to Call What (So the Dashboard Works Properly)

1. **User says “Create project: &lt;name&gt;” (or similar)**  
   - Parse name (and optional description/priority).  
   - `POST /api/projects` with the data.  
   - Reply to the user: “Created project ‘&lt;name&gt;’ in Mission Control.”

2. **You finish a concrete task or milestone for a project**  
   - `PATCH /api/projects/:id` with updated `progress` and/or `status_notes`.  
   - Optionally `POST /api/activity` or `POST /api/agent/event` with a short message (e.g. “Completed login flow”).

3. **User asks for status or “what’s in Mission Control?”**  
   - You can describe what’s on the dashboard (projects, tasks, costs) and give them the Mission Control link. You don’t have to call the API for a simple status reply unless you want to aggregate from the API.

4. **You have token/usage or cost data**  
   - `POST /api/costs/ingest` so the Cost Tracker stays accurate (important when running remotely, e.g. when session files aren’t available to Mission Control).

5. **Optional: keep Activity Feed live**  
   - On important user messages or when you start a task, `POST /api/agent/event` with a short message. Don’t spam; a few events per conversation are enough.

---

## Part 6: Checklist for You (OpenClawd)

- [ ] Run Mission Control locally once to confirm all panels and APIs work.
- [ ] Deploy to Vercel (or confirm deploy from connected repo) and get the production URL.
- [ ] Send the user: “Mission Control is deployed. You can open it here: **<LINK>**.”
- [ ] Ensure `MISSION_CONTROL_URL` is set (in your environment/config) to that link (or to the local URL when testing locally).
- [ ] When the user creates a project via you (or Telegram), call `POST /api/projects`.
- [ ] When you complete work on a project, call `PATCH /api/projects/:id` and optionally `POST /api/activity` or `POST /api/agent/event`.
- [ ] When you have cost data, call `POST /api/costs/ingest`.
- [ ] (Optional) Create a small “Mission Control” skill or flow that parses “create project”, “add task”, “update progress” and maps them to the APIs above.

---

## Part 7: Repo Layout (Quick Reference)

- `server/index.js` – Express app, API routes, agent webhook; exports app for Vercel.
- `server/routes/` – projects, costs, tasks, skills, cron, activity, channels.
- `server/store.js` – In-memory data (projects, tasks, costs, activity, skills, cron, channels).
- `client/index.html` – Single-page dashboard UI.
- `client/src/app.js` – Frontend logic (fetches APIs, renders panels).
- `vercel.json` – Build and routes: `/api/*` → server, `/*` → client.
- `AGENT_SKILL.md` – Shorter API/integration notes.

Start now: run the app, fix any issues, deploy to Vercel, get the link, then integrate using the APIs above so the dashboard stays accurate and the user can rely on it.
