// Cost Tracker Component - Detailed cost visualization

export function createCostTracker() {
  const container = document.createElement('div');
  container.className = 'glass-panel p-6';
  container.innerHTML = `
    <h2 class="text-primary font-light text-2xl mb-6">Cost Tracker</h2>
    
    <!-- Summary Cards -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="glass-panel p-4">
        <div class="text-secondary text-sm mb-1">Today</div>
        <div class="text-accent text-2xl font-light stat-number" id="cost-detail-today">$0.00</div>
        <div id="budget-today-bar" class="mt-2"></div>
      </div>
      <div class="glass-panel p-4">
        <div class="text-secondary text-sm mb-1">This Week</div>
        <div class="text-accent text-2xl font-light stat-number" id="cost-detail-week">$0.00</div>
      </div>
      <div class="glass-panel p-4">
        <div class="text-secondary text-sm mb-1">This Month</div>
        <div class="text-accent text-2xl font-light stat-number" id="cost-detail-month">$0.00</div>
        <div id="budget-month-bar" class="mt-2"></div>
      </div>
    </div>
    
    <!-- Model Breakdown -->
    <div class="mb-6">
      <h3 class="text-primary font-light text-lg mb-3">By Model</h3>
      <div id="model-breakdown" class="space-y-2"></div>
    </div>
    
    <!-- Feature Breakdown -->
    <div class="mb-6">
      <h3 class="text-primary font-light text-lg mb-3">By Feature</h3>
      <div id="feature-breakdown" class="space-y-2"></div>
    </div>
    
    <!-- Hourly Chart -->
    <div class="mb-6">
      <h3 class="text-primary font-light text-lg mb-3">Last 24 Hours</h3>
      <div id="hourly-chart" class="h-32"></div>
    </div>
    
    <!-- Daily Chart -->
    <div>
      <h3 class="text-primary font-light text-lg mb-3">Last 30 Days</h3>
      <div id="daily-chart" class="h-48"></div>
    </div>
  `;
  
  return container;
}

export async function updateCostTracker() {
  try {
    const [summary, byModel, byFeature, hourly, budget] = await Promise.all([
      fetch('/api/costs/summary').then(r => r.json()),
      fetch('/api/costs/by-model').then(r => r.json()),
      fetch('/api/costs/by-feature').then(r => r.json()),
      fetch('/api/costs/hourly').then(r => r.json()),
      fetch('/api/costs/budget').then(r => r.json())
    ]);
    
    // Update summary
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
    
    // Charts
    renderHourlyChart(hourly);
    
  } catch (err) {
    console.error('Failed to update cost tracker:', err);
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
      <span>${percent.toFixed(0)}%</span>
    </div>
    <div class="w-full bg-white/5 rounded-full h-1.5">
      <div class="h-1.5 rounded-full transition-all duration-500" 
           style="width: ${percent}%; background: ${colors[budget.alert]}"></div>
    </div>
  `;
}

function renderBreakdown(id, data) {
  const el = document.getElementById(id);
  if (!el) return;
  
  const entries = Object.entries(data).sort((a, b) => b[1].cost - a[1].cost);
  
  if (entries.length === 0) {
    el.innerHTML = '<div class="text-secondary text-sm">No data yet</div>';
    return;
  }
  
  el.innerHTML = entries.map(([name, data]) => `
    <div class="flex justify-between items-center text-sm">
      <span class="text-primary">${name}</span>
      <span class="text-accent stat-number">$${data.cost.toFixed(4)}</span>
    </div>
  `).join('');
}

function renderHourlyChart(hourly) {
  const el = document.getElementById('hourly-chart');
  if (!el) return;
  
  const max = Math.max(...hourly.map(h => h.cost), 0.01);
  const currentHour = new Date().getHours();
  
  el.innerHTML = `
    <div class="flex items-end justify-between h-full gap-1">
      ${hourly.map((h, i) => {
        const height = (h.cost / max) * 100;
        const isCurrent = i === currentHour;
        return `
          <div class="flex-1 flex flex-col justify-end" title="Hour ${h.hour}: $${h.cost.toFixed(4)}">
            <div class="rounded-t transition-all duration-300 ${isCurrent ? 'bg-accent' : 'bg-white/20'}" 
                 style="height: ${height}%"></div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
