/**
 * User Profile & Settings Drawer Component
 * Allows profile status switching, preferences, settings deep links
 */
import { auraStore } from '../../state/auraStore.js';

export function createProfileMenu(onNavigate, speakFn) {
  const container = document.createElement('div');
  container.className = 'header-profile-menu-box';

  container.innerHTML = `
    <div class="profile-chip-btn" id="profileChipBtn" role="button" tabindex="0" title="User Profile Menu">
      <img src="aura-hero-v3.jpg" alt="Banti" class="profile-avatar-thumb">
      <div class="profile-chip-meta">
        <span class="user-display-name">Banti</span>
        <span class="user-status-tag"><span class="status-dot"></span> <span id="userStatusText">Online</span></span>
      </div>
      <span class="chip-chevron">▾</span>
    </div>

    <!-- Luxury Profile Dropdown Drawer -->
    <div class="profile-popover-drawer" id="profileDrawer" style="display:none;">
      <div class="popover-user-card">
        <img src="aura-hero-v3.jpg" alt="Banti Kevat" class="card-avatar-lg">
        <div class="card-user-info">
          <h4>Banti Kevat</h4>
          <span class="role-badge">Lead AI Architect</span>
        </div>
      </div>

      <div class="status-selector-row">
        <label>Presence:</label>
        <select id="presenceSelect">
          <option value="Online">🟢 Online</option>
          <option value="Deep Work">💻 Deep Work</option>
          <option value="Studying">📚 Studying</option>
          <option value="Away">🟡 Away</option>
        </select>
      </div>

      <div class="drawer-nav-links">
        <a href="#settings" class="drawer-link" data-route="settings">⚙️ System Settings</a>
        <a href="#avatar" class="drawer-link" data-route="avatar">👤 3D Avatar & Voice</a>
        <a href="#memory" class="drawer-link" data-route="memory">⏱️ Personal Memory</a>
        <a href="#projects" class="drawer-link" data-route="projects">📁 GitHub & Projects</a>
      </div>

      <div class="drawer-footer">
        <button class="btn-logout" id="btnLogout">Sign Out</button>
      </div>
    </div>
  `;

  const btn = container.querySelector('#profileChipBtn');
  const drawer = container.querySelector('#profileDrawer');
  const statusText = container.querySelector('#userStatusText');
  const presenceSelect = container.querySelector('#presenceSelect');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    drawer.style.display = drawer.style.display === 'none' ? 'flex' : 'none';
  });

  presenceSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    statusText.textContent = val;
    if (speakFn) speakFn(`Presence status updated: ${val}`);
  });

  container.querySelectorAll('.drawer-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      drawer.style.display = 'none';
      const route = link.dataset.route;
      if (onNavigate) onNavigate(route);
    });
  });

  container.querySelector('#btnLogout').addEventListener('click', () => {
    if (confirm("Sign out of AURA Life OS?")) {
      window.location.reload();
    }
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) drawer.style.display = 'none';
  });

  return container;
}
