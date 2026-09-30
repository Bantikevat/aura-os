/**
 * Universal AURA Command Bar
 * Supports: Normal Chat, Intent Detection, Task Creation, Memory Recall, Research, Navigation
 * Real UI States: Idle, Typing, Searching, Thinking, Executing, Waiting For Confirmation, Success, Error
 */
import { auraStore } from '../../state/auraStore.js';

export function createCommandBar(onNavigate, speakFn) {
  const container = document.createElement('div');
  container.className = 'universal-command-bar-wrapper';

  container.innerHTML = `
    <div class="command-bar-input-box" id="commandBarBox">
      <span class="search-lens-icon">🔍</span>
      <input 
        type="text" 
        id="universalCmdInput" 
        placeholder="Ask AURA anything... (e.g. 'Create task: ...', 'Open settings', 'Remember that...')"
        autocomplete="off"
        aria-label="Universal AURA Command Input"
      />
      <span class="command-state-badge" id="cmdStateBadge" style="display:none;"></span>
      <kbd class="cmd-shortcut-hint" title="Press Ctrl+K or / to search">Ctrl K</kbd>
    </div>

    <!-- Dropdown Suggestions & Live Intent Preview -->
    <div class="command-suggestions-dropdown" id="cmdSuggestions" style="display:none;"></div>

    <!-- Approval Confirmation Modal (NIST Security Gate) -->
    <div class="approval-modal-backdrop" id="approvalModal" style="display:none;">
      <div class="approval-modal-card">
        <div class="approval-header">
          <span class="warning-icon">⚠️</span>
          <h3>Action Approval Required</h3>
        </div>
        <p class="approval-text" id="approvalWarningText"></p>
        <div class="approval-actions">
          <button class="btn-cancel" id="btnCancelApproval">Cancel</button>
          <button class="btn-confirm" id="btnConfirmApproval">Approve & Execute</button>
        </div>
      </div>
    </div>
  `;

  const box = container.querySelector('#commandBarBox');
  const input = container.querySelector('#universalCmdInput');
  const badge = container.querySelector('#cmdStateBadge');
  const dropdown = container.querySelector('#cmdSuggestions');
  const approvalModal = container.querySelector('#approvalModal');
  const approvalWarning = container.querySelector('#approvalWarningText');
  const btnCancel = container.querySelector('#btnCancelApproval');
  const btnConfirm = container.querySelector('#btnConfirmApproval');

  let pendingApprovalData = null;

  function setStateUI(stateName, label) {
    if (stateName === 'idle') {
      badge.style.display = 'none';
      box.classList.remove('loading-pulse', 'state-error', 'state-success');
    } else {
      badge.style.display = 'inline-flex';
      badge.textContent = label || stateName;
      badge.className = `command-state-badge state-${stateName}`;
      if (stateName === 'thinking' || stateName === 'executing') {
        box.classList.add('loading-pulse');
      } else {
        box.classList.remove('loading-pulse');
      }
    }
  }

  // Keyboard shortcut Ctrl+K or /
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement !== input)) {
      e.preventDefault();
      input.focus();
    }
  });

  // Intent suggestions on typing
  input.addEventListener('input', () => {
    const val = input.value.trim();
    if (!val) {
      dropdown.style.display = 'none';
      setStateUI('idle');
      return;
    }

    setStateUI('typing', 'Typing');
    showSuggestions(val);
  });

  function showSuggestions(q) {
    dropdown.innerHTML = `
      <div class="suggest-category">INTENTS</div>
      <div class="suggest-item" data-action="ask">
        <span class="icon">✨</span>
        <div class="text">
          <strong>Ask AURA:</strong> "${q}"
          <span>Reasoning & Contextual Memory</span>
        </div>
      </div>
      <div class="suggest-item" data-action="task">
        <span class="icon">☑️</span>
        <div class="text">
          <strong>Create Task:</strong> "${q}"
          <span>Add to Today's Plan & Verify</span>
        </div>
      </div>
      <div class="suggest-item" data-action="memory">
        <span class="icon">⏱️</span>
        <div class="text">
          <strong>Search Memory:</strong> "${q}"
          <span>Retrieve stored personal facts</span>
        </div>
      </div>
      <div class="suggest-item" data-action="research">
        <span class="icon">🔬</span>
        <div class="text">
          <strong>Deep Research:</strong> "${q}"
          <span>Web & Knowledge synthesis</span>
        </div>
      </div>
    `;
    dropdown.style.display = 'flex';

    dropdown.querySelectorAll('.suggest-item').forEach(item => {
      item.addEventListener('click', () => {
        const act = item.dataset.action;
        dropdown.style.display = 'none';
        if (act === 'task' && !q.toLowerCase().startsWith('create task')) {
          executeCommand(`Create task: ${q}`);
        } else if (act === 'memory' && !q.toLowerCase().startsWith('remember')) {
          executeCommand(`What do you remember about ${q}`);
        } else if (act === 'research' && !q.toLowerCase().startsWith('research')) {
          executeCommand(`Research ${q}`);
        } else {
          executeCommand(q);
        }
      });
    });
  }

  // Execute Command via real backend /api/execute
  async function executeCommand(cmd, isApproved = false, token = null) {
    const query = (cmd || input.value || '').trim();
    if (!query) return;

    dropdown.style.display = 'none';
    setStateUI('thinking', 'Thinking...');
    auraStore.setState({ activityState: 'thinking' });

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          userApproved: isApproved,
          confirmationToken: token
        })
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();

      // Check if requires approval (NIST Policy Gate)
      if (data.status === 'waiting_for_confirmation') {
        setStateUI('waiting', 'Approval Needed');
        pendingApprovalData = { query, token: data.confirmationToken };
        approvalWarning.textContent = data.warning;
        approvalModal.style.display = 'flex';
        return;
      }

      if (data.status === 'verified_complete') {
        setStateUI('success', 'Verified Done');
        auraStore.setState({ activityState: 'speaking' });

        if (speakFn) speakFn(data.response);

        // If action implies navigation, execute
        if (data.navigateTo && onNavigate) {
          setTimeout(() => onNavigate(data.navigateTo), 800);
        }

        // Refresh state store
        auraStore.fetchNotifications();

        setTimeout(() => {
          setStateUI('idle');
          auraStore.setState({ activityState: 'idle' });
        }, 3000);
      } else {
        setStateUI('success', 'Complete');
        if (speakFn) speakFn(data.response || 'Executed successfully.');
        setTimeout(() => setStateUI('idle'), 2500);
      }
    } catch (err) {
      setStateUI('error', 'Execution Failed');
      if (speakFn) speakFn(`Error: ${err.message}`);
      setTimeout(() => setStateUI('idle'), 3500);
    }
  }

  // Modal Handlers
  btnCancel.addEventListener('click', () => {
    approvalModal.style.display = 'none';
    pendingApprovalData = null;
    setStateUI('idle');
  });

  btnConfirm.addEventListener('click', () => {
    approvalModal.style.display = 'none';
    if (pendingApprovalData) {
      executeCommand(pendingApprovalData.query, true, pendingApprovalData.token);
      pendingApprovalData = null;
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      executeCommand(input.value);
    }
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) dropdown.style.display = 'none';
  });

  return container;
}
