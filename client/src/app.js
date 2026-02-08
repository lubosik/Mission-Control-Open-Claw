// Mission Control Dashboard - Client App

const API_BASE = 'http://127.0.0.1:3333/api';
const WS_URL = 'ws://127.0.0.1:3333';

let ws = null;
let startTime = Date.now();

// Initialize WebSocket
function connectWebSocket() {
  ws = new WebSocket(WS_URL);
  
  ws.onopen = () => {
    console.log('✅ Connected to Mission Control server');
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    handleRealtimeUpdate(data);
  };
  
  ws.onclose = () => {
    console.log('⚠️  Disconnected from server. Reconnecting...');
    setTimeout(connectWebSocket, 3000);
  };
}

// Handle real-time updates
function handleRealtimeUpdate(data) {
  if (data.type === 'gateway_event') {
    // Handle Gateway events
    console.log('Gateway event:', data.data);
  }
}

// Fetch and display projects
async function loadProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    const projects = await res.json();
    
    // Count by status
    const counts = { queued: 0, in_progress: 0, completed: 0 };
    
    // Clear columns
    const columns = {
      queued: document.getElementById('projects-queued'),
      in_progress: document.getElementById('projects-in-progress'),
      completed: document.getElementById('projects-completed')
    };
    
    Object.values(columns).forEach(col => col.innerHTML = '');
    
    // Render projects
    if (projects.length === 0) {
      columns.queued.innerHTML = '<div class="text-secondary text-sm text-center py-8">No projects yet</div>';
    } else {
      projects.forEach(project => {
        counts[project.status]++;
        const card = createProjectCard(project);
        const column = columns[project.status];
        if (column) column.appendChild(card);
      });
      
      // Show empty state for empty columns
      Object.entries(columns).forEach(([status, col]) => {
        if (counts[status] === 0) {
          const messages = {
            queued: 'No queued projects',
            in_progress: 'No active projects',
            completed: 'No completed projects'
          };
          col.innerHTML = `<div class="text-secondary text-sm text-center py-8">${messages[status]}</div>`;
        }
      });
    }
    
    // Update counts
    document.getElementById('count-queued').textContent = counts.queued;
    document.getElementById('count-in-progress').textContent = counts.in_progress;
    document.getElementById('count-completed').textContent = counts.completed;
    
  } catch (err) {
    console.error('Failed to load projects:', err);
  }
}

// Create project card element
function createProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'glass-panel p-4 cursor-pointer hover:scale-105 transition-transform';
  
  const priorityEmoji = { high: '🔴', medium: '🟡', low: '🟢' };
  const priorityColor = { high: 'rgb(244, 63, 94)', medium: 'rgb(245, 158, 11)', low: 'rgb(16, 185, 129)' };
  const tags = (project.tags || '').split(',').filter(t => t.trim());
  
  card.innerHTML = `
    <div class="flex items-start justify-between mb-2">
      <h4 class="text-primary font-medium text-sm flex-1">${project.name}</h4>
      <span class="ml-2">${priorityEmoji[project.priority] || '⚪'}</span>
    </div>
    <p class="text-secondary text-xs mb-3">${project.description || 'No description'}</p>
    
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
    
    ${project.actual_cost > 0 ? `
      <div class="text-xs text-secondary mb-2">
        Cost: <span class="text-accent stat-number">$${project.actual_cost.toFixed(4)}</span>
      </div>
    ` : ''}
    
    ${tags.length > 0 ? `
      <div class="flex gap-1 flex-wrap">
        ${tags.map(tag => `<span class="text-xs px-2 py-0.5 rounded bg-white/5 text-secondary">${tag.trim()}</span>`).join('')}
      </div>
    ` : ''}
  `;
  
  return card;
}

// New project modal
function initProjectModal() {
  const modal = document.getElementById('modal-new-project');
  const btnNew = document.getElementById('btn-new-project');
  const btnCancel = document.getElementById('btn-cancel-project');
  const form = document.getElementById('form-new-project');
  
  btnNew.addEventListener('click', () => {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  });
  
  btnCancel.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    form.reset();
  });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = {
      name: formData.get('name'),
      description: formData.get('description'),
      priority: formData.get('priority'),
      status: formData.get('status'),
      tags: formData.get('tags')
    };
    
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        form.reset();
        await loadProjects();
      }
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project');
    }
  });
}

// Update status bar
async function updateStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    const status = await res.json();
    
    // Update uptime
    const uptime = Math.floor(status.uptime);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    document.getElementById('uptime').textContent = 
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  } catch (err) {
    console.error('Failed to fetch status:', err);
  }
}

// Update costs
async function updateCosts() {
  try {
    const [summary, byModel, byFeature, hourly, budget] = await Promise.all([
      fetch(`${API_BASE}/costs/summary`).then(r => r.json()),
      fetch(`${API_BASE}/costs/by-model`).then(r => r.json()),
      fetch(`${API_BASE}/costs/by-feature`).then(r => r.json()),
      fetch(`${API_BASE}/costs/hourly`).then(r => r.json()),
      fetch(`${API_BASE}/costs/budget`).then(r => r.json())
    ]);
    
    // Update top bar
    document.getElementById('cost-today').textContent = `$${summary.today.cost.toFixed(2)}`;
    document.getElementById('cost-week').textContent = `$${summary.week.cost.toFixed(2)}`;
    document.getElementById('cost-month').textContent = `$${summary.month.cost.toFixed(2)}`;
    
    // Update token usage card
    document.getElementById('tokens-input').textContent = summary.today.input.toLocaleString();
    document.getElementById('tokens-output').textContent = summary.today.output.toLocaleString();
    document.getElementById('tokens-cache-read').textContent = summary.today.cacheRead.toLocaleString();
    document.getElementById('tokens-cache-write').textContent = summary.today.cacheWrite.toLocaleString();
    document.getElementById('tokens-cost').textContent = `$${summary.today.cost.toFixed(2)}`;
    
    // Update detailed cost tracker
    document.getElementById('cost-detail-today').textContent = `$${summary.today.cost.toFixed(2)}`;
    document.getElementById('cost-detail-week').textContent = `$${summary.week.cost.toFixed(2)}`;
    document.getElementById('cost-detail-month').textContent = `$${summary.month.cost.toFixed(2)}`;
    
    // Budget bars
    renderBudgetBar('budget-today-bar', budget.daily);
    renderBudgetBar('budget-month-bar', budget.monthly);
    
    // Model breakdown
    renderBreakdown('model-breakdown', byModel);
    
    // Feature breakdown
    renderBreakdown('feature-breakdown', byFeature);
    
    // Hourly chart
    renderHourlyChart(hourly);
    
  } catch (err) {
    console.error('Failed to fetch costs:', err);
  }
}

function renderBudgetBar(id, budget) {
  const el = document.getElementById(id);
  if (!el) return;
  
  const colors = {
    safe: '#10b981',
    caution: '#3b82f6',
    warning: '#f59e0b',
    danger: '#f43f5e'
  };
  
  const percent = Math.min(budget.percent, 100);
  
  el.innerHTML = `
    <div class="flex justify-between text-xs text-secondary mb-1">
      <span>${budget.alert.toUpperCase()}</span>
      <span>${percent.toFixed(0)}% of $${budget.limit.toFixed(2)}</span>
    </div>
    <div class="w-full bg-white/5 rounded-full h-2">
      <div class="h-2 rounded-full transition-all duration-500" 
           style="width: ${percent}%; background: ${colors[budget.alert]}"></div>
    </div>
  `;
}

function renderBreakdown(id, data) {
  const el = document.getElementById(id);
  if (!el) return;
  
  const entries = Object.entries(data).sort((a, b) => b[1].cost - a[1].cost);
  
  if (entries.length === 0) {
    el.innerHTML = '<div class="text-secondary">No data yet</div>';
    return;
  }
  
  el.innerHTML = entries.map(([name, info]) => `
    <div class="flex justify-between items-center">
      <span class="text-primary">${name}</span>
      <span class="text-accent stat-number">$${info.cost.toFixed(4)}</span>
    </div>
  `).join('');
}

function renderHourlyChart(hourly) {
  const el = document.getElementById('hourly-chart');
  if (!el) return;
  
  const max = Math.max(...hourly.map(h => h.cost), 0.01);
  const currentHour = new Date().getHours();
  
  el.innerHTML = `
    <div class="flex items-end justify-between h-full gap-0.5">
      ${hourly.map((h, i) => {
        const height = max > 0 ? (h.cost / max) * 100 : 0;
        const isCurrent = i === currentHour;
        return `
          <div class="flex-1 flex flex-col justify-end group relative" title="Hour ${h.hour}: $${h.cost.toFixed(4)}">
            <div class="rounded-t transition-all duration-300 ${isCurrent ? 'bg-accent' : 'bg-white/30 group-hover:bg-white/50'}" 
                 style="height: ${height}%; min-height: ${h.cost > 0 ? '2px' : '0'}"></div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// Update agent status
async function updateAgentStatus() {
  try {
    const res = await fetch(`${API_BASE}/costs/session-stats`);
    const stats = await res.json();
    
    if (stats.status) {
      const statusText = stats.status.charAt(0).toUpperCase() + stats.status.slice(1);
      document.getElementById('agent-status').textContent = statusText;
    }
    
    if (stats.lastActivity) {
      const lastTime = new Date(stats.lastActivity);
      const now = new Date();
      const diffMs = now - lastTime;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) {
        document.getElementById('last-activity').textContent = 'Just now';
      } else if (diffMins < 60) {
        document.getElementById('last-activity').textContent = `${diffMins}m ago`;
      } else {
        const diffHours = Math.floor(diffMins / 60);
        document.getElementById('last-activity').textContent = `${diffHours}h ago`;
      }
    }
  } catch (err) {
    console.error('Failed to fetch agent status:', err);
  }
}

// Update current time
function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('current-time').textContent = `${hours}:${minutes}`;
}

// Initialize dashboard
function init() {
  connectWebSocket();
  loadProjects();
  updateStatus();
  updateCosts();
  updateClock();
  initProjectModal();
  
  // Refresh intervals
  setInterval(updateStatus, 1000);
  setInterval(updateCosts, 10000);
  setInterval(updateAgentStatus, 5000);
  setInterval(updateClock, 1000);
  setInterval(loadProjects, 5000);
  
  // Initial load
  updateAgentStatus();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
