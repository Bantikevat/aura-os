/**
 * AURA Voice & Natural Speech Engine
 * Supports Web Speech Synthesis & Voice Recognition
 */
class AuraVoiceEngine {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.selectedVoice = null;
    this.initVoices();
  }

  initVoices() {
    const load = () => {
      this.voices = this.synth.getVoices();
      // Auto select Hindi or Indian English voice if available
      this.selectedVoice = this.voices.find(v => v.lang.includes('hi') || v.lang.includes('IN')) || this.voices[0];
    };
    load();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = load;
    }
  }

  speak(text) {
    if (!text) return;
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.selectedVoice) utterance.voice = this.selectedVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    this.synth.speak(utterance);
  }

  startListening(callback) {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (callback) callback(transcript);
    };

    recognition.start();
  }
}

export const voiceEngine = new AuraVoiceEngine();
