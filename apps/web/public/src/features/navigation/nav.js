/**
 * AURA Left Navigation & Page Router
 */
import { voiceEngine } from '../voice/speech.js';

export function initNav() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      const page = item.dataset.page;
      voiceEngine.speak(`Navigating to ${page}`);
    });
  });

  const proCard = document.querySelector('.aura-pro-card');
  if (proCard) {
    proCard.addEventListener('click', () => {
      voiceEngine.speak("AURA PRO: You have unlocked unlimited agents, voice capabilities, and memory storage.");
      alert("✨ AURA PRO: Lifetime access enabled for Banti!");
    });
  }
}
