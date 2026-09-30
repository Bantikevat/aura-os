/**
 * AURA Logo & Real-Time System Status Component
 * Click: Navigates to Home/Dashboard
 * Status: Reflected accurately via heartbeat (Online / Degraded / Offline)
 */
import { auraStore } from '../../state/auraStore.js';

export function createAuraLogo(onNavigate) {
  const container = document.createElement('div');
  container.className = 'aura-logo-component';
  container.setAttribute('role', 'button');
  container.setAttribute('tabindex', '0');
  container.setAttribute('aria-label', 'AURA Home Dashboard');
  container.title = 'AURA Home Dashboard';

  container.innerHTML = `
    <div class="aura-symbol-wrap">
      <svg viewBox="0 0 36 36" fill="none" class="aura-svg-logo">
        <path d="M18 3L3 31H11L18 16L25 31H33L18 3Z" fill="url(#logoG)"/>
        <path d="M12 24H24L18 13L12 24Z" fill="#070c18"/>
        <defs>
          <linearGradient id="logoG" x1="3" y1="3" x2="33" y2="31" gradientUnits="userSpaceOnUse">
            <stop stop-color="#38bdf8"/>
            <stop offset="0.5" stop-color="#818cf8"/>
            <stop offset="1" stop-color="#c084fc"/>
          </linearGradient>
        </defs>
      </svg>
      <span class="status-indicator-dot" id="systemStatusDot" title="System Status: Connecting..."></span>
    </div>
    <div class="aura-brand-text">
      <div class="title-row">
        <h2>AURA</h2>
        <span class="os-version-tag">v1.0</span>
      </div>
      <span class="os-subtext">Personal AI Life OS</span>
    </div>
  `;

  // Navigate home on click or Enter
  const goHome = () => {
    if (onNavigate) onNavigate('home');
    else window.location.hash = '#home';
  };
  container.addEventListener('click', goHome);
  container.addEventListener('keydown', (e) => { if (e.key === 'Enter') goHome(); });

  // Subscribe to real connection status
  const dot = container.querySelector('#systemStatusDot');
  auraStore.subscribe('connectionStatus', (status) => {
    dot.className = `status-indicator-dot ${status.toLowerCase()}`;
    dot.title = `AURA Core Status: ${status}`;
  });

  return container;
}
