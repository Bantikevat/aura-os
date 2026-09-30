/**
 * AURA AI Models Status Monitor
 */
import { voiceEngine } from '../voice/speech.js';

export function initModels() {
  const chips = document.querySelectorAll('.model-chip');

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.querySelector('.model-name')?.textContent || 'Model';
      const state = chip.querySelector('.model-state')?.textContent || '';
      voiceEngine.speak(`${name} is currently ${state}`);
    });
  });
}
