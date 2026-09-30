// AURA Life OS V3 — Real Webcam, Screen Mirror & Hindi Voice Engine
document.addEventListener('DOMContentLoaded', () => {
  console.log('[AURA V3] Initializing All Real Working Features...');

  const synth = window.speechSynthesis;
  let hindiVoice = null;

  function initSpeech() {
    const voices = synth.getVoices();
    hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN')) || voices[0];
  }
  initSpeech();
  if (synth.onvoiceschanged !== undefined) synth.onvoiceschanged = initSpeech;

  function speakAura(text) {
    if (!text) return;
    synth.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    if (hindiVoice) utter.voice = hindiVoice;
    utter.rate = 1.0;
    utter.pitch = 1.0;

    // Visual wave reaction
    const wave = document.getElementById('soundWaveStrip');
    if (wave) wave.style.opacity = '1';

    utter.onend = () => {
      if (wave) wave.style.opacity = '0.7';
    };

    synth.speak(utter);
  }

  // 1. Live Date & Time
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

  function handleCommand() {
    const text = voiceCommandInput.value.trim();
    if (!text) return;

    if (dialogueParagraph) dialogueParagraph.textContent = text;

    const lower = text.toLowerCase();
    if (lower.includes('github')) {
      speakAura("बंटी भाई, आपकी गिटहब रिपॉजिटरी खोल रहा हूँ।");
      window.open('https://github.com/Bantikevat/aura-os', '_blank');
      return;
    }
    if (lower.includes('camera') || lower.includes('webcam')) {
      toggleWebcam();
      return;
    }
    if (lower.includes('screen')) {
      toggleScreen();
      return;
    }

    speakAura(`बंटी, मैंने आपकी बात सुनी: ${text}`);
  }

  sendPromptTrigger.addEventListener('click', handleCommand);
  voiceCommandInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCommand();
  });

  // Microphone Recognition
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = 'hi-IN';

    recognition.onstart = () => {
      glowMicTrigger.style.background = '#ef4444';
      speakAura("सुन रहा हूँ बंटी, बोलिए...");
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      voiceCommandInput.value = transcript;
      handleCommand();
    };

    recognition.onend = () => {
      glowMicTrigger.style.background = '';
    };

    glowMicTrigger.addEventListener('click', () => recognition.start());
  }

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

  console.log('[AURA V3] Real Working System Online.');
});
