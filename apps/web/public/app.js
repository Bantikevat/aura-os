document.addEventListener('DOMContentLoaded', () => {
  // 1. Live Clock & Date
  const liveDate = document.getElementById('liveDate');
  const liveClock = document.getElementById('liveClock');

  function updateClock() {
    const now = new Date();
    const dateOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    liveDate.textContent = now.toLocaleDateString('en-US', dateOptions);

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const strHours = String(hours).padStart(2, '0');
    liveClock.textContent = `${strHours}:${minutes} ${ampm}`;
  }

  updateClock();
  setInterval(updateClock, 1000);

  // 2. Speech Synthesis
  const synth = window.speechSynthesis;
  function speakAura(text) {
    if (!text) return;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    
    // Choose Hindi / Indian voice if present
    const voices = synth.getVoices();
    const hiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
    if (hiVoice) utter.voice = hiVoice;

    utter.rate = 1.0;
    utter.pitch = 1.0;
    synth.speak(utter);
  }

  // 3. Command Bar Execution
  const mainPromptInput = document.getElementById('mainPromptInput');
  const mainSendBtn = document.getElementById('mainSendBtn');
  const mainMicBtn = document.getElementById('mainMicBtn');

  function handlePrompt() {
    const prompt = mainPromptInput.value.trim();
    if (!prompt) return;

    if (prompt.toLowerCase().includes('github')) {
      speakAura("Opening your GitHub repository Bantikevat slash aura-os.");
      window.open('https://github.com/Bantikevat/aura-os', '_blank');
      return;
    }

    if (prompt.toLowerCase().includes('plan')) {
      speakAura("Banti, today your focus is AURA Project Development, followed by SSC practice and learning MCP agents.");
      return;
    }

    speakAura("Banti, I have processed your command: " + prompt);
  }

  mainSendBtn.addEventListener('click', handlePrompt);
  mainPromptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handlePrompt();
  });

  // 4. Quick Action Chips
  document.querySelectorAll('.action-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cmd = chip.dataset.cmd;
      mainPromptInput.value = cmd;
      handlePrompt();
    });
  });

  // 5. Mode Cards Switching
  document.querySelectorAll('.mode-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const mode = card.dataset.mode;
      speakAura(`Switched to ${mode} mode.`);
    });
  });

  // 6. Plan Items Toggle Check
  document.querySelectorAll('.plan-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('completed');
      const desc = item.querySelector('.plan-desc').textContent;
      if (item.classList.contains('completed')) {
        speakAura(`Great job Banti! Completed: ${desc}`);
      }
    });
  });

  // 7. Quick Tools Click
  document.querySelectorAll('.tool-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      const tool = tile.dataset.tool;
      if (tool === 'github') {
        window.open('https://github.com/Bantikevat/aura-os', '_blank');
      } else if (tool === 'youtube') {
        window.open('https://youtube.com', '_blank');
      } else if (tool === 'web_search') {
        window.open('https://google.com', '_blank');
      } else {
        speakAura(`Launching ${tile.querySelector('.tile-name').textContent} tool.`);
      }
    });
  });

  // 8. Microphone Input
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.lang = 'hi-IN';

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      mainPromptInput.value = transcript;
      handlePrompt();
    };

    mainMicBtn.addEventListener('click', () => rec.start());
  }

  // Initial Welcome Voice
  setTimeout(() => {
    speakAura("Hi Banti, I'm AURA! Your Personal AI Life OS is online.");
  }, 1000);
});
