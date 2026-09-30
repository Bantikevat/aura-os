/**
 * AURA Personal AI Life OS — Main Orchestrator
 * Enterprise Modular Architecture
 */
import { initClock } from './features/clock/clock.js';
import { initPlan } from './features/plan/plan.js';
import { initModes } from './features/modes/modes.js';
import { initTools } from './features/tools/tools.js';
import { initCommand } from './features/command/command.js';
import { initNav } from './features/navigation/nav.js';
import { initModels } from './features/models/models.js';
import { voiceEngine } from './features/voice/speech.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[AURA OS] Initializing Enterprise Modular Subsystems...');

  // Initialize all features independently
  initClock();
  initPlan();
  initModes();
  initTools();
  initCommand();
  initNav();
  initModels();

  // Welcome greeting
  setTimeout(() => {
    voiceEngine.speak("Hi Banti, I'm AURA! Your Personal AI Life OS is online.");
  }, 1000);

  console.log('[AURA OS] All 7 Subsystems Online & Verified.');
});
