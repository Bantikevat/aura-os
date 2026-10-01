import { auraVoiceEngine } from './src/features/voice/voiceEngine.js';
import { mountAuraHeader } from './src/features/header/AuraHeader.js';
// AURA Life OS V3 — Real Webcam, Screen Mirror & Hindi Voice Engine
document.addEventListener('DOMContentLoaded', () => {
  console.log('[AURA V3] Initializing All Real Working Features...');
  // mountAuraHeader initialized below after router and media handlers

  const synth = window.speechSynthesis;
  let hindiVoice = null;

  function initSpeech() {
    const voices = synth.getVoices();
    hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN')) || voices[0];
  }
  initSpeech();
  if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = initSpeech;

  // UI State Machine (Requirement #15)
  // States: 'listening' | 'understanding' | 'executing' | 'verifying' | 'speaking' | 'ready'
  function setUiState(state, info) {
    const stListening = document.getElementById('stListening');
    const stThinking = document.getElementById('stThinking');
    const stSpeaking = document.getElementById('stSpeaking');
    const stWorking = document.getElementById('stWorking');
    const dialogue = document.getElementById('dialogueParagraph');

    const resetDots = () => {
      if (stListening) stListening.style.color = '';
      if (stThinking) stThinking.style.color = '';
      if (stSpeaking) stSpeaking.style.color = '';
      if (stWorking) stWorking.style.color = '';
    };

    resetDots();

    switch (state) {
      case 'listening':
        if (stListening) stListening.style.color = '#38bdf8';
        if (dialogue && !info) dialogue.textContent = '🎙️ Listening... बोलिए, AURA सुन रहा है';
        break;
      case 'understanding':
        if (stThinking) stThinking.style.color = '#f59e0b';
        if (dialogue) dialogue.textContent = `🧠 Understanding: "${info || ''}"`;
        break;
      case 'executing':
        if (stWorking) stWorking.style.color = '#10b981';
        if (dialogue) dialogue.textContent = `⚙ Executing: ${info || 'action'}...`;
        break;
      case 'verifying':
        if (stWorking) stWorking.style.color = '#10b981';
        if (dialogue) dialogue.textContent = `🔍 Verifying ${info || 'action'}...`;
        break;
      case 'speaking':
        if (stSpeaking) stSpeaking.style.color = '#ec4899';
        if (dialogue) dialogue.textContent = info || 'Speaking...';
        break;
      case 'completed':
      case 'ready':
      default:
        if (stListening) stListening.style.color = '#10b981';
        if (dialogue && info) dialogue.textContent = `✓ ${info}`;
        break;
    }
  }

  function speakAura(text, onComplete) {
    setUiState('speaking', text);
    auraVoiceEngine.speak(text, () => {
      setUiState('ready');
      if (onComplete) onComplete();
    });
  }

  // Global Stop Button Handler
  const auraFloatingStopBtn = document.getElementById('auraFloatingStopBtn');
  function stopSpeakingNow() {
    auraVoiceEngine.stopSpeaking();
    setUiState('ready', 'AURA Stopped.');
    console.log('[AURA SPEECH STOPPED BY USER]');
  }
  if (auraFloatingStopBtn) {
    auraFloatingStopBtn.addEventListener('click', stopSpeakingNow);
  }

  const topLiveDate = document.getElementById('topLiveDate');
  const topLiveTime = document.getElementById('topLiveTime');

  function updateClock() {
    const now = new Date();
    const opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
    if (topLiveDate) topLiveDate.textContent = now.toLocaleDateString('en-US', opts);

    let h = now.getHours();
    const m = String(now.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const strH = String(h).padStart(2, '0');
    if (topLiveTime) topLiveTime.textContent = `${strH}:${m} ${ampm}`;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // 2. REAL WEBCAM (Camera View Live 🔴)
  const camToggleBtn = document.getElementById('camToggleBtn');
  const webcamVideo = document.getElementById('webcamVideo');
  const camFallbackFace = document.getElementById('camFallbackFace');
  let webcamStream = null;

  async function toggleWebcam() {
    if (webcamStream) {
      // Stop webcam
      webcamStream.getTracks().forEach(t => t.stop());
      webcamStream = null;
      webcamVideo.style.display = 'none';
      camFallbackFace.style.display = 'block';
      camToggleBtn.textContent = '🔴 Start Webcam Feed';
      speakAura("वेबकैम बंद कर दिया गया है।");
    } else {
      // Start real webcam
      try {
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
        webcamVideo.srcObject = webcamStream;
        webcamVideo.style.display = 'block';
        camFallbackFace.style.display = 'none';
        camToggleBtn.textContent = '⏹️ Stop Webcam';
        speakAura("बंटी भाई, आपका लाइव कैमरा चालू हो चुका है। अब मैं आपको लाइव देख सकता हूँ!");
      } catch (err) {
        alert("कैमरा एक्सेस नहीं मिला: " + err.message);
      }
    }
  }
  camToggleBtn.addEventListener('click', toggleWebcam);

  // 3. REAL SCREEN SHARING (Screen View Live 🔴)
  const screenToggleBtn = document.getElementById('screenToggleBtn');
  const screenVideo = document.getElementById('screenVideo');
  const screenCodeSim = document.getElementById('screenCodeSim');
  let screenStream = null;

  async function toggleScreen() {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
      screenVideo.style.display = 'none';
      screenCodeSim.style.display = 'flex';
      screenToggleBtn.textContent = '🖥️ Share My Screen';
      speakAura("स्क्रीन शेयरिंग बंद कर दी गई है।");
    } else {
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenVideo.srcObject = screenStream;
        screenVideo.style.display = 'block';
        screenCodeSim.style.display = 'none';
        screenToggleBtn.textContent = '⏹️ Stop Screen Share';
        speakAura("बंटी, आपकी स्क्रीन लाइव कनेक्ट हो चुकी है। AURA अब आपकी कोडिंग एक्टिविटी देख रहा है!");
      } catch (err) {
        alert("स्क्रीन शेयर नहीं हो सकी: " + err.message);
      }
    }
  }
  screenToggleBtn.addEventListener('click', toggleScreen);

  // 4. Command Input & Hindi Voice
  const voiceCommandInput = document.getElementById('voiceCommandInput');
  const sendPromptTrigger = document.getElementById('sendPromptTrigger');
  const glowMicTrigger = document.getElementById('glowMicTrigger');
  const dialogueParagraph = document.getElementById('dialogueParagraph');

  // Web Audio Alarm Chime Generator
  function playAlarmChime() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2); // A5
      osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.4); // D6
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
      console.warn('[AUDIO CHIME]', e);
    }
  }

  // Real Action Execution Engine
  
  // Instant App Launcher with Popup Fallback Toast
  function launchApp(appName, url) {
    // 1. Synchronously open window
    const newTab = window.open(url, '_blank');

    // 2. Display prominent glowing launcher toast
    const toast = document.getElementById('auraAppLaunchToast');
    if (toast) {
      toast.innerHTML = `
        <div class="toast-content">
          <span class="toast-icon">🚀</span>
          <span class="toast-msg">Opening <b>${appName}</b>...</span>
          <a href="${url}" target="_blank" class="toast-btn">Open ${appName} ↗</a>
        </div>
      `;
      toast.style.display = 'flex';
      setTimeout(() => { toast.style.display = 'none'; }, 6000);
    }
  }

  async function handleCommand(overrideText) {
    const text = (overrideText || (voiceCommandInput ? voiceCommandInput.value : '')).trim();
    if (!text) return;

    const lower = text.toLowerCase();

    // 0. Stop Command Check (English + Hindi)
    if (
      lower === 'stop' || 
      lower.includes('ruko') || 
      lower.includes('band karo') || 
      lower.includes('chup') || 
      lower.includes('shant') ||
      lower.includes('स्टॉप') ||
      lower.includes('रुको') ||
      lower.includes('रुकिए') ||
      lower.includes('चुप')
    ) {
      stopSpeakingNow();
      return;
    }

    // Camera / Screen local toggles
    if (lower.includes('camera') || lower.includes('webcam') || lower.includes('कैमरा')) {
      toggleWebcam();
      return;
    }
    if (lower.includes('share screen') || lower.includes('screen share') || lower.includes('स्क्रीन')) {
      toggleScreen();
      return;
    }

    // WhatsApp Portal Window toggle via voice
    if (
      lower.includes('whatsapp portal') || 
      lower.includes('whatsapp window') || 
      lower.includes('whatsapp login') ||
      lower.includes('whatsapp screen') ||
      lower.includes('\u0935\u094d\u0939\u093e\u091f\u094d\u0938\u090f\u092a \u092a\u094b\u0930\u094d\u091f\u0932') ||
      lower.includes('\u0935\u094d\u0939\u093e\u091f\u094d\u0938\u090f\u092a \u0935\u093f\u0902\u0921\u094b')
    ) {
      if (typeof openWhatsAppWindow === 'function') openWhatsAppWindow();
      speakAura("WhatsApp portal window open ho gaya hai.");
      return;
    }

    // Set UI State: Understanding
    setUiState('understanding', text);

    // Generate unique actionId for this execution (Requirement #4)
    const actionId = 'cmd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    try {
      // Set UI State: Executing
      setUiState('executing', text);

      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, actionId })
      });
      const data = await res.json();

      // Set UI State: Verifying
      setUiState('verifying', data.appName || text);

      // 1. Open URL action (YouTube, WhatsApp Web, GitHub, Google, Spotify)
      if (data.action === 'open_url' && data.url) {
        launchApp(data.appName || 'Web', data.url);
      }

      // 2. Desktop Application Launched
      if (data.action === 'launch_desktop') {
        const toast = document.getElementById('auraAppLaunchToast');
        if (toast) {
          toast.innerHTML = `
            <div class="toast-content">
              <span class="toast-icon">⚡</span>
              <span class="toast-msg"><b>${data.appName || 'App'}</b> launched on your PC</span>
            </div>
          `;
          toast.style.display = 'flex';
          setTimeout(() => { toast.style.display = 'none'; }, 4000);
        }
      }

      // 3. Desktop Application Closed
      if (data.action === 'close_app') {
        const toast = document.getElementById('auraAppLaunchToast');
        if (toast) {
          toast.innerHTML = `
            <div class="toast-content">
              <span class="toast-icon">⏹</span>
              <span class="toast-msg"><b>${data.appName || 'App'}</b> closed</span>
            </div>
          `;
          toast.style.display = 'flex';
          setTimeout(() => { toast.style.display = 'none'; }, 3000);
        }
      }

      // 4. Desktop Application Focused
      if (data.action === 'focus_app') {
        const toast = document.getElementById('auraAppLaunchToast');
        if (toast) {
          toast.innerHTML = `
            <div class="toast-content">
              <span class="toast-icon">🔍</span>
              <span class="toast-msg"><b>${data.appName || 'App'}</b> brought to foreground</span>
            </div>
          `;
          toast.style.display = 'flex';
          setTimeout(() => { toast.style.display = 'none'; }, 3000);
        }
      }

      // 5. Alarm action
      if (data.action === 'set_alarm' && data.minutes) {
        const ms = data.minutes * 60 * 1000;
        setTimeout(() => {
          playAlarmChime();
          speakAura(`बंटी भाई, आपका ${data.minutes} मिनट का अलार्म पूरा हो गया है!`);
          if (dialogueParagraph) dialogueParagraph.textContent = `⏰ अलार्म पूरा हुआ (${data.minutes} min)`;
        }, ms);
      }

      // 6. Navigation
      if (data.navigateTo) {
        openPage(data.navigateTo, data.navigateTo.charAt(0).toUpperCase() + data.navigateTo.slice(1));
      }

      // 7. NIST Confirmation Gate
      if (data.status === 'waiting_for_confirmation') {
        const modal = document.getElementById('nistConfirmModal');
        const warnText = document.getElementById('nistActionDescription');
        if (modal && warnText) {
          warnText.textContent = data.warning;
          modal.style.display = 'flex';
          
          const confirmBtn = document.getElementById('btnConfirmNistAction');
          const cancelBtn = document.getElementById('btnCancelNistAction');
          
          const handleConfirm = async () => {
            modal.style.display = 'none';
            cleanupModal();
            const cRes = await fetch('/api/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: text, userApproved: true, confirmationToken: data.confirmationToken })
            });
            const cData = await cRes.json();
            speakAura(cData.response);
          };
          
          const handleCancel = () => {
            modal.style.display = 'none';
            cleanupModal();
            speakAura('कार्रवाई रद्द कर दी गई है।');
          };

          function cleanupModal() {
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
          }

          confirmBtn.addEventListener('click', handleConfirm);
          cancelBtn.addEventListener('click', handleCancel);
        }
      }

      // 8. Speak Final Response & STOP (Requirement #14)
      if (data.response && data.status !== 'ignored') {
        speakAura(data.response, () => {
          setUiState('completed', data.response);
        });
      } else {
        setUiState('ready');
      }
    } catch (err) {
      console.error('[HANDLE COMMAND ERROR]', err);
      speakAura("जी बंटी भाई, कमांड प्रोसेस करने में समस्या आई।");
      setUiState('ready');
    }

    if (voiceCommandInput) voiceCommandInput.value = '';
  }

  sendPromptTrigger.addEventListener('click', handleCommand);
  voiceCommandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCommand();
  });

  // 5. 10 Working Action Cards
  const cardSpeeches = {
    talk: "Talk मोड एक्टिव। आप अपनी आवाज़ में मुझसे बात कर सकते हैं।",
    see: "Vision Engine एक्टिव। कैमरा और स्क्रीन विज़न दोनों लाइव चल रहे हैं।",
    learn: "Study & Practice: आज एआई ऑटोमेशन और कोडिंग नोट्स रिवाइज करते हैं।",
    build: "Engineer Mode: कोड, डिबग और आर्किटेक्चर पर काम शुरू करते हैं।",
    research: "Research Agent: नए रिसर्च पेपर्स और टेक न्यूज़ सर्च कर रहा हूँ।",
    automate: "Automation Mode: वर्कफ़्लो और n8n एजेंट्स तैयार हैं।",
    manage: "Tasks, Projects और कैलेंडर मैनेज करने के लिए रेडी।",
    memory: "AURA Memory Store: आपकी सभी यादें और प्रेफ़रेंसेज़ सुरक्षित हैं।",
    profile_everything: "Everything about you: बंटी का पर्सनल नॉलेज ग्राफ़ एक्टिव है।",
    profile_info: "User Info: बंटी केवत - लीड एआई डेवलपर, AURA Life OS।"
  };

  document.querySelectorAll('.deck-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.deck-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const act = card.dataset.action;
      const resp = cardSpeeches[act] || "Feature selected";
      if (dialogueParagraph) dialogueParagraph.textContent = resp;
      speakAura(resp);
    });
  });

  // 6. Interactive Plan Toggling
  document.querySelectorAll('.plan-row').forEach(row => {
    row.addEventListener('click', () => {
      row.classList.toggle('done');
      const task = row.querySelector('.desc').textContent;
      if (row.classList.contains('done')) {
        speakAura(`शानदार बंटी भाई! टास्क पूरा हो गया: ${task}`);
      }
    });
  });

  // Initial Greeting in Hindi
  setTimeout(() => {
    speakAura("नमस्ते बंटी भाई! अब कैमरा, स्क्रीन और आवाज़ तीनों बिल्कुल असली तरीक़े से लाइव काम कर रहे हैं!");
  }, 1200);

  
  // ----------------------------------------------------
  // FULL 16-PAGE DYNAMIC ROUTER
  // ----------------------------------------------------
  const dynamicPageContainer = document.getElementById('dynamicPageContainer');
  const heroCard = document.querySelector('.hero-workstation-card');
  const actionDeck = document.querySelector('.action-cards-deck');
  const activePageTitle = document.getElementById('activePageTitle');
  const pageDynamicContent = document.getElementById('pageDynamicContent');
  const backToHomeBtn = document.getElementById('backToHomeBtn');

  function openPage(pageKey, pageTitle) {
    if (pageKey === 'home') {
      if (dynamicPageContainer) dynamicPageContainer.style.display = 'none';
      if (heroCard) heroCard.style.display = 'flex';
      if (actionDeck) actionDeck.style.display = 'grid';
      speakAura("होम स्क्रीन पर वापस आ गए हैं बंटी भाई।");
      return;
    }

    if (heroCard) heroCard.style.display = 'none';
    if (actionDeck) actionDeck.style.display = 'none';
    if (dynamicPageContainer) dynamicPageContainer.style.display = 'flex';

    if (activePageTitle) activePageTitle.textContent = pageTitle;

    renderPageContent(pageKey);
    speakAura(`${pageTitle} वर्कस्पेस खुल चुका है।`);
  }

  function renderPageContent(pageKey) {
    if (!pageDynamicContent) return;

    if (pageKey === 'chat') {
      pageDynamicContent.innerHTML = `
        <div class="chat-workspace-box">
          <div class="chat-messages-area" id="chatArea">
            <div class="c-msg aura">नमस्ते बंटी! मैं आपका AURA पर्सनल चैट असिस्टेंट हूँ। मुझसे कोडिंग, लाइफ, गोल्स या जो मर्जी पूछिए।</div>
          </div>
          <div class="chat-input-row">
            <input type="text" id="pageChatInput" placeholder="AURA से यहाँ चैट करें...">
            <button class="chat-send-btn" id="pageChatSend">Send</button>
          </div>
        </div>
      `;

      const pInput = document.getElementById('pageChatInput');
      const pSend = document.getElementById('pageChatSend');
      const pArea = document.getElementById('chatArea');

      function sendChatMessage() {
        const msg = pInput.value.trim();
        if (!msg) return;
        pArea.innerHTML += `<div class="c-msg user">${msg}</div>`;
        pInput.value = '';
        pArea.scrollTop = pArea.scrollHeight;

        setTimeout(() => {
          const resp = `बंटी भाई, मैंने आपकी बात नोट कर ली है: "${msg}"। मैं इसपर काम कर रहा हूँ।`;
          pArea.innerHTML += `<div class="c-msg aura">${resp}</div>`;
          pArea.scrollTop = pArea.scrollHeight;
          speakAura(resp);
        }, 500);
      }

      pSend.addEventListener('click', sendChatMessage);
      pInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });
    } 
    else if (pageKey === 'tasks') {
      pageDynamicContent.innerHTML = `
        <div class="tasks-grid-wrap">
          <div class="task-col">
            <div class="col-title">📋 To-Do (शुरू करना है)</div>
            <div class="task-card-item">SSC Practice 30 Questions</div>
            <div class="task-card-item">GitHub Review & Daily Commit</div>
            <div class="task-card-item">Learning MCP & Agents Pipeline</div>
          </div>
          <div class="task-col">
            <div class="col-title">⚡ In Progress (चालू है)</div>
            <div class="task-card-item">AURA Personal AI Life OS Build</div>
          </div>
          <div class="task-col">
            <div class="col-title">✔ Completed (पूरा हुआ)</div>
            <div class="task-card-item">Morning Brief with AURA</div>
            <div class="task-card-item">Study: AI Automation (1 hr)</div>
          </div>
        </div>
      `;
    }
    else if (pageKey === 'voice') {
      pageDynamicContent.innerHTML = `
        <div class="voice-workspace-container" style="display:flex; flex-direction:column; gap:16px;">
          <!-- Banti Voice Profile Card -->
          <div style="background:rgba(14,22,42,0.92); border:1px solid var(--border-cyan); border-radius:14px; padding:20px; box-shadow:0 10px 30px rgba(0,0,0,0.6);">
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:1.8rem;">🎙️</span>
                <div>
                  <h3 style="color:#fff; margin:0; font-size:1.15rem;">Banti's Personal Voice Model</h3>
                  <span style="font-size:0.75rem; color:#10b981;">● Voice Sample Loaded & Cloned (banti_voice_sample.webm)</span>
                </div>
              </div>
              <span style="background:rgba(56,189,248,0.15); border:1px solid var(--border-cyan); color:#38bdf8; font-size:0.72rem; padding:3px 8px; border-radius:8px; font-weight:600;">ACTIVE</span>
            </div>

            <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:14px;">
              आपकी असली आवाज़ की रिकॉर्डिंग को एआई वॉइस मॉडल के साथ सिंक कर दिया गया है। AURA अब आपकी टोन और आवाज़ में रिस्पॉन्ड करता है।
            </p>

            <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px; display:flex; align-items:center; gap:12px;">
              <span style="color:#fff; font-size:0.85rem; font-weight:600;">Listen to Your Voice Sample:</span>
              <audio controls src="banti_voice_sample.webm" style="height:32px; flex:1;"></audio>
            </div>
          </div>

          <!-- Always-On & English Partner Status -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div style="background:rgba(14,22,42,0.85); border:1px solid rgba(56,189,248,0.2); border-radius:12px; padding:16px;">
              <h4 style="color:#fff; margin-bottom:8px;">⚡ Always-On Listening</h4>
              <p style="color:var(--text-muted); font-size:0.8rem; margin-bottom:10px;">AURA हमेशा बैकग्राउंड में आपकी आवाज़ सुनने के लिए तैयार रहता है।</p>
              <span style="color:#10b981; font-weight:700; font-size:0.85rem;">Status: 🟢 Continuous Listening Active</span>
            </div>

            <div style="background:rgba(14,22,42,0.85); border:1px solid rgba(168,85,247,0.25); border-radius:12px; padding:16px;">
              <h4 style="color:#fff; margin-bottom:8px;">🗣️ English Practice Partner</h4>
              <p style="color:var(--text-muted); font-size:0.8rem; margin-bottom:10px;">बोलिए: "Let's practice English" और AURA आपके साथ फ़्लुएंट इंग्लिश में बातचीत करेगा।</p>
              <span style="color:#c084fc; font-weight:700; font-size:0.85rem;">Status: 🟣 Ready to Converse</span>
            </div>
          </div>

          <!-- Real World Voice Actions Cheatsheet -->
          <div style="background:rgba(14,22,42,0.85); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px;">
            <h4 style="color:#fff; margin-bottom:12px;">✨ बोलकर कमांड्स ट्राई करें:</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:10px;">
              <div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px; border:1px solid rgba(56,189,248,0.15); font-size:0.8rem; color:#cbd5e1;">▶ "Open YouTube"</div>
              <div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px; border:1px solid rgba(56,189,248,0.15); font-size:0.8rem; color:#cbd5e1;">▶ "Alarm set kar do 5 minute"</div>
              <div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px; border:1px solid rgba(56,189,248,0.15); font-size:0.8rem; color:#cbd5e1;">▶ "Time bata do"</div>
              <div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px; border:1px solid rgba(56,189,248,0.15); font-size:0.8rem; color:#cbd5e1;">▶ "Abhi kya chal raha hai"</div>
              <div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px; border:1px solid rgba(56,189,248,0.15); font-size:0.8rem; color:#cbd5e1;">▶ "Let's practice English"</div>
              <div style="background:rgba(255,255,255,0.03); padding:8px 12px; border-radius:8px; border:1px solid rgba(56,189,248,0.15); font-size:0.8rem; color:#cbd5e1;">▶ "Create task: [task name]"</div>
            </div>
          </div>
        </div>
      `;
    }
    else if (pageKey === 'goals') {
      pageDynamicContent.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-cyan); padding:16px; border-radius:10px;">
            <h3 style="color:#fff; margin-bottom:6px;">🎯 AI Automation Engineer बनना</h3>
            <p style="color:var(--text-muted); font-size:0.85rem;">प्रोग्रेस: 68% · टारगेट: 2026</p>
          </div>
          <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-cyan); padding:16px; border-radius:10px;">
            <h3 style="color:#fff; margin-bottom:6px;">🚀 AURA V1 Life OS को लाइव करना</h3>
            <p style="color:var(--text-muted); font-size:0.85rem;">प्रोग्रेस: 100% Core Scaffolding Complete</p>
          </div>
        </div>
      `;
    }
    else {
      pageDynamicContent.innerHTML = `
        <div style="padding:2rem; text-align:center; color:var(--text-muted);">
          <div style="font-size:3rem; margin-bottom:1rem;">⚡</div>
          <h3 style="color:#fff; margin-bottom:8px;">${activePageTitle.textContent}</h3>
          <p>यह वर्कस्पेस मॉड्यूल तैयार है। बंटी भाई, आप जैसे-जैसे बताते जाएंगे, हम इसमें और गहराई से फीचर्स जोड़ते जाएंगे!</p>
        </div>
      `;
    }
  }

  if (backToHomeBtn) {
    backToHomeBtn.addEventListener('click', () => openPage('home', 'Home'));
  }

  document.querySelectorAll('.side-nav-list .nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.side-nav-list .nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pageKey = btn.dataset.page;
      const title = btn.textContent.trim();
      openPage(pageKey, title);
    });
  });

  
  // Mount the Luxury Command Center Header
  mountAuraHeader({
    targetElement: document.getElementById('auraHeaderContainer'),
    onNavigate: (pageKey, pageTitle) => openPage(pageKey, pageTitle),
    speakFn: (text) => speakAura(text),
    onToggleCamera: () => toggleWebcam(),
    onToggleScreen: () => toggleScreen()
  });

  
  // Connect Unified Voice Engine
  auraVoiceEngine.setCommandHandler(text => handleCommand(text));

  auraVoiceEngine.subscribe((event, data) => {
    if (event === 'start') {
      if (glowMicTrigger) {
        glowMicTrigger.style.background = '#10b981';
        glowMicTrigger.style.boxShadow = '0 0 20px #10b981';
      }
      const stListening = document.getElementById('stListening');
      if (stListening) stListening.style.color = '#38bdf8';
    } else if (event === 'end') {
      if (!auraVoiceEngine.isAlwaysOn && glowMicTrigger) {
        glowMicTrigger.style.background = '';
        glowMicTrigger.style.boxShadow = '';
      }
    } else if (event === 'transcript') {
      if (dialogueParagraph) dialogueParagraph.textContent = 'सुन रहा हूँ: "' + data + '"';
      if (voiceCommandInput) voiceCommandInput.value = data;
    }
  });

  if (glowMicTrigger) {
    glowMicTrigger.addEventListener('click', () => {
      auraVoiceEngine.requestMicPermission();
      auraVoiceEngine.toggleAlwaysOn();
    });
  }

  // Request mic permission on first interaction
  document.addEventListener('click', () => {
    auraVoiceEngine.requestMicPermission();
  }, { once: true });

  // =========================================================================
  // WHATSAPP PORTAL LIVE WINDOW CONTROLLER
  // =========================================================================
  const topWhatsAppBtn = document.getElementById('topWhatsAppBtn');
  const waStatusDot = document.getElementById('waStatusDot');
  const auraWhatsAppPortalWindow = document.getElementById('auraWhatsAppPortalWindow');
  const waBtnClose = document.getElementById('waBtnClose');
  const waBtnDock = document.getElementById('waBtnDock');
  const waBtnRefresh = document.getElementById('waBtnRefresh');
  const waBtnStartSession = document.getElementById('waBtnStartSession');
  const waBtnLogout = document.getElementById('waBtnLogout');
  const waScanView = document.getElementById('waScanView');
  const waConnectedView = document.getElementById('waConnectedView');
  const waQrSpinner = document.getElementById('waQrSpinner');
  const waQrImage = document.getElementById('waQrImage');
  const waScanLaser = document.getElementById('waScanLaser');
  const waWindowStatusBadge = document.getElementById('waWindowStatusBadge');
  const waWindowUserDetail = document.getElementById('waWindowUserDetail');
  const waChatsList = document.getElementById('waChatsList');
  const waMessagesContainer = document.getElementById('waMessagesContainer');
  const waComposerPhone = document.getElementById('waComposerPhone');
  const waComposerInput = document.getElementById('waComposerInput');
  const waComposerSendBtn = document.getElementById('waComposerSendBtn');
  const waQuickContacts = document.getElementById('waQuickContacts');
  const waChatSearch = document.getElementById('waChatSearch');
  const waTabChats = document.getElementById('waTabChats');
  const waTabContacts = document.getElementById('waTabContacts');
  const waChatsCount = document.getElementById('waChatsCount');
  const waContactsCount = document.getElementById('waContactsCount');

  let waPollTimer = null;
  let activeChatJid = null;
  let currentWaTab = 'contacts'; // default to contacts so user sees them immediately!
  let cachedChats = [];
  let cachedContacts = [];

  function setWaStatusBadge(status, user) {
    if (!waWindowStatusBadge) return;
    if (status === 'CONNECTED') {
      waWindowStatusBadge.className = 'wa-badge wa-connected';
      waWindowStatusBadge.textContent = 'LIVE CONNECTED';
      if (waStatusDot) waStatusDot.style.background = '#22c55e';
      if (waWindowUserDetail) {
        waWindowUserDetail.textContent = `Logged in: ${user?.name || 'User'} (${user?.phone || ''})`;
      }
    } else if (status === 'SCAN_QR' || status === 'INITIALIZING') {
      waWindowStatusBadge.className = 'wa-badge wa-scan';
      waWindowStatusBadge.textContent = 'SCAN QR CODE';
      if (waStatusDot) waStatusDot.style.background = '#eab308';
      if (waWindowUserDetail) {
        waWindowUserDetail.textContent = 'Waiting for phone scan...';
      }
    } else {
      waWindowStatusBadge.className = 'wa-badge wa-disconnected';
      waWindowStatusBadge.textContent = 'OFFLINE';
      if (waStatusDot) waStatusDot.style.background = '#ef4444';
      if (waWindowUserDetail) {
        waWindowUserDetail.textContent = 'Click "Connect WhatsApp Now" to link';
      }
    }
  }

  async function fetchWhatsAppStatus() {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      setWaStatusBadge(data.status, data.user);

      if (data.status === 'CONNECTED') {
        if (waScanView) waScanView.style.display = 'none';
        if (waConnectedView) waConnectedView.style.display = 'flex';

        cachedChats = data.chats || [];
        cachedContacts = data.contacts || [];

        if (waChatsCount) waChatsCount.textContent = cachedChats.length;
        if (waContactsCount) waContactsCount.textContent = data.totalContacts || cachedContacts.length;

        renderCurrentSidebarList();
      } else if (data.status === 'SCAN_QR' && data.qr) {
        if (waConnectedView) waConnectedView.style.display = 'none';
        if (waScanView) waScanView.style.display = 'flex';
        if (waQrSpinner) waQrSpinner.style.display = 'none';
        if (waQrImage) {
          waQrImage.src = data.qr;
          waQrImage.style.display = 'block';
        }
        if (waScanLaser) waScanLaser.style.display = 'block';
      } else {
        if (waConnectedView) waConnectedView.style.display = 'none';
        if (waScanView) waScanView.style.display = 'flex';
        if (waQrImage) waQrImage.style.display = 'none';
        if (waScanLaser) waScanLaser.style.display = 'none';
        if (waQrSpinner) waQrSpinner.style.display = 'block';
      }
    } catch (e) {
      console.error('[AURA WA] Status check error:', e);
    }
  }

  function renderCurrentSidebarList() {
    if (!waChatsList) return;
    const query = (waChatSearch ? waChatSearch.value : '').toLowerCase().trim();

    if (currentWaTab === 'contacts') {
      let filtered = cachedContacts;
      if (query) {
        filtered = filtered.filter(c =>
          (c.name && c.name.toLowerCase().includes(query)) ||
          (c.phone && c.phone.includes(query))
        );
      }

      if (!filtered.length) {
        waChatsList.innerHTML = '<div style="padding:24px; text-align:center; color:#64748b; font-size:0.82rem;">No contacts found</div>';
        return;
      }

      waChatsList.innerHTML = filtered.map(c => `
        <div class="wa-chat-item ${activeChatJid === c.id ? 'active' : ''}" data-jid="${c.id}" data-phone="${c.phone}" data-name="${encodeURIComponent(c.name || c.phone)}">
          <div class="wa-chat-avatar" style="background:#0f172a; color:#25d366; border-color:rgba(37,211,102,0.3);">${(c.name || 'U')[0].toUpperCase()}</div>
          <div class="wa-chat-info">
            <div class="wa-chat-name">${c.name || c.phone}</div>
            <div class="wa-chat-snippet" style="color:#64748b;">${c.phone || c.id}</div>
          </div>
        </div>
      `).join('');

      waChatsList.querySelectorAll('.wa-chat-item').forEach(item => {
        item.addEventListener('click', () => {
          const jid = item.getAttribute('data-jid');
          const phone = item.getAttribute('data-phone');
          const name = decodeURIComponent(item.getAttribute('data-name') || '');
          activeChatJid = jid;

          const titleEl = document.getElementById('waActiveChatTitle');
          if (titleEl) titleEl.textContent = name;
          if (waComposerPhone) waComposerPhone.value = phone || jid.split('@')[0];

          const matchedChat = cachedChats.find(ch => ch.id === jid);
          renderChatMessages(matchedChat);
          renderCurrentSidebarList();
        });
      });

    } else {
      // Chats Tab
      let filtered = cachedChats;
      if (query) {
        filtered = filtered.filter(c =>
          (c.name && c.name.toLowerCase().includes(query)) ||
          (c.id && c.id.includes(query))
        );
      }

      if (!filtered.length) {
        waChatsList.innerHTML = '<div style="padding:24px; text-align:center; color:#64748b; font-size:0.82rem;">No active chats yet. Click "Contacts" above to message anyone!</div>';
        return;
      }

      waChatsList.innerHTML = filtered.map(c => `
        <div class="wa-chat-item ${activeChatJid === c.id ? 'active' : ''}" data-jid="${c.id}" data-name="${encodeURIComponent(c.name || '')}">
          <div class="wa-chat-avatar">${(c.name || 'W')[0].toUpperCase()}</div>
          <div class="wa-chat-info">
            <div class="wa-chat-name">${c.name || c.id.split('@')[0]}</div>
            <div class="wa-chat-snippet">${c.lastMessage || 'Message'}</div>
          </div>
        </div>
      `).join('');

      waChatsList.querySelectorAll('.wa-chat-item').forEach(item => {
        item.addEventListener('click', () => {
          activeChatJid = item.getAttribute('data-jid');
          const name = decodeURIComponent(item.getAttribute('data-name') || '');
          const chat = cachedChats.find(c => c.id === activeChatJid);
          const titleEl = document.getElementById('waActiveChatTitle');
          if (titleEl) titleEl.textContent = name || activeChatJid.split('@')[0];
          if (waComposerPhone) waComposerPhone.value = activeChatJid.split('@')[0];
          renderChatMessages(chat);
          renderCurrentSidebarList();
        });
      });
    }
  }

  // Sidebar Tab Switchers
  if (waTabChats) {
    waTabChats.addEventListener('click', () => {
      currentWaTab = 'chats';
      waTabChats.classList.add('active');
      if (waTabContacts) waTabContacts.classList.remove('active');
      renderCurrentSidebarList();
    });
  }

  if (waTabContacts) {
    waTabContacts.addEventListener('click', () => {
      currentWaTab = 'contacts';
      waTabContacts.classList.add('active');
      if (waTabChats) waTabChats.classList.remove('active');
      renderCurrentSidebarList();
    });
  }

  // Search filter handler
  if (waChatSearch) {
    waChatSearch.addEventListener('input', () => {
      const q = waChatSearch.value.trim();
      if (currentWaTab === 'contacts' && q.length >= 2) {
        fetch('/api/whatsapp/contacts?search=' + encodeURIComponent(q))
          .then(r => r.json())
          .then(res => {
            if (res.contacts) {
              cachedContacts = res.contacts;
              renderCurrentSidebarList();
            }
          })
          .catch(() => renderCurrentSidebarList());
      } else {
        renderCurrentSidebarList();
      }
    });
  }

  function renderChatMessages(chat) {
    if (!waMessagesContainer) return;
    if (!chat || !chat.messages || !chat.messages.length) {
      waMessagesContainer.innerHTML = '<div class="wa-empty-chat-prompt"><span>💬</span><p>Start conversation with this contact</p></div>';
      return;
    }
    waMessagesContainer.innerHTML = chat.messages.map(m => `
      <div class="wa-bubble ${m.fromMe ? 'outgoing' : 'incoming'}">
        <div>${m.text}</div>
        <div class="wa-msg-meta">${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    `).join('');
    waMessagesContainer.scrollTop = waMessagesContainer.scrollHeight;
  }

  window.openWhatsAppWindow = function() {
    if (auraWhatsAppPortalWindow) {
      auraWhatsAppPortalWindow.style.display = 'flex';
      fetchWhatsAppStatus();
      if (!waPollTimer) {
        waPollTimer = setInterval(fetchWhatsAppStatus, 3000);
      }
    }
  };

  window.closeWhatsAppWindow = function() {
    if (auraWhatsAppPortalWindow) {
      auraWhatsAppPortalWindow.style.display = 'none';
      if (waPollTimer) {
        clearInterval(waPollTimer);
        waPollTimer = null;
      }
    }
  };

  // Quick Contacts Pills
  if (waQuickContacts) {
    waQuickContacts.addEventListener('click', (e) => {
      const chip = e.target.closest('.wa-contact-chip');
      if (!chip) return;
      const phone = chip.getAttribute('data-phone');
      const name = chip.getAttribute('data-name');
      if (waComposerPhone) waComposerPhone.value = phone;
      const titleEl = document.getElementById('waActiveChatTitle');
      if (titleEl) titleEl.textContent = name;
    });
  }

  // Top header button
  if (topWhatsAppBtn) {
    topWhatsAppBtn.addEventListener('click', () => {
      if (auraWhatsAppPortalWindow.style.display === 'none' || !auraWhatsAppPortalWindow.style.display) {
        window.openWhatsAppWindow();
      } else {
        window.closeWhatsAppWindow();
      }
    });
  }

  // Window close / dock / refresh
  if (waBtnClose) waBtnClose.addEventListener('click', window.closeWhatsAppWindow);
  if (waBtnDock) {
    waBtnDock.addEventListener('click', () => {
      auraWhatsAppPortalWindow.classList.toggle('docked');
    });
  }
  if (waBtnRefresh) waBtnRefresh.addEventListener('click', fetchWhatsAppStatus);
  const waBtnOpenRealApp = document.getElementById('waBtnOpenRealApp');
  if (waBtnOpenRealApp) {
    waBtnOpenRealApp.addEventListener('click', async () => {
      try {
        await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'WhatsApp kholo' })
        });
        speakAura("Real WhatsApp Web application window open kar diya gaya hai.");
      } catch (err) {
        alert('Failed to launch: ' + err.message);
      }
    });
  }

  // Start Session Button
  if (waBtnStartSession) {
    waBtnStartSession.addEventListener('click', async () => {
      if (waQrSpinner) waQrSpinner.style.display = 'block';
      if (waQrImage) waQrImage.style.display = 'none';
      try {
        await fetch('/api/whatsapp/start', { method: 'POST' });
        fetchWhatsAppStatus();
      } catch (err) {
        alert('Failed to start WhatsApp session: ' + err.message);
      }
    });
  }

  // Logout Button
  if (waBtnLogout) {
    waBtnLogout.addEventListener('click', async () => {
      if (confirm('Kya aap WhatsApp portal se disconnect karna chahte hain?')) {
        try {
          await fetch('/api/whatsapp/logout', { method: 'POST' });
          fetchWhatsAppStatus();
        } catch (e) {
          alert('Logout error: ' + e.message);
        }
      }
    });
  }

  // Send Message from Composer
  async function handlePortalSend() {
    const to = (waComposerPhone ? waComposerPhone.value : '').trim();
    const message = (waComposerInput ? waComposerInput.value : '').trim();
    if (!to || !message) {
      alert('Kripya contact/phone number aur message dono likhein.');
      return;
    }
    if (waComposerSendBtn) waComposerSendBtn.disabled = true;
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, message })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      if (waComposerInput) waComposerInput.value = '';
      fetchWhatsAppStatus();
      speakAura(`${to} ko WhatsApp par message bhej diya gaya hai.`);
    } catch (err) {
      alert('Message send error: ' + err.message);
    } finally {
      if (waComposerSendBtn) waComposerSendBtn.disabled = false;
    }
  }

  if (waComposerSendBtn) waComposerSendBtn.addEventListener('click', handlePortalSend);
  if (waComposerInput) {
    waComposerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handlePortalSend();
    });
  }

  // Initial check on page load to set dot status
  fetchWhatsAppStatus();

  console.log('[AURA V3] Real Working System Online with 16 Pages and Luxury Header.');
});
