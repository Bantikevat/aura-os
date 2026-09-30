/**
 * Real Notification Center Header Component
 * Connects to live /api/notifications with unread counts, deep-links, and clear
 */
import { auraStore } from '../../state/auraStore.js';

export function createNotificationCenter(onNavigate) {
  const container = document.createElement('div');
  container.className = 'notification-center-header-box';

  container.innerHTML = `
    <button class="notif-trigger-btn" id="notifTriggerBtn" aria-label="Notifications" title="Notifications">
      <span class="bell-glyph">🔔</span>
      <span class="notif-count-badge" id="notifBadge" style="display:none;">0</span>
    </button>
    <div class="notif-popover-drawer" id="notifDrawer" style="display:none;">
      <div class="drawer-header">
        <h4>Notifications</h4>
        <button class="btn-clear-notifs" id="btnClearNotifs">Mark All Read</button>
      </div>
      <div class="drawer-content-list" id="drawerList"></div>
    </div>
  `;

  const btn = container.querySelector('#notifTriggerBtn');
  const badge = container.querySelector('#notifBadge');
  const drawer = container.querySelector('#notifDrawer');
  const list = container.querySelector('#drawerList');
  const btnClear = container.querySelector('#btnClearNotifs');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    drawer.style.display = drawer.style.display === 'none' ? 'flex' : 'none';
  });

  btnClear.addEventListener('click', async () => {
    try {
      await fetch('/api/notifications/read', { method: 'POST' });
      auraStore.fetchNotifications();
    } catch {}
  });

  auraStore.subscribe('notifications', (notifs) => {
    const unread = notifs.filter(n => !n.read).length;
    if (unread > 0) {
      badge.style.display = 'flex';
      badge.textContent = unread;
    } else {
      badge.style.display = 'none';
    }

    if (notifs.length === 0) {
      list.innerHTML = `<div class="empty-notif-state">✨ All caught up! No notifications.</div>`;
      return;
    }

    list.innerHTML = '';
    notifs.forEach(n => {
      const item = document.createElement('div');
      item.className = `notif-row-card ${n.read ? 'read' : 'unread'}`;
      item.innerHTML = `
        <span class="n-type-dot ${n.type}"></span>
        <div class="n-details">
          <strong>${n.title}</strong>
          <p>${n.message}</p>
          <span class="n-time">${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        drawer.style.display = 'none';
        if (n.link && onNavigate) onNavigate(n.link);
      });

      list.appendChild(item);
    });
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) drawer.style.display = 'none';
  });

  return container;
}
