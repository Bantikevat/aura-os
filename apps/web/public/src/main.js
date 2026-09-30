/**
 * AURA Personal AI Life OS — Master Controller (V2)
 * Full Hindi Natural Interaction Engine
 */
import { voiceEngine } from './features/voice/speech.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[AURA V2] Subsystems Initializing...');

  // 1. Live Clock & Date Engine
  const headerDate = document.getElementById('headerDate');
  const headerTime = document.getElementById('headerTime');

  function updateLiveClock() {
    const now = new Date();
    const opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    if (headerDate) headerDate.textContent = now.toLocaleDateString('en-US', opts);

    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const strH = String(h).padStart(2, '0');
    if (headerTime) headerTime.textContent = `${strH}:${m} ${ampm}`;
  }
  updateLiveClock();
  setInterval(updateLiveClock, 1000);

  // 2. Command Bar & Hindi Voice Assistant
  const input = document.getElementById('masterCommandInput');
  const sendBtn = document.getElementById('masterSendBtn');
  const micBtn = document.getElementById('masterMicBtn');
  const bubble = document.getElementById('heroSpeechBubble');

  function updateSpeechBubble(text) {
    if (bubble) {
      bubble.innerHTML = `
        <h3>AURA Response</h3>
        <p>${text}</p>
        <span class="bubble-sub">Main aapki seva me hazir hoon ✨</span>
      `;
    }
  }

  function handleCommand(customText) {
    const text = (customText || input.value || '').trim();
    if (!text) return;
    input.value = text;
    const lower = text.toLowerCase();

    // Responses in Hindi
    if (lower.includes('github') || lower.includes('git')) {
      const msg = "Banti, aapki GitHub repository khol raha hoon.";
      updateSpeechBubble(msg);
      voiceEngine.speak(msg);
      window.open('https://github.com/Bantikevat/aura-os', '_blank');
      return;
    }

    if (lower.includes('plan') || lower.includes('routine') || lower.includes('shedule')) {
      const msg = "Banti, aaj aapka sabse pehla focus AURA Project Development hai, uske baad SSC practice aur sham ko MCP agents par kaam karna hai.";
      updateSpeechBubble(msg);
      voiceEngine.speak(msg);
      return;
    }

    if (lower.includes('kaise ho') || lower.includes('hello') || lower.includes('hi')) {
      const msg = "Namaste Banti! Main bilkul active aur ready hoon. Aaj hum kya banayenge?";
      updateSpeechBubble(msg);
      voiceEngine.speak(msg);
      return;
    }

    const defaultMsg = `Banti, maine aapka aadesh sun liya hai: ${text}`;
    updateSpeechBubble(defaultMsg);
    voiceEngine.speak(defaultMsg);
  }

  if (sendBtn) sendBtn.addEventListener('click', () => handleCommand());
  if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleCommand(); });

  if (micBtn) {
    micBtn.addEventListener('click', () => {
      voiceEngine.speak("Sun raha hoon Banti, boliye...");
      voiceEngine.startListening((transcript) => {
        handleCommand(transcript);
      });
    });
  }

  // 3. Quick Action Strip Buttons (9 Buttons)
  const stripActions = {
    teach: "Teacher Mode active. Aapko kya sikhna hai?",
    code: "Engineer Mode ready! Repository aur code inspect karne ke liye taiyaar.",
    research: "Research Agent chaloo ho gaya hai. Topic batayein.",
    browser: "Browser Automation agent khol raha hoon.",
    task: "Naya task create karne ke liye prompt dalein.",
    automate: "Workflow automation ready.",
    project: "AURA - Personal AI Life OS project details saamne hain.",
    analyze: "Performance analysis report tayyar ki ja rahi hai.",
    more: "Additional tools open kar raha hoon."
  };

  document.querySelectorAll('.strip-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.strip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const act = btn.dataset.act;
      const resp = stripActions[act] || "Action executed";
      updateSpeechBubble(resp);
      voiceEngine.speak(resp);
    });
  });

  // 4. Modes Selection (Bottom Card 2)
  const modeVoiceHindi = {
    friend: "Friend Mode: Casual aur pyari baatein karte hain!",
    teacher: "Teacher Mode: Har concept ko asaan bhasha me samjhaunga.",
    engineer: "Engineer Mode: Code, terminal aur architecture par full focus!",
    research: "Research Mode: Tathya aur proof ke saath investigation.",
    care: "Care Mode: Shanti se kaam karo Banti, stress mat lo."
  };

  document.querySelectorAll('.mode-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.mode-item').forEach(m => m.classList.remove('active'));
      item.classList.add('active');
      const mode = item.dataset.mode;
      const msg = modeVoiceHindi[mode] || `Mode switched to ${mode}`;
      updateSpeechBubble(msg);
      voiceEngine.speak(msg);
    });
  });

  // 5. Today's Plan Clickable Checks
  document.querySelectorAll('.sched-item').forEach(item => {
    item.addEventListener('click', () => {
      item.classList.toggle('done');
      const taskName = item.querySelector('.s-desc').textContent;
      if (item.classList.contains('done')) {
        const cheer = `Shabash Banti! Task poora hua: ${taskName}`;
        voiceEngine.speak(cheer);
      }
    });
  });

  // 6. Quick Access App Tiles
  const btnVSCode = document.getElementById('btnVSCode');
  if (btnVSCode) {
    btnVSCode.addEventListener('click', () => {
      voiceEngine.speak("VS Code Antigravity IDE already open hai.");
    });
  }
  const btnNotion = document.getElementById('btnNotion');
  if (btnNotion) {
    btnNotion.addEventListener('click', () => {
      window.open('https://notion.so', '_blank');
    });
  }

  // 7. Initial Welcome Voice in Hindi
  setTimeout(() => {
    voiceEngine.speak("Namaste Banti! Main AURA hoon. Aapka Personal AI Life OS ab bilkul live aur working state me hai.");
  }, 1200);

  console.log('[AURA V2] All Systems Operational in Hindi.');
});
