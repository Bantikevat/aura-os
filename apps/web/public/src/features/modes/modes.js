/**
 * AURA 5 Core Modes Controller
 * Teacher, Engineer, Research, Care, Automation
 */
import { voiceEngine } from '../voice/speech.js';

export function initModes() {
  const modeCards = document.querySelectorAll('.mode-card');

  const modeDescriptions = {
    teacher: "Switched to Teacher Mode. I am ready to guide your concepts, test questions, and track learning.",
    engineer: "Switched to Engineer Mode. Workspace ready. Let's code, review repositories, and test architectures.",
    research: "Switched to Research Mode. Ready to search evidence, analyze research papers, and synthesize findings.",
    care: "Switched to Care Mode. Take a deep breath Banti. Let's stay balanced, calm, and focused today.",
    automation: "Switched to Automation Mode. Workflows ready. Turn any repetitive task into one command."
  };

  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      modeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');

      const mode = card.dataset.mode;
      const speech = modeDescriptions[mode] || `Switched to ${mode} mode.`;
      voiceEngine.speak(speech);
    });
  });
}
