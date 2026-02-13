// Mission Control Dashboard - Client App

// Vercel: use same origin. Local: use 127.0.0.1:3333
const API_BASE = typeof window !== 'undefined' && !['127.0.0.1', 'localhost'].includes(window.location.hostname)
  ? `${window.location.origin}/api`
  : 'http://127.0.0.1:3333/api';
const WS_URL = typeof window !== 'undefined' && !['127.0.0.1', 'localhost'].includes(window.location.hostname)
  ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/`
  : 'ws://127.0.0.1:3333';

let ws = null;
let currentDetailProjectId = null;

// Initialize WebSocket (only when not on Vercel - serverless has no WS)
function connectWebSocket() {
  try {
    ws = new WebSocket(WS_URL);
    ws.onopen = () => console.log('✅ Connected to Mission Control server');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleRealtimeUpdate(data);
      } catch (_) {}
    };
    ws.onclose = () => {
      console.log('⚠️  Disconnected. Reconnecting...');
      setTimeout(connectWebSocket, 5000);
    };
  } catch (e) {
    console.log('WebSocket unavailable (e.g. Vercel) - using polling');
  }
}

function handleRealtimeUpdate(data) {
  if (data.type === 'gateway_event') {
    loadProjects();
    loadTasks();
  }
  if (data.type === 'projects_updated') loadProjects();
  if (data.type === 'tasks_updated') loadTasks();
  if (data.type === 'activity' || data.type === 'agent_event') loadActivity();
}

// Fetch and display projects
async function loadProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    const projects = await res.json();
    const counts = { queued: 0, in_progress: 0, completed: 0 };
    const columns = {
      queued: document.getElementById('projects-queued'),
      in_progress: document.getElementById('projects-in-progress'),
      completed: document.getElementById('projects-completed')
    };
    Object.values(columns).forEach(col => { if (col) col.innerHTML = ''; });

    if (projects.length === 0) {
      if (columns.queued) columns.queued.innerHTML = '<div class="text-secondary text-sm text-center py-8">No projects yet</div>';
    } else {
      projects.forEach(project => {
        counts[project.status] = (counts[project.status] || 0) + 1;
        const card = createProjectCard(project);
        const col = columns[project.status];
        if (col) col.appendChild(card);
      });
      Object.entries(columns).forEach(([status, col]) => {
        if (col && counts[status] === 0) {
          const messages = { queued: 'No queued projects', in_progress: 'No active projects', completed: 'No completed projects' };
          col.innerHTML = `<div class="text-secondary text-sm text-center py-8">${messages[status]}</div>`;
        }
      });
    }

    ['count-queued', 'count-in-progress', 'count-completed'].forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) el.textContent = counts[['queued', 'in_progress', 'completed'][i]] || 0;
    });
  } catch (err) {
    console.error('Failed to load projects:', err);
  }
}

// Create project card with click handler
function createProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'glass-panel p-4 cursor-pointer hover:scale-[1.02] transition-transform draggable-project';
  card.dataset.projectId = project.id;
  card.draggable = true;

  const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
  const priorityColor = { high: 'rgb(244, 63, 94)', medium: 'rgb(245, 158, 11)', low: 'rgb(16, 185, 129)' };
  const tags = (project.tags || '').split(',').filter(t => t.trim());

  card.innerHTML = `
    <div class="flex items-start justify-between mb-2">
      <h4 class="text-primary font-medium text-sm flex-1">${escapeHtml(project.name)}</h4>
      <span class="ml-2">${priorityEmoji[project.priority] || '⚪'}</span>
    </div>
    <p class="text-secondary text-xs mb-3 line-clamp-2">${escapeHtml(project.description || 'No description')}</p>
    <div class="mb-3">
      <div class="flex justify-between text-xs text-secondary mb-1">
        <span>Progress</span>
        <span class="stat-number">${project.progress}%</span>
      </div>
      <div class="w-full bg-white/5 rounded-full h-1.5">
        <div class="h-1.5 rounded-full transition-all duration-500" 
             style="width: ${project.progress}%; background: linear-gradient(90deg, ${priorityColor[project.priority]}, #3b82f6)"></div>
      </div>
    </div>
    ${project.actual_cost > 0 ? `<div class="text-xs text-secondary mb-2">Cost: <span class="text-accent stat-number">$${Number(project.actual_cost).toFixed(4)}</span></div>` : ''}
    ${tags.length > 0 ? `<div class="flex gap-1 flex-wrap">${tags.map(t => `<span class="text-xs px-2 py-0.5 rounded bg-white/5 text-secondary">${escapeHtml(t.trim())}</span>`).join('')}</div>` : ''}
  `;

  card.addEventListener('click', (e) => {
    if (!e.target.closest('button')) showProjectDetail(project.id);
  });
  initCardDrag(card, project);
  return card;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

// Kanban drag and drop
function initCardDrag(card, project) {
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('projectId', project.id);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('opacity-50');
  });
  card.addEventListener('dragend', () => card.classList.remove('opacity-50'));
}

function initColumnDrops() {
  const columns = [
    { id: 'projects-queued', status: 'queued' },
    { id: 'projects-in-progress', status: 'in_progress' },
    { id: 'projects-completed', status: 'completed' }
  ];
  columns.forEach(({ id, status }) => {
    const col = document.getElementById(id);
    if (!col) return;
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('ring-2', 'ring-accent/50');
    });
    col.addEventListener('dragleave', () => col.classList.remove('ring-2', 'ring-accent/50'));
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('ring-2', 'ring-accent/50');
      const projectId = e.dataTransfer.getData('projectId');
      if (!projectId) return;
      try {
        const res = await fetch(`${API_BASE}/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
        });
        if (res.ok) await loadProjects();
      } catch (err) {
        console.error('Failed to update project status:', err);
      }
    });
  });
}

// Project detail modal
async function showProjectDetail(projectId) {
  currentDetailProjectId = projectId;
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}`);
    const project = await res.json();
    const tasks = project.tasks || [];

    const priorityEmoji = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' };
    document.getElementById('detail-project-name').textContent = project.name;
    document.getElementById('detail-description').textContent = project.description || '—';
    document.getElementById('detail-progress').textContent = `${project.progress}%`;
    document.getElementById('detail-progress-bar').style.width = `${project.progress}%`;
    document.getElementById('detail-cost').textContent = `$${(project.actual_cost || 0).toFixed(2)}`;
    document.getElementById('detail-priority').textContent = priorityEmoji[project.priority] || '—';

    const notesEl = document.getElementById('detail-status-notes');
    if (project.status_notes) {
      notesEl.textContent = project.status_notes;
      notesEl.style.display = 'block';
    } else {
      notesEl.style.display = 'none';
    }

    const tasksEl = document.getElementById('detail-tasks');
    if (tasks.length === 0) {
      tasksEl.innerHTML = '<div class="text-secondary">No tasks</div>';
    } else {
      tasksEl.innerHTML = tasks.map(t => `
        <div class="flex items-center justify-between p-2 rounded bg-white/5">
          <div>
            <span class="text-primary">${escapeHtml(t.name)}</span>
            ${t.description ? `<span class="text-secondary text-xs block">${escapeHtml(t.description)}</span>` : ''}
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs px-2 py-0.5 rounded ${t.complexity === 'high' ? 'bg-red-500/20' : t.complexity === 'low' ? 'bg-green-500/20' : 'bg-amber-500/20'}">${t.complexity}</span>
            <span class="text-accent text-xs">Momentum: ${t.momentum_score || 50}</span>
          </div>
        </div>
      `).join('');
    }

    document.getElementById('task-project-id').value = projectId;
    document.getElementById('modal-project-detail').classList.remove('hidden');
    document.getElementById('modal-project-detail').classList.add('flex');
  } catch (err) {
    console.error('Failed to load project:', err);
  }
}

// Phase 4: Skills, Cron, Activity, Channels
async function loadSkills() {
  try {
    const res = await fetch(`${API_BASE}/skills`);
    const skills = await res.json();
    const countEl = document.getElementById('skills-count');
    const topEl = document.getElementById('skills-top');
    const listEl = document.getElementById('skills-list');
    if (countEl) countEl.textContent = skills.length;
    if (topEl) topEl.textContent = skills.length ? `Top: ${skills.slice(0, 3).map(s => s.name).join(', ')}` : '—';
    if (listEl) {
      listEl.innerHTML = skills.length ? skills.map(s => `
        <div class="flex justify-between items-center p-2 rounded bg-white/5">
          <span class="text-primary">${escapeHtml(s.name)}</span>
          <span class="text-secondary text-xs">${s.usage_count || 0} uses</span>
        </div>
      `).join('') : '<div class="text-secondary">No skills</div>';
    }
  } catch (err) {
    console.error('Failed to load skills:', err);
  }
}

async function loadCron() {
  try {
    const res = await fetch(`${API_BASE}/cron`);
    const jobs = await res.json();
    const el = document.getElementById('cron-list');
    if (!el) return;
    el.innerHTML = jobs.length ? jobs.map(j => `
      <div class="p-2 rounded bg-white/5">
        <div class="text-primary font-medium">${escapeHtml(j.name)}</div>
        <div class="text-secondary text-xs">${escapeHtml(j.schedule)}</div>
        <div class="text-secondary text-xs">Next: ${j.next_run ? new Date(j.next_run).toLocaleTimeString() : '—'}</div>
      </div>
    `).join('') : '<div class="text-secondary">No cron jobs</div>';
  } catch (err) {
    console.error('Failed to load cron:', err);
  }
}

async function loadActivity() {
  try {
    const res = await fetch(`${API_BASE}/activity?limit=20`);
    const items = await res.json();
    const el = document.getElementById('activity-feed');
    if (!el) return;
    el.innerHTML = items.length ? items.map(a => `
      <div class="activity-item p-2 rounded bg-white/5 flex gap-2">
        <span class="text-accent text-xs shrink-0">${formatTime(a.timestamp)}</span>
        <span class="text-primary text-xs">${escapeHtml(a.message)}</span>
      </div>
    `).join('') : '<div class="text-secondary">No activity</div>';
  } catch (err) {
    console.error('Failed to load activity:', err);
  }
}

function formatTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

async function loadChannels() {
  try {
    const res = await fetch(`${API_BASE}/channels`);
    const channels = await res.json();
    const el = document.getElementById('channels-list');
    if (!el) return;
    el.innerHTML = channels.map(c => `
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}"></div>
          <span class="text-primary">${escapeHtml(c.name)}</span>
        </div>
        <span class="text-secondary text-xs">${c.status === 'active' ? 'Active' : 'Not linked'}</span>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load channels:', err);
  }
}

// Task queue
async function loadTasks() {
  try {
    const res = await fetch(`${API_BASE}/tasks`);
    const tasks = await res.json();
    const el = document.getElementById('task-queue');
    if (!el) return;

    if (tasks.length === 0) {
      el.innerHTML = '<div class="text-secondary text-sm text-center py-6">No tasks in queue</div>';
      return;
    }

    el.innerHTML = tasks.map(t => `
      <div class="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
        <div>
          <span class="text-primary font-medium">${escapeHtml(t.name)}</span>
          ${t.description ? `<span class="text-secondary text-xs block">${escapeHtml(t.description)}</span>` : ''}
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">Momentum: ${t.momentum_score || 50}</span>
          <span class="text-secondary text-xs">${t.complexity || 'medium'}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to load tasks:', err);
  }
}

// New project modal
function initProjectModal() {
  const modal = document.getElementById('modal-new-project');
  const btnNew = document.getElementById('btn-new-project');
  const btnCancel = document.getElementById('btn-cancel-project');
  const form = document.getElementById('form-new-project');
  if (!modal || !form) return;

  btnNew?.addEventListener('click', () => { modal.classList.remove('hidden'); modal.classList.add('flex'); });
  btnCancel?.addEventListener('click', () => { modal.classList.add('hidden'); modal.classList.remove('flex'); form.reset(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = { name: formData.get('name'), description: formData.get('description'), priority: formData.get('priority'), status: formData.get('status'), tags: formData.get('tags') };
    try {
      const res = await fetch(`${API_BASE}/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (res.ok) {
        modal.classList.add('hidden'); modal.classList.remove('flex'); form.reset();
        await loadProjects();
      }
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project');
    }
  });
}

// New task modal
function initTaskModal() {
  const modal = document.getElementById('modal-new-task');
  const btnNew = document.getElementById('btn-new-task');
  const btnCancel = document.getElementById('btn-cancel-task');
  const btnAddInDetail = document.getElementById('btn-add-task-detail');
  const form = document.getElementById('form-new-task');
  const detailModal = document.getElementById('modal-project-detail');
  const closeDetail = document.getElementById('btn-close-detail');
  if (!modal || !form) return;

  const open = (projectId = '') => {
    document.getElementById('task-project-id').value = projectId;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };
  const close = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    form.reset();
  };

  btnNew?.addEventListener('click', () => open());
  btnAddInDetail?.addEventListener('click', () => {
    if (currentDetailProjectId) open(currentDetailProjectId);
  });
  btnCancel?.addEventListener('click', close);
  closeDetail?.addEventListener('click', () => {
    detailModal.classList.add('hidden');
    detailModal.classList.remove('flex');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const projectId = formData.get('project_id');
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      project_id: projectId || null,
      complexity: formData.get('complexity'),
      momentum_score: parseInt(formData.get('momentum_score') || 50, 10)
    };
    try {
      const res = await fetch(`${API_BASE}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (res.ok) {
        close();
        await loadTasks();
        if (currentDetailProjectId) showProjectDetail(currentDetailProjectId);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
      alert('Failed to create task');
    }
  });
}

// Status, costs, agent
async function updateStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    const status = await res.json();
    const uptime = Math.floor(status.uptime);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    const el = document.getElementById('uptime');
    if (el) el.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } catch (err) {
    console.error('Failed to fetch status:', err);
  }
}

async function updateCosts() {
  try {
    const [summary, byModel, byFeature, hourly, budget] = await Promise.all([
      fetch(`${API_BASE}/costs/summary`).then(r => r.json()),
      fetch(`${API_BASE}/costs/by-model`).then(r => r.json()),
      fetch(`${API_BASE}/costs/by-feature`).then(r => r.json()),
      fetch(`${API_BASE}/costs/hourly`).then(r => r.json()),
      fetch(`${API_BASE}/costs/budget`).then(r => r.json())
    ]);
    document.getElementById('cost-today').textContent = `$${summary.today.cost.toFixed(2)}`;
    document.getElementById('cost-week').textContent = `$${summary.week.cost.toFixed(2)}`;
    document.getElementById('cost-month').textContent = `$${summary.month.cost.toFixed(2)}`;
    document.getElementById('tokens-input').textContent = summary.today.input.toLocaleString();
    document.getElementById('tokens-output').textContent = summary.today.output.toLocaleString();
    document.getElementById('tokens-cache-read').textContent = summary.today.cacheRead.toLocaleString();
    document.getElementById('tokens-cache-write').textContent = summary.today.cacheWrite.toLocaleString();
    document.getElementById('tokens-cost').textContent = `$${summary.today.cost.toFixed(2)}`;
    document.getElementById('cost-detail-today').textContent = `$${summary.today.cost.toFixed(2)}`;
    document.getElementById('cost-detail-week').textContent = `$${summary.week.cost.toFixed(2)}`;
    document.getElementById('cost-detail-month').textContent = `$${summary.month.cost.toFixed(2)}`;
    renderBudgetBar('budget-today-bar', budget.daily);
    renderBudgetBar('budget-month-bar', budget.monthly);
    renderBreakdown('model-breakdown', byModel);
    renderBreakdown('feature-breakdown', byFeature);
    renderHourlyChart(hourly);
  } catch (err) {
    console.error('Failed to fetch costs:', err);
  }
}

function renderBudgetBar(id, budget) {
  const el = document.getElementById(id);
  if (!el || !budget) return;
  const colors = { safe: '#10b981', caution: '#3b82f6', warning: '#f59e0b', danger: '#f43f5e' };
  const percent = Math.min(budget.percent, 100);
  el.innerHTML = `
    <div class="flex justify-between text-xs text-secondary mb-1">
      <span>${(budget.alert || 'safe').toUpperCase()}</span>
      <span>${percent.toFixed(0)}% of $${(budget.limit || 0).toFixed(2)}</span>
    </div>
    <div class="w-full bg-white/5 rounded-full h-2">
      <div class="h-2 rounded-full transition-all duration-500" style="width: ${percent}%; background: ${colors[budget.alert] || colors.safe}"></div>
    </div>
  `;
}

function renderBreakdown(id, data) {
  const el = document.getElementById(id);
  if (!el) return;
  const entries = Object.entries(data).sort((a, b) => (b[1]?.cost || 0) - (a[1]?.cost || 0));
  if (entries.length === 0) {
    el.innerHTML = '<div class="text-secondary">No data yet</div>';
    return;
  }
  el.innerHTML = entries.map(([name, info]) => `
    <div class="flex justify-between items-center">
      <span class="text-primary">${escapeHtml(name)}</span>
      <span class="text-accent stat-number">$${(info?.cost || 0).toFixed(4)}</span>
    </div>
  `).join('');
}

function renderHourlyChart(hourly) {
  const el = document.getElementById('hourly-chart');
  if (!el || !hourly) return;
  const max = Math.max(...hourly.map(h => h.cost), 0.01);
  const currentHour = new Date().getHours();
  el.innerHTML = `
    <div class="flex items-end justify-between h-full gap-0.5">
      ${hourly.map((h, i) => {
        const height = max > 0 ? (h.cost / max) * 100 : 0;
        const isCurrent = i === currentHour;
        return `<div class="flex-1 flex flex-col justify-end group relative" title="Hour ${h.hour}: $${(h.cost || 0).toFixed(4)}">
          <div class="rounded-t transition-all duration-300 ${isCurrent ? 'bg-accent' : 'bg-white/30 group-hover:bg-white/50'}" style="height: ${height}%; min-height: ${(h.cost || 0) > 0 ? '2px' : '0'}"></div>
        </div>`;
      }).join('')}
    </div>
  `;
}

async function updateAgentStatus() {
  try {
    const res = await fetch(`${API_BASE}/costs/session-stats`);
    const stats = await res.json();
    const statusEl = document.getElementById('agent-status');
    const activityEl = document.getElementById('last-activity');
    if (stats.status && statusEl) statusEl.textContent = stats.status.charAt(0).toUpperCase() + stats.status.slice(1);
    if (stats.lastActivity && activityEl) {
      const diffMins = Math.floor((Date.now() - new Date(stats.lastActivity)) / 60000);
      activityEl.textContent = diffMins < 1 ? 'Just now' : diffMins < 60 ? `${diffMins}m ago` : `${Math.floor(diffMins / 60)}h ago`;
    }
  } catch (err) {
    console.error('Failed to fetch agent status:', err);
  }
}

function updateClock() {
  const now = new Date();
  const el = document.getElementById('current-time');
  if (el) el.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function init() {
  connectWebSocket();
  loadProjects();
  loadTasks();
  loadSkills();
  loadCron();
  loadActivity();
  loadChannels();
  updateStatus();
  updateCosts();
  updateClock();
  initProjectModal();
  initTaskModal();
  initColumnDrops();
  setInterval(updateStatus, 1000);
  setInterval(updateCosts, 10000);
  setInterval(updateAgentStatus, 5000);
  setInterval(updateClock, 1000);
  setInterval(loadProjects, 5000);
  setInterval(loadTasks, 10000);
  setInterval(loadActivity, 5000);
  updateAgentStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
