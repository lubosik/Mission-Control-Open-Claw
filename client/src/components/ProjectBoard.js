// Kanban Project Board Component

export async function loadProjects() {
  try {
    const res = await fetch('/api/projects');
    const projects = await res.json();
    
    // Clear columns
    document.getElementById('projects-queued').innerHTML = '';
    document.getElementById('projects-in-progress').innerHTML = '';
    document.getElementById('projects-completed').innerHTML = '';
    
    // Render projects
    projects.forEach(project => {
      const card = createProjectCard(project);
      const columnId = `projects-${project.status.replace('_', '-')}`;
      const column = document.getElementById(columnId);
      if (column) column.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load projects:', err);
  }
}

export function createProjectCard(project) {
  const card = document.createElement('div');
  card.className = 'glass-panel p-4 cursor-pointer hover:scale-105 transition-transform';
  card.dataset.projectId = project.id;
  
  const priorityEmoji = {
    high: '🔴',
    medium: '🟡',
    low: '🟢'
  };
  
  const priorityColor = {
    high: 'rgb(244, 63, 94)',
    medium: 'rgb(245, 158, 11)',
    low: 'rgb(16, 185, 129)'
  };
  
  const tags = (project.tags || '').split(',').filter(t => t.trim());
  
  card.innerHTML = `
    <div class="flex items-start justify-between mb-2">
      <h4 class="text-primary font-medium text-sm flex-1">${project.name}</h4>
      <span class="ml-2">${priorityEmoji[project.priority] || '⚪'}</span>
    </div>
    
    <p class="text-secondary text-xs mb-3 line-clamp-2">${project.description || 'No description'}</p>
    
    <div class="mb-3">
      <div class="flex justify-between text-xs text-secondary mb-1">
        <span>Progress</span>
        <span class="stat-number">${project.progress}%</span>
      </div>
      <div class="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
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
        ${tags.map(tag => 
          `<span class="text-xs px-2 py-0.5 rounded bg-white/5 text-secondary hover:bg-white/10 transition-colors">${tag.trim()}</span>`
        ).join('')}
      </div>
    ` : ''}
    
    ${project.status_notes ? `
      <div class="mt-2 pt-2 border-t border-white/5 text-xs text-secondary">
        ${project.status_notes}
      </div>
    ` : ''}
  `;
  
  // Click to expand (future enhancement)
  card.addEventListener('click', () => {
    showProjectDetail(project);
  });
  
  return card;
}

function showProjectDetail(project) {
  // TODO: Modal with full project details
  console.log('Show project detail:', project);
  alert(`Project: ${project.name}\n\nProgress: ${project.progress}%\nCost: $${project.actual_cost || 0}\n\n${project.description}`);
}

// Create new project via API
export async function createProject(data) {
  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    console.log('✅ Project created:', result);
    await loadProjects(); // Reload board
    return result;
  } catch (err) {
    console.error('Failed to create project:', err);
    return null;
  }
}

// Update project progress/status
export async function updateProject(id, updates) {
  try {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const result = await res.json();
    console.log('✅ Project updated:', result);
    await loadProjects(); // Reload board
    return result;
  } catch (err) {
    console.error('Failed to update project:', err);
    return null;
  }
}
