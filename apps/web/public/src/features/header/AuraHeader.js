import { auraVoiceEngine } from '../voice/voiceEngine.js';
/**
 * AURA Master Command Center Header Controller
 * Production-quality, non-destructive, robust event binding
 */
import { auraStore } from '../../state/auraStore.js';

export function mountAuraHeader({ onNavigate, speakFn, onToggleCamera, onToggleScreen }) {
  console.log('[AURA HEADER] Binding luxury command center controls...');

  // 1. Logo -> Home
  const logoTrigger = document.getElementById('auraLogoTrigger');
  if (logoTrigger && onNavigate) {
    logoTrigger.addEventListener('click', () => onNavigate('home', 'Home'));
  }

  // 2. Real System Health Heartbeat
  const hbDot = document.getElementById('systemHeartbeatDot');
  const hbText = document.getElementById('systemHeartbeatText');
  async function checkHeartbeat() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        if (hbDot) hbDot.className = 'heartbeat-dot ' + (data.status === 'ONLINE' ? 'online' : 'degraded');
        if (hbText) hbText.textContent = data.status === 'ONLINE' ? 'Online' : 'Degraded';
        auraStore.setState({ connectionStatus: data.status });
      } else {
        if (hbDot) hbDot.className = 'heartbeat-dot degraded';
        if (hbText) hbText.textContent = 'Degraded';
        auraStore.setState({ connectionStatus: 'Degraded' });
      }
    } catch {
      if (hbDot) hbDot.className = 'heartbeat-dot offline';
      if (hbText) hbText.textContent = 'Offline';
      auraStore.setState({ connectionStatus: 'Offline' });
    }
  }
  checkHeartbeat();
  setInterval(checkHeartbeat, 15000);

  // 3. Real System Clock
  const clockDate = document.getElementById('topLiveDate');
  const clockTime = document.getElementById('topLiveTime');
  function updateLiveClock() {
    const now = new Date();
    if (clockDate) {
      clockDate.textContent = now.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    }
    if (clockTime) {
      clockTime.textContent = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
  }
  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  // 4. Popover Drawer Management (Close others when opening one)
  const popovers = [
    { btn: 'topVisionBtn', card: 'visionDropdown' },
    { btn: 'topFocusBtn', card: 'focusDropdown' },
    { btn: 'topNotifBtn', card: 'notifDrawer' },
    { btn: 'userProfileChip', card: 'profileDrawer' }
  ];

  function closeAllPopovers() {
    popovers.forEach(p => {
      const el = document.getElementById(p.card);
      if (el) el.style.display = 'none';
    });
    const sug = document.getElementById('cmdSuggestionsDropdown');
    if (sug) sug.style.display = 'none';
  }

  popovers.forEach(p => {
    const btn = document.getElementById(p.btn);
    const card = document.getElementById(p.card);
    if (btn && card) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = card.style.display === 'block';
        closeAllPopovers();
        if (!isOpen) {
          card.style.display = 'block';
        }
      });
      card.addEventListener('click', (e) => e.stopPropagation());
    }
  });

  document.addEventListener('click', () => closeAllPopovers());

  // 5. Universal Command Bar & Intent Engine
  const searchInput = document.getElementById('topSearchInput');
  const statePill = document.getElementById('searchStatePill');
  const suggestionsDropdown = document.getElementById('cmdSuggestionsDropdown');

  // NIST Approval Modal elements
  const nistModal = document.getElementById('nistApprovalModal');
  const nistMsg = document.getElementById('nistApprovalMessage');
  const btnCancelNist = document.getElementById('btnCancelNistAction');
  const btnConfirmNist = document.getElementById('btnConfirmNistAction');
  let pendingApprovalQuery = null;

  function setState(badgeText, isVisible = true) {
    if (!statePill) return;
    if (isVisible) {
      statePill.textContent = badgeText;
      statePill.style.display = 'inline-block';
    } else {
      statePill.style.display = 'none';
    }
  }

  // Live Suggestions while typing
  const SUGGESTION_TEMPLATES = [
    { label: "Create task: Review project roadmap", tag: "Tasks" },
    { label: "Remember that AURA OS is production ready", tag: "Memory" },
    { label: "Open my AURA project", tag: "Projects" },
    { label: "Research latest AI agent architectures", tag: "Research" },
    { label: "Teach me neural networks", tag: "Learning" },
    { label: "Open settings", tag: "Settings" }
  ];

  if (searchInput && suggestionsDropdown) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) {
        suggestionsDropdown.style.display = 'none';
        return;
      }

      const matches = SUGGESTION_TEMPLATES.filter(s => s.label.toLowerCase().includes(q));
      if (matches.length > 0) {
        suggestionsDropdown.innerHTML = matches.map(m => `
          <div class="suggestion-row" data-val="${m.label}">
            <span class="suggestion-row-text">⚡ ${m.label}</span>
            <span class="suggestion-row-tag">${m.tag}</span>
          </div>
        `).join('');
        suggestionsDropdown.style.display = 'block';

        suggestionsDropdown.querySelectorAll('.suggestion-row').forEach(row => {
          row.addEventListener('click', () => {
            searchInput.value = row.dataset.val;
            suggestionsDropdown.style.display = 'none';
            handleExecute(row.dataset.val);
          });
        });
      } else {
        suggestionsDropdown.style.display = 'none';
      }
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        suggestionsDropdown.style.display = 'none';
        handleExecute(searchInput.value.trim());
      }
      if (e.key === 'Escape') {
        suggestionsDropdown.style.display = 'none';
      }
    });
  }

  // Ctrl+K Shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  });

  // Execute Intent Function
  async function handleExecute(promptText, userApproved = false, token = null) {
    if (!promptText) return;

    setState('Thinking...', true);
    if (searchInput) searchInput.disabled = true;

    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, userApproved, confirmationToken: token })
      });
      const data = await res.json();

      // Check if NIST Gate approval required
      if (data.status === 'waiting_for_confirmation') {
        setState('Approval Required', true);
        pendingApprovalQuery = { prompt: promptText, token: data.confirmationToken };
        if (nistMsg) nistMsg.textContent = data.warning || 'Sensitive operation detected. Approve to continue.';
        if (nistModal) { nistModal.classList.add('active'); nistModal.style.display = 'flex'; }
        return;
      }

      // Success
      setState('Done!', true);
      setTimeout(() => setState('', false), 3000);

      if (data.response && speakFn) {
        speakFn(data.response);
      }

      if (data.navigateTo && onNavigate) {
        onNavigate(data.navigateTo, data.navigateTo.charAt(0).toUpperCase() + data.navigateTo.slice(1));
      }

      // Refresh notifications if task or memory created
      fetchNotifications();

      if (searchInput) searchInput.value = '';
    } catch (err) {
      console.error('[AURA EXECUTE ERROR]', err);
      setState('Error', true);
      setTimeout(() => setState('', false), 3000);
    } finally {
      if (searchInput) {
        searchInput.disabled = false;
        searchInput.focus();
      }
    }
  }

  // NIST Approval Modal handlers
  if (btnCancelNist && nistModal) {
    btnCancelNist.addEventListener('click', () => {
      nistModal.classList.remove('active'); nistModal.classList.remove('active'); nistModal.style.display = 'none';
      pendingApprovalQuery = null;
      setState('Cancelled', true);
      setTimeout(() => setState('', false), 2000);
    });
  }

  if (btnConfirmNist && nistModal) {
    btnConfirmNist.addEventListener('click', () => {
      nistModal.style.display = 'none';
      if (pendingApprovalQuery) {
        handleExecute(pendingApprovalQuery.prompt, true, pendingApprovalQuery.token);
        pendingApprovalQuery = null;
      }
    });
  }

  // 6. Voice Input (Connected to Unified Voice Engine)
  const micBtn = document.getElementById('topMicBtn');
  if (micBtn) {
    auraVoiceEngine.subscribe((event, data) => {
      if (event === 'start') {
        micBtn.classList.add('listening');
        setState('Always Listening...', true);
      } else if (event === 'end') {
        if (!auraVoiceEngine.isAlwaysOn) {
          micBtn.classList.remove('listening');
          setState('', false);
        }
      } else if (event === 'transcript') {
        if (searchInput) searchInput.value = data;
        setState('Thinking...', true);
      }
    });

    micBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      auraVoiceEngine.requestMicPermission();
      const active = auraVoiceEngine.toggleAlwaysOn();
      if (active) {
        micBtn.classList.add('listening');
        setState('Always Listening...', true);
      } else {
        micBtn.classList.remove('listening');
        setState('Mic Muted', true);
        setTimeout(() => setState('', false), 2000);
      }
    });
  }

  // 7. Vision Controls
  const menuWebcam = document.getElementById('menuToggleWebcam');
  const menuScreen = document.getElementById('menuToggleScreen');
  const menuVisionPage = document.getElementById('menuOpenVisionPage');
  const visionDot = document.getElementById('visionStatusDot');

  if (menuWebcam && onToggleCamera) {
    menuWebcam.addEventListener('click', () => {
      closeAllPopovers();
      onToggleCamera();
      if (visionDot) visionDot.classList.toggle('active');
    });
  }

  if (menuScreen && onToggleScreen) {
    menuScreen.addEventListener('click', () => {
      closeAllPopovers();
      onToggleScreen();
      if (visionDot) visionDot.classList.toggle('active');
    });
  }

  if (menuVisionPage && onNavigate) {
    menuVisionPage.addEventListener('click', () => {
      closeAllPopovers();
      onNavigate('vision', 'Vision');
    });
  }

  // 8. Focus Mode / Pomodoro Timer
  const focusPill = document.getElementById('focusTimerPill');
  const exitFocusBtn = document.getElementById('exitFocusBtn');
  let focusInterval = null;
  let focusSecondsLeft = 0;

  function startFocus(minutes) {
    clearInterval(focusInterval);
    focusSecondsLeft = minutes * 60;
    document.body.classList.add('aura-focus-mode-active');
    if (exitFocusBtn) exitFocusBtn.style.display = 'flex';
    if (focusPill) {
      focusPill.textContent = minutes + 'm';
      focusPill.style.display = 'inline-block';
    }

    if (speakFn) speakFn(`${minutes} मिनट का फ़ोकस मोड चालू हो गया है बंटी भाई। डिस्ट्रेक्शन फ्री काम करिए!`);

    focusInterval = setInterval(() => {
      focusSecondsLeft--;
      if (focusSecondsLeft <= 0) {
        stopFocus();
        if (speakFn) speakFn('बंटी भाई, फ़ोकस सेशन पूरा हो गया! शानदार काम!');
      } else {
        const m = Math.floor(focusSecondsLeft / 60);
        const s = focusSecondsLeft % 60;
        if (focusPill) focusPill.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
      }
    }, 1000);
  }

  function stopFocus() {
    clearInterval(focusInterval);
    document.body.classList.remove('aura-focus-mode-active');
    if (focusPill) focusPill.style.display = 'none';
    if (exitFocusBtn) exitFocusBtn.style.display = 'none';
  }

  document.querySelectorAll('#focusDropdown .popover-item[data-duration]').forEach(item => {
    item.addEventListener('click', () => {
      const dur = parseInt(item.dataset.duration, 10);
      closeAllPopovers();
      startFocus(dur);
    });
  });

  if (exitFocusBtn) {
    exitFocusBtn.addEventListener('click', () => {
      closeAllPopovers();
      stopFocus();
      if (speakFn) speakFn('फ़ोकस मोड बंद कर दिया गया है।');
    });
  }

  // 9. Notifications Center
  const notifBadge = document.getElementById('topNotifBadge');
  const notifListContainer = document.getElementById('notifListContainer');
  const btnMarkAll = document.getElementById('btnMarkAllRead');

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const list = data.notifications || [];
      const unreadCount = list.filter(n => !n.read).length;

      if (notifBadge) {
        notifBadge.textContent = unreadCount;
        notifBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
      }

      if (notifListContainer) {
        if (list.length === 0) {
          notifListContainer.innerHTML = '<div class="empty-notif-msg">No new notifications</div>';
        } else {
          notifListContainer.innerHTML = list.map(n => `
            <div class="notif-row-card ${!n.read ? 'unread' : ''}" data-link="${n.link || 'home'}">
              <div class="notif-card-t">${n.title}</div>
              <div class="notif-card-m">${n.message}</div>
              <div class="notif-card-d">${new Date(n.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          `).join('');

          notifListContainer.querySelectorAll('.notif-row-card').forEach(card => {
            card.addEventListener('click', () => {
              const link = card.dataset.link;
              closeAllPopovers();
              if (link && onNavigate) {
                onNavigate(link, link.charAt(0).toUpperCase() + link.slice(1));
              }
            });
          });
        }
      }
    } catch {}
  }
  fetchNotifications();
  setInterval(fetchNotifications, 12000);

  if (btnMarkAll) {
    btnMarkAll.addEventListener('click', async () => {
      await fetch('/api/notifications/read', { method: 'POST' });
      fetchNotifications();
    });
  }

  // 10. Theme Toggle
  const themeBtn = document.getElementById('themeBtn');
  const themes = ['dark', 'cyber', 'light'];
  let currentThemeIdx = 0;

  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      currentThemeIdx = (currentThemeIdx + 1) % themes.length;
      const selTheme = themes[currentThemeIdx];
      document.body.setAttribute('data-theme', selTheme);
      themeBtn.textContent = selTheme === 'light' ? '🌙' : selTheme === 'cyber' ? '⚡' : '☀️';
      localStorage.setItem('aura_theme', selTheme);
      if (speakFn) speakFn(`${selTheme} थीम अप्लाई कर दी गई है।`);
    });
  }

  // 11. Profile Drawer Navigation Links
  const pMenuSettings = document.getElementById('pMenuSettings');
  const pMenuVoiceAvatar = document.getElementById('pMenuVoiceAvatar');
  const pMenuMemory = document.getElementById('pMenuMemory');
  const pMenuAudits = document.getElementById('pMenuAudits');
  const pMenuLogout = document.getElementById('pMenuLogout');

  if (pMenuSettings && onNavigate) pMenuSettings.addEventListener('click', () => { closeAllPopovers(); onNavigate('settings', 'Settings'); });
  if (pMenuVoiceAvatar && onNavigate) pMenuVoiceAvatar.addEventListener('click', () => { closeAllPopovers(); onNavigate('voice', 'Voice & Avatar'); });
  if (pMenuMemory && onNavigate) pMenuMemory.addEventListener('click', () => { closeAllPopovers(); onNavigate('memory', 'Memory'); });
  if (pMenuAudits && onNavigate) pMenuAudits.addEventListener('click', () => { closeAllPopovers(); onNavigate('automation', 'Automation & Audits'); });
  if (pMenuLogout) pMenuLogout.addEventListener('click', () => {
    closeAllPopovers();
    if (confirm('AURA Session Reset करना चाहते हैं?')) {
      localStorage.clear();
      window.location.reload();
    }
  });

  console.log('[AURA HEADER] Fully mounted and verified.');
}
