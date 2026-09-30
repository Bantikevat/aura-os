/**
 * Real Focus Mode & Pomodoro Timer Component
 * Controls deep work distraction-free mode and live countdown
 */
import { auraStore } from '../../state/auraStore.js';

export function createFocusModeControl(speakFn) {
  const container = document.createElement('div');
  container.className = 'focus-mode-header-box';

  container.innerHTML = `
    <button class="focus-mode-btn" id="focusModeBtn" title="Toggle Focus Mode / Pomodoro">
      <span class="f-icon">🎯</span>
      <span class="f-label" id="focusLabel">Focus Mode</span>
      <span class="f-chevron">▾</span>
    </button>
    <div class="focus-popover-menu" id="focusMenu" style="display:none;">
      <div class="f-menu-head">Focus & Deep Work</div>
      <div class="f-option" data-mins="25" data-title="Deep Work (Pomodoro)">
        <span>⏱️</span> 25-Min Pomodoro
      </div>
      <div class="f-option" data-mins="50" data-title="Code Sprint">
        <span>💻</span> 50-Min Code Sprint
      </div>
      <div class="f-option" data-mins="15" data-title="Power Revision">
        <span>⚡</span> 15-Min Power Revision
      </div>
      <div class="f-option exit-opt" id="btnExitFocus" style="display:none;">
        <span>⏹️</span> Exit Focus Mode
      </div>
    </div>
  `;

  const btn = container.querySelector('#focusModeBtn');
  const label = container.querySelector('#focusLabel');
  const menu = container.querySelector('#focusMenu');
  const btnExit = container.querySelector('#btnExitFocus');

  let intervalId = null;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.style.display = menu.style.display === 'none' ? 'flex' : 'none';
  });

  function startTimer(minutes, title) {
    clearInterval(intervalId);
    let secondsLeft = minutes * 60;
    btnExit.style.display = 'flex';
    document.body.classList.add('aura-focus-active');

    if (speakFn) speakFn(`Focus mode active: ${title}. Let's build!`);

    intervalId = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        stopFocus();
        if (speakFn) speakFn("Session complete! Great work Banti.");
        alert("🎉 Focus Session Completed!");
        return;
      }
      const m = Math.floor(secondsLeft / 60);
      const s = String(secondsLeft % 60).padStart(2, '0');
      label.textContent = `🔥 ${m}:${s}`;
    }, 1000);
  }

  function stopFocus() {
    clearInterval(intervalId);
    intervalId = null;
    label.textContent = 'Focus Mode';
    btnExit.style.display = 'none';
    document.body.classList.remove('aura-focus-active');
  }

  container.querySelectorAll('.f-option:not(.exit-opt)').forEach(opt => {
    opt.addEventListener('click', () => {
      menu.style.display = 'none';
      const mins = parseInt(opt.dataset.mins, 10);
      const title = opt.dataset.title;
      startTimer(mins, title);
    });
  });

  btnExit.addEventListener('click', () => {
    menu.style.display = 'none';
    stopFocus();
    if (speakFn) speakFn("Focus mode disabled.");
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) menu.style.display = 'none';
  });

  return container;
}
