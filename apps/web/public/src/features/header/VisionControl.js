/**
 * Real Vision Control Header Component
 * Connects to live camera and screen capture streams with explicit permissions
 */
import { auraStore } from '../../state/auraStore.js';

export function createVisionControl(onToggleCamera, onToggleScreen) {
  const container = document.createElement('div');
  container.className = 'vision-control-header-box';

  container.innerHTML = `
    <button class="vision-header-btn" id="visionHeaderBtn" aria-label="AURA Vision Status" title="AURA Vision Engine">
      <span class="v-icon">👁️</span>
      <span class="v-text">Vision</span>
      <span class="v-status-dot inactive" id="vStatusDot"></span>
      <span class="v-chevron">▾</span>
    </button>
    <div class="vision-popover-menu" id="visionMenu" style="display:none;">
      <div class="v-menu-head">AURA Vision Engine</div>
      <div class="v-menu-item" id="actCamStream">
        <span class="ico">📷</span>
        <div><strong>Live Webcam</strong><span>Face & Gesture Tracking</span></div>
      </div>
      <div class="v-menu-item" id="actScreenStream">
        <span class="ico">🖥️</span>
        <div><strong>Screen Mirror</strong><span>Code & Document OCR</span></div>
      </div>
      <div class="v-menu-footer">Explicit permission required</div>
    </div>
  `;

  const btn = container.querySelector('#visionHeaderBtn');
  const dot = container.querySelector('#vStatusDot');
  const menu = container.querySelector('#visionMenu');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
  });

  container.querySelector('#actCamStream').addEventListener('click', () => {
    menu.style.display = 'none';
    if (onToggleCamera) onToggleCamera();
  });

  container.querySelector('#actScreenStream').addEventListener('click', () => {
    menu.style.display = 'none';
    if (onToggleScreen) onToggleScreen();
  });

  auraStore.subscribe('visionState', (state) => {
    if (state === 'active_camera' || state === 'active_screen') {
      dot.className = 'v-status-dot active';
      dot.title = 'Vision: Active Stream';
    } else if (state === 'paused') {
      dot.className = 'v-status-dot paused';
      dot.title = 'Vision: Paused';
    } else {
      dot.className = 'v-status-dot inactive';
      dot.title = 'Vision: Inactive';
    }
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) menu.style.display = 'none';
  });

  return container;
}
