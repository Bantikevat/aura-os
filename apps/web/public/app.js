document.addEventListener('DOMContentLoaded', () => {
  const roleSelect = document.getElementById('roleSelect');
  const memoryList = document.getElementById('memoryList');
  const memCountBadge = document.getElementById('memCountBadge');
  const goalsList = document.getElementById('goalsList');
  const goalCountBadge = document.getElementById('goalCountBadge');
  const auditList = document.getElementById('auditList');
  const terminalView = document.getElementById('terminalView');
  const commandInput = document.getElementById('commandInput');
  const sendBtn = document.getElementById('sendBtn');
  const addMemoryForm = document.getElementById('addMemoryForm');
  const memInput = document.getElementById('memInput');
  const memCategory = document.getElementById('memCategory');
  const filterChips = document.querySelectorAll('.chip');

  let activeFilter = 'all';

  // Log to terminal view
  function logTerminal(text, type = 'sys') {
    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = text;
    terminalView.appendChild(line);
    terminalView.scrollTop = terminalView.scrollHeight;
  }

  // Load Memories
  async function loadMemories() {
    try {
      const url = activeFilter === 'all' ? '/api/memories' : `/api/memories?category=${activeFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      
      memCountBadge.textContent = `${data.memories.length} Memories`;
      memoryList.innerHTML = '';

      if (data.memories.length === 0) {
        memoryList.innerHTML = '<div style="color:#64748b;font-size:0.8rem;text-align:center;padding:2rem;">No memories found in this category.</div>';
        return;
      }

      data.memories.forEach(mem => {
        const item = document.createElement('div');
        item.className = 'mem-item';
        item.innerHTML = `
          <div class="mem-header">
            <span class="mem-cat-tag">${mem.category}</span>
            ${mem.verifiedByUser 
              ? '<span class="verified-tag">✔ Verified</span>' 
              : `<button class="verify-btn" onclick="verifyMemory('${mem.id}')">Verify</button>`}
          </div>
          <div class="mem-content">${mem.content}</div>
        `;
        memoryList.appendChild(item);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Verify Memory
  window.verifyMemory = async function(id) {
    await fetch('/api/memories/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    logTerminal(`[MEMORY VERIFIED] User verified memory ID: ${id}`, 'agent');
    loadMemories();
  };

  // Load Goals
  async function loadGoals() {
    try {
      const res = await fetch('/api/goals');
      const data = await res.json();
      goalCountBadge.textContent = `${data.goals.length} Goals`;
      goalsList.innerHTML = '';

      data.goals.forEach(g => {
        const item = document.createElement('div');
        item.className = 'goal-item';
        item.innerHTML = `
          <h4>${g.title}</h4>
          <p>${g.description}</p>
          <div style="font-size:0.7rem;color:#38bdf8;margin-top:4px;">${g.milestones.length} Milestones</div>
        `;
        goalsList.appendChild(item);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Load Audits
  async function loadAudits() {
    try {
      const res = await fetch('/api/audits');
      const data = await res.json();
      auditList.innerHTML = '';

      data.audits.slice(-5).reverse().forEach(a => {
        const item = document.createElement('div');
        item.className = `audit-item ${a.status === 'success' ? '' : 'unverified'}`;
        item.innerHTML = `
          <div><strong>${a.toolName}</strong> — ${a.status.toUpperCase()}</div>
          <div class="audit-meta">${new Date(a.timestamp).toLocaleTimeString()} · ${a.evidence || 'No proof'}</div>
        `;
        auditList.appendChild(item);
      });
    } catch (err) {
      console.error(err);
    }
  }

  // Handle Intent Execution
  async function handleExecute() {
    const prompt = commandInput.value.trim();
    if (!prompt) return;

    const selectedRole = roleSelect.value.toUpperCase();
    logTerminal(`[${selectedRole} > USER]: ${prompt}`, 'user');
    commandInput.value = '';

    logTerminal('[1/5] Evaluating Personal World Model & Intent...', 'sys');

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, userApproved: false })
      });
      const data = await res.json();

      if (data.status === 'verified_complete') {
        logTerminal(`[2/5] Tool Selected: ${data.tool}`, 'sys');
        logTerminal(`[3/5] NIST Trust Policy: Read-Only Authorization Passed`, 'sys');
        logTerminal(`[4/5] Executed: ${JSON.stringify(data.toolOutput.os)} RAM Free: ${data.toolOutput.memory.freeMB} MB`, 'agent');
        logTerminal(`[5/5] ✔ Verified by Engine: ${data.verification.proof}`, 'agent');
        logTerminal(`Audit Recorded: ${data.auditEventId} (${data.durationMs}ms)`, 'audit');
      } else {
        logTerminal(`[AURA]: ${data.response || JSON.stringify(data)}`, 'agent');
      }

      loadMemories();
      loadAudits();
    } catch (err) {
      logTerminal(`[ERROR] Execution failed: ${err.message}`, 'sys');
    }
  }

  sendBtn.addEventListener('click', handleExecute);
  commandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleExecute();
  });

  // Handle Quick Add Memory
  addMemoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = memInput.value.trim();
    const category = memCategory.value;
    if (!content) return;

    await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, category })
    });

    logTerminal(`[MEMORY ADDED] New ${category.toUpperCase()}: "${content}"`, 'agent');
    memInput.value = '';
    loadMemories();
  });

  // Filter chips
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.cat;
      loadMemories();
    });
  });

  // Initial Load
  loadMemories();
  loadGoals();
  loadAudits();
});
