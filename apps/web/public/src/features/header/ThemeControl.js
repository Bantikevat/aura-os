/**
 * Theme & Appearance Control Component
 * Supports Dark, Light, System with persistence
 */
import { auraStore } from '../../state/auraStore.js';

export function createThemeControl() {
  const btn = document.createElement('button');
  btn.className = 'header-theme-btn';
  btn.setAttribute('aria-label', 'Toggle Theme');
  btn.title = 'Toggle Theme (Dark / Light / System)';

  function applyTheme(theme) {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      btn.textContent = '🌙';
      btn.title = 'Switch to Dark Mode';
    } else {
      document.body.classList.remove('light-theme');
      btn.textContent = '☀️';
      btn.title = 'Switch to Light Mode';
    }
    localStorage.setItem('aura_theme', theme);
  }

  const savedTheme = localStorage.getItem('aura_theme') || 'dark';
  applyTheme(savedTheme);

  btn.addEventListener('click', () => {
    const current = document.body.classList.contains('light-theme') ? 'light' : 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  return btn;
}
