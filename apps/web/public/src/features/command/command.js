/**
 * AURA Command Dispatcher & Natural Language Intents
 */
import { voiceEngine } from '../voice/speech.js';

export function initCommand() {
  const input = document.getElementById('mainPromptInput');
  const sendBtn = document.getElementById('mainSendBtn');
  const micBtn = document.getElementById('mainMicBtn');
  const chips = document.querySelectorAll('.action-chip');

  function execute(text) {
    const query = (text || input.value || '').trim();
    if (!query) return;

    input.value = query;
    const qLower = query.toLowerCase();

    if (qLower.includes('github')) {
      voiceEngine.speak("Opening your GitHub repository Bantikevat slash aura-os.");
      window.open('https://github.com/Bantikevat/aura-os', '_blank');
      return;
    }

    if (qLower.includes('plan')) {
      voiceEngine.speak("Banti, today your highest priority is AURA Project Development, followed by SSC practice and MCP agents review.");
      return;
    }

    if (qLower.includes('code') || qLower.includes('explain')) {
      voiceEngine.speak("Engineer Mode activated. Ready to inspect code and architecture.");
      return;
    }

    if (qLower.includes('news') || qLower.includes('search')) {
      voiceEngine.speak("Searching latest AI and tech updates.");
      window.open('https://www.google.com/search?q=latest+AI+news+2026', '_blank');
      return;
    }

    voiceEngine.speak(`Banti, I have received your command: ${query}`);
  }

  if (sendBtn) sendBtn.addEventListener('click', () => execute());
  if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') execute(); });

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const cmd = chip.dataset.cmd;
      execute(cmd);
    });
  });

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      voiceEngine.startListening((transcript) => {
        execute(transcript);
      });
    });
  }
}
