/**
 * In-memory storage for Vercel compatibility.
 * Replaces SQLite - no persistence across serverless invocations.
 * For production persistence, swap this with a remote DB (Postgres, MongoDB).
 */

let projects = [];
let tasks = [];
let costs = [];
let activityLog = [];
let skills = [];
let cronJobs = [];
let projectIdCounter = 1;
let taskIdCounter = 1;
let costIdCounter = 1;

function initStore() {
  // Seed initial activity
  if (activityLog.length === 0) {
    activityLog.push(
      { id: 1, timestamp: new Date().toISOString(), type: 'system', message: 'Mission Control started', details: null, project_id: null },
      { id: 2, timestamp: new Date().toISOString(), type: 'gateway', message: 'Waiting for Gateway connection', details: null, project_id: null }
    );
  }
  // Seed initial project if empty
  if (projects.length === 0) {
    projects.push({
      id: projectIdCounter++,
      name: 'Mission Control Dashboard',
      description: 'Building the central command dashboard for monitoring all agent operations, costs, and projects',
      status: 'in_progress',
      priority: 'high',
      progress: 10,
      estimated_cost: 0,
      actual_cost: 0,
      tags: 'infrastructure,dashboard,internal-tool',
      status_notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    console.log('✅ Created initial project: Mission Control Dashboard');
  }
}

// Projects
export const projectStore = {
  getAll: () => [...projects].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  getById: (id) => projects.find(p => p.id === +id),
  create: (data) => {
    const now = new Date().toISOString();
    const project = {
      id: projectIdCounter++,
      name: data.name,
      description: data.description || '',
      status: data.status || 'queued',
      priority: data.priority || 'medium',
      progress: data.progress ?? 0,
      estimated_cost: data.estimated_cost ?? 0,
      actual_cost: data.actual_cost ?? 0,
      tags: Array.isArray(data.tags) ? data.tags.join(',') : (data.tags || ''),
      status_notes: data.status_notes || null,
      created_at: now,
      updated_at: now
    };
    projects.push(project);
    return project;
  },
  update: (id, updates) => {
    const idx = projects.findIndex(p => p.id === +id);
    if (idx === -1) return null;
    const allowed = ['status', 'progress', 'actual_cost', 'status_notes', 'name', 'description', 'priority', 'tags'];
    for (const [k, v] of Object.entries(updates)) {
      if (allowed.includes(k) && v !== undefined) projects[idx][k] = v;
    }
    projects[idx].updated_at = new Date().toISOString();
    return projects[idx];
  },
  delete: (id) => {
    const idx = projects.findIndex(p => p.id === +id);
    if (idx === -1) return false;
    projects.splice(idx, 1);
    tasks = tasks.filter(t => t.project_id !== +id);
    return true;
  }
};

// Tasks
export const taskStore = {
  getAll: () => [...tasks],
  getByProjectId: (projectId) => tasks.filter(t => t.project_id === +projectId),
  getById: (id) => tasks.find(t => t.id === +id),
  create: (data) => {
    const now = new Date().toISOString();
    const task = {
      id: taskIdCounter++,
      project_id: data.project_id ? +data.project_id : null,
      name: data.name,
      description: data.description || '',
      complexity: data.complexity || 'medium',
      momentum_score: data.momentum_score ?? 50,
      estimated_cost: data.estimated_cost ?? 0,
      status: data.status || 'pending',
      created_at: now
    };
    tasks.push(task);
    return task;
  },
  update: (id, updates) => {
    const idx = tasks.findIndex(t => t.id === +id);
    if (idx === -1) return null;
    const allowed = ['name', 'description', 'complexity', 'momentum_score', 'status', 'project_id'];
    for (const [k, v] of Object.entries(updates)) {
      if (allowed.includes(k) && v !== undefined) tasks[idx][k] = v;
    }
    return tasks[idx];
  },
  delete: (id) => {
    const idx = tasks.findIndex(t => t.id === +id);
    if (idx === -1) return false;
    tasks.splice(idx, 1);
    return true;
  }
};

// Costs (for aggregator snapshots + ingested data from OpenClaw agent)
export const costStore = {
  // Reported usage from OpenClaw agent when it can't read session files (e.g. remote)
  reportedUsage: { today: 0, week: 0, month: 0, byModel: {}, byFeature: {} },
  addReported: (data) => {
    const r = costStore.reportedUsage;
    const cost = data.cost || 0;
    if (cost > 0) {
      r.today += cost;  // Today only - week/month in merge use same for simplicity
      r.week += cost;
      r.month += cost;
    }
    if (data.model) {
      r.byModel[data.model] = (r.byModel[data.model] || 0) + cost;
    }
    if (data.feature) {
      r.byFeature[data.feature] = (r.byFeature[data.feature] || 0) + cost;
    }
  },
  add: (row) => {
    costs.push({ id: costIdCounter++, ...row, timestamp: new Date().toISOString() });
    if (costs.length > 10000) costs = costs.slice(-5000);
  },
  getRecent: (limit = 100) => costs.slice(-limit)
};

// Activity log
export const activityStore = {
  add: (type, message, details = null, projectId = null) => {
    activityLog.push({
      id: activityLog.length + 1,
      timestamp: new Date().toISOString(),
      type,
      message,
      details,
      project_id: projectId
    });
    if (activityLog.length > 1000) activityLog = activityLog.slice(-500);
  },
  getRecent: (limit = 50) => activityLog.slice(-limit).reverse()
};

// Skills (agent skill inventory)
export const skillsStore = {
  getAll: () => [...skills],
  add: (name, description) => {
    const existing = skills.find(s => s.name === name);
    if (existing) {
      existing.usage_count += 1;
      existing.last_used = new Date().toISOString();
      return existing;
    }
    skills.push({
      id: skills.length + 1,
      name,
      description: description || '',
      usage_count: 1,
      last_used: new Date().toISOString(),
      status: 'active'
    });
    return skills[skills.length - 1];
  },
  recordUsage: (name) => {
    const s = skills.find(x => x.name === name);
    if (s) {
      s.usage_count += 1;
      s.last_used = new Date().toISOString();
    }
  }
};

// Cron jobs
export const cronJobsStore = {
  getAll: () => [...cronJobs],
  upsert: (name, schedule, lastRun = null, nextRun = null, cost = 0) => {
    const existing = cronJobs.find(j => j.name === name);
    if (existing) {
      if (lastRun) existing.last_run = lastRun;
      if (nextRun) existing.next_run = nextRun;
      existing.accumulated_cost = (existing.accumulated_cost || 0) + cost;
      return existing;
    }
    cronJobs.push({
      id: cronJobs.length + 1,
      name,
      schedule,
      last_run: lastRun,
      next_run: nextRun,
      status: 'active',
      accumulated_cost: cost
    });
    return cronJobs[cronJobs.length - 1];
  }
};

// Connected channels (from Gateway or manual)
let channels = [
  { id: 'telegram', name: 'Telegram', status: 'active', last_seen: new Date().toISOString() },
  { id: 'whatsapp', name: 'WhatsApp', status: 'not_linked', last_seen: null }
];
export const channelsStore = {
  getAll: () => [...channels],
  update: (id, status) => {
    const c = channels.find(x => x.id === id);
    if (c) {
      c.status = status;
      if (status === 'active') c.last_seen = new Date().toISOString();
    }
  }
};

function seedSkillsAndCron() {
  if (skills.length === 0) {
    ['weather', 'clawhub', 'healthcheck', 'create-rule', 'create-skill', 'update-cursor-settings'].forEach((name, i) => {
      skills.push({
        id: i + 1,
        name,
        description: `${name} skill`,
        usage_count: Math.floor(Math.random() * 20),
        last_used: new Date(Date.now() - i * 3600000).toISOString(),
        status: 'active'
      });
    });
  }
  if (cronJobs.length === 0) {
    cronJobs.push(
      { id: 1, name: 'Dashboard sync', schedule: '0 * * * *', last_run: new Date().toISOString(), next_run: new Date(Date.now() + 3600000).toISOString(), status: 'active', accumulated_cost: 0 },
      { id: 2, name: 'Cost aggregation', schedule: '*/5 * * * *', last_run: new Date().toISOString(), next_run: new Date(Date.now() + 300000).toISOString(), status: 'active', accumulated_cost: 0 }
    );
  }
}

initStore();
seedSkillsAndCron();

export default { projectStore, taskStore, costStore, activityStore };
