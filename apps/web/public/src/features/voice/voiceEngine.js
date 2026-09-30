/**
 * AURA Unified Continuous Voice Engine (Always-On Mode)
 * Single source of truth for Web Speech Recognition & Voice Synthesis.
 * Enforces Final-Only transcripts, Duplicate Protection, and Acoustic Echo Suppression.
 */

class AuraVoiceEngine {
  constructor() {
    this.recognition = null;
    this.isAlwaysOn = true;
    this.isListening = false;
    this.isSpeaking = false;
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    this.hindiVoice = null;
    this.subscribers = [];
    this.commandHandler = null;

    // Deduplication & Echo Suppression
    this.recentSpeechCache = [];
    this.lastFinalTranscript = '';
    this.lastFinalTimestamp = 0;
    this.dedupWindowMs = 2500;

    if (typeof window !== 'undefined') {
      this.initSpeechSynthesis();
      this.initRecognition();
    }
  }

  initSpeechSynthesis() {
    if (!this.synth) return;
    const findVoice = () => {
      const voices = this.synth.getVoices();
      this.hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN')) || voices[0];
    };
    findVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = findVoice;
    }
  }

  setCommandHandler(handler) {
    this.commandHandler = handler;
  }

  subscribe(callback) {
    this.subscribers.push(callback);
  }

  notify(event, data) {
    this.subscribers.forEach(cb => {
      try { cb(event, data); } catch (e) { console.error('[SUBSCRIBER ERROR]', e); }
    });
  }

  recordSpokenText(text) {
    if (!text) return;
    const clean = text.toLowerCase().trim();
    this.recentSpeechCache.push(clean);
    if (this.recentSpeechCache.length > 10) this.recentSpeechCache.shift();
  }

  isAuraEcho(text) {
    if (!text) return true;
    const clean = text.toLowerCase().trim();
    if (clean.length < 2) return true;

    // Check against recent speech
    for (const phrase of this.recentSpeechCache) {
      if (clean.includes(phrase) || phrase.includes(clean)) return true;
    }

    // Check against known system response templates
    const echoList = [
      'मैंने सुना',
      'बंटी भाई',
      'अलार्म सेट',
      'खोल रहा हूँ',
      'खोल दिया गया है',
      'open ho gaya',
      'band ho gaya',
      'foreground mein',
      'memories evaluated',
      'processed your query',
      'मेमोरीज',
      'एवालुएटेड'
    ];
    for (const item of echoList) {
      if (clean.includes(item)) return true;
    }
    return false;
  }

  isDuplicateFinal(transcript) {
    const now = Date.now();
    const clean = transcript.toLowerCase().trim();
    if (this.lastFinalTranscript === clean && (now - this.lastFinalTimestamp < this.dedupWindowMs)) {
      return true;
    }
    this.lastFinalTranscript = clean;
    this.lastFinalTimestamp = now;
    return false;
  }

  async initRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('[VOICE] Speech Recognition not supported in this browser.');
      this.notify('error', 'Browser does not support SpeechRecognition');
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRec();
    this.recognition.lang = 'hi-IN';
    this.recognition.continuous = true;
    this.recognition.interimResults = false; // Strictly no interim triggers

    this.recognition.onstart = () => {
      this.isListening = true;
      this.notify('start', { isListening: true });
    };

    this.recognition.onresult = (event) => {
      // 1. Strict Echo Suppression: drop if speaking
      if (this.isSpeaking) {
        console.log('[MIC ECHO DROPPED - AURA SPEAKING]');
        return;
      }

      const lastIdx = event.results.length - 1;
      const resItem = event.results[lastIdx];

      // 2. Requirement #3: ONLY FINAL TRANSCRIPT may execute an action
      if (!resItem.isFinal) {
        return;
      }

      const transcript = resItem[0].transcript.trim();
      if (!transcript) return;

      // 3. Drop known echo transcripts
      if (this.isAuraEcho(transcript)) {
        console.log('[DROPPED ECHO TRANSCRIPT]:', transcript);
        return;
      }

      // 4. Requirement #5: Duplicate voice protection within window
      if (this.isDuplicateFinal(transcript)) {
        console.log('[DUPLICATE VOICE EVENT DROPPED WITHIN WINDOW]:', transcript);
        return;
      }

      console.log('[FINAL VOICE RECOGNIZED]:', transcript);
      this.notify('transcript', transcript);

      if (this.commandHandler) {
        this.commandHandler(transcript);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.notify('end', { isListening: false });

      // Auto-restart loop if Always-On mode is active and not speaking
      if (this.isAlwaysOn && !this.isSpeaking) {
        setTimeout(() => {
          this.startListening();
        }, 200);
      }
    };

    this.recognition.onerror = (e) => {
      console.warn('[VOICE ERROR EVENT]:', e.error);
      this.notify('error', e.error);

      if (e.error === 'not-allowed') {
        this.isAlwaysOn = false;
      } else if (this.isAlwaysOn && !this.isSpeaking) {
        setTimeout(() => {
          this.startListening();
        }, 500);
      }
    };
  }

  async requestMicPermission() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        this.startListening();
      }
    } catch (err) {
      console.warn('[MIC PERMISSION REQUEST]', err);
    }
  }

  startListening() {
    if (!this.recognition || this.isListening || this.isSpeaking) return;
    try {
      this.recognition.start();
    } catch (e) {
      // Ignore already started error
    }
  }

  stopListening() {
    this.isAlwaysOn = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
    }
  }

  toggleAlwaysOn() {
    this.isAlwaysOn = !this.isAlwaysOn;
    if (this.isAlwaysOn) {
      this.startListening();
      this.speak("Always-On मोड चालू हो गया है बंटी भाई। मैं लगातार सुन रहा हूँ।");
    } else {
      this.stopListening();
      this.speak("Always-On मोड पॉज़ कर दिया गया है।");
    }
    return this.isAlwaysOn;
  }

  stopSpeaking() {
    if (this.synth) this.synth.cancel();
    this.isSpeaking = false;
    const stopBtn = document.getElementById('auraFloatingStopBtn');
    if (stopBtn) stopBtn.style.display = 'none';

    // Resume listening after stopping
    if (this.isAlwaysOn && !this.isListening) {
      setTimeout(() => {
        this.startListening();
      }, 200);
    }
  }

  speak(text, onComplete) {
    if (!text || !this.synth) {
      if (onComplete) onComplete();
      return;
    }

    this.recordSpokenText(text);
    this.synth.cancel();
    this.isSpeaking = true;

    // Temporarily pause recognition to guarantee 0 feedback
    if (this.recognition && this.isListening) {
      try { this.recognition.abort(); } catch {}
    }

    const stopBtn = document.getElementById('auraFloatingStopBtn');
    if (stopBtn) stopBtn.style.display = 'flex';

    const wave = document.getElementById('soundWaveStrip');
    if (wave) wave.style.opacity = '1';

    const utter = new SpeechSynthesisUtterance(text);
    if (this.hindiVoice) utter.voice = this.hindiVoice;
    utter.rate = 1.0;
    utter.pitch = 1.0;

    const cleanup = () => {
      if (stopBtn) stopBtn.style.display = 'none';
      if (wave) wave.style.opacity = '0.7';

      // 600ms buffer after speech finishes before re-arming the microphone
      setTimeout(() => {
        this.isSpeaking = false;
        if (onComplete) onComplete();
        if (this.isAlwaysOn && !this.isListening) {
          this.startListening();
        }
      }, 600);
    };

    utter.onend = cleanup;
    utter.onerror = cleanup;

    this.synth.speak(utter);
  }
}

export const auraVoiceEngine = new AuraVoiceEngine();
