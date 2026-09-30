/**
 * AURA Quick Tools Launcher & Embedded Modals
 * Supports Web Search, YouTube, GitHub, Notes, Calculator, Browser Agent
 */
import { voiceEngine } from '../voice/speech.js';

export function initTools() {
  const tiles = document.querySelectorAll('.tool-tile');

  tiles.forEach(tile => {
    tile.addEventListener('click', () => {
      const tool = tile.dataset.tool;

      switch(tool) {
        case 'github':
          voiceEngine.speak('Opening your GitHub repository Bantikevat slash aura-os');
          window.open('https://github.com/Bantikevat/aura-os', '_blank');
          break;
        case 'youtube':
          voiceEngine.speak('Opening YouTube for learning and tech tutorials');
          window.open('https://www.youtube.com', '_blank');
          break;
        case 'web_search':
          voiceEngine.speak('Opening Google Search');
          window.open('https://www.google.com', '_blank');
          break;
        case 'calc':
          openCalculator();
          break;
        case 'notes':
          openNotes();
          break;
        default:
          const name = tile.querySelector('.tile-name')?.textContent || tool;
          voiceEngine.speak(`Launching ${name} tool.`);
          break;
      }
    });
  });
}

function openCalculator() {
  const expr = prompt("AURA Quick Calculator\nEnter math expression (e.g., 25 * 40 + 150):");
  if (expr) {
    try {
      const result = Function('"use strict";return (' + expr + ')')();
      voiceEngine.speak(`Result is ${result}`);
      alert(`Result of ${expr} = ${result}`);
    } catch {
      alert("Invalid expression!");
    }
  }
}

function openNotes() {
  const currentNote = localStorage.getItem('aura_quick_notes') || '';
  const newNote = prompt("AURA Quick Notepad\nAdd or edit your note:", currentNote);
  if (newNote !== null) {
    localStorage.setItem('aura_quick_notes', newNote);
    voiceEngine.speak("Your note has been saved successfully.");
  }
}
