/**
 * AURA Unified Continuous Voice Engine (Always-On Mode)
 * Single source of truth for Web Speech Recognition & Voice Synthesis
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
      try { cb(event, data); } catch (e) { console.error(e); }
    });
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
    this.recognition.continuous = true; // Always continuous listening
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.notify('start', { isListening: true });
    };

    this.recognition.onresult = (event) => {
      if (this.isSpeaking) {
        // Ignore self-speech feedback
        return;
      }

      const lastIdx = event.results.length - 1;
      const transcript = event.results[lastIdx][0].transcript.trim();
      if (!transcript) return;

      console.log('[AURA VOICE HEARD]:', transcript);
      this.notify('transcript', transcript);

      if (this.commandHandler) {
        this.commandHandler(transcript);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.notify('end', { isListening: false });

      // Auto-restart loop if Always-On mode is active
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
        }, 400);
      }
    };
  }

  async requestMicPermission() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop()); // Permission acquired!
        this.startListening();
      }
    } catch (err) {
      console.warn('[MIC PERMISSION REQUEST]', err);
    }
  }

  startListening() {
    if (!this.recognition || this.isListening) return;
    try {
      this.recognition.start();
    } catch (e) {
      // If already started or restarting
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

  speak(text) {
    if (!text || !this.synth) return;

    this.synth.cancel();
    this.isSpeaking = true;

    const utter = new SpeechSynthesisUtterance(text);
    if (this.hindiVoice) utter.voice = this.hindiVoice;
    utter.rate = 1.0;
    utter.pitch = 1.0;

    const wave = document.getElementById('soundWaveStrip');
    if (wave) wave.style.opacity = '1';

    utter.onend = () => {
      this.isSpeaking = false;
      if (wave) wave.style.opacity = '0.7';

      // Resume continuous listening immediately after speaking
      if (this.isAlwaysOn && !this.isListening) {
        setTimeout(() => {
          this.startListening();
        }, 150);
      }
    };

    utter.onerror = () => {
      this.isSpeaking = false;
      if (this.isAlwaysOn && !this.isListening) {
        this.startListening();
      }
    };

    this.synth.speak(utter);
  }
}

export const auraVoiceEngine = new AuraVoiceEngine();
