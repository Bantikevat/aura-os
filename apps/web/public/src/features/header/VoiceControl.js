/**
 * Real Voice Control Header Component
 * States: Idle, Permission Request, Listening, Speaking, Blocked Error
 */
import { auraStore } from '../../state/auraStore.js';

export function createVoiceControl(onTranscript) {
  const btn = document.createElement('button');
  btn.className = 'header-voice-control-btn';
  btn.setAttribute('aria-label', 'Start Voice Input');
  btn.title = 'Start Voice Input (Microphone)';
  btn.innerHTML = `
    <span class="mic-icon">🎙️</span>
    <span class="mic-wave-indicator" style="display:none;">
      <span></span><span></span><span></span>
    </span>
  `;

  let recognition = null;
  const isSupported = ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  if (isSupported) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRec();
    recognition.lang = 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      btn.classList.add('is-listening');
      btn.querySelector('.mic-wave-indicator').style.display = 'flex';
      auraStore.setState({ voiceState: 'listening', activityState: 'listening' });
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      if (onTranscript) onTranscript(transcript);
    };

    recognition.onerror = (e) => {
      btn.classList.remove('is-listening');
      btn.querySelector('.mic-wave-indicator').style.display = 'none';
      auraStore.setState({ voiceState: 'error', activityState: 'idle' });
      if (e.error === 'not-allowed') {
        alert('Microphone permission is blocked. Please allow microphone access in your browser settings and try again.');
      }
    };

    recognition.onend = () => {
      btn.classList.remove('is-listening');
      btn.querySelector('.mic-wave-indicator').style.display = 'none';
      auraStore.setState({ voiceState: 'idle', activityState: 'idle' });
    };
  }

  btn.addEventListener('click', () => {
    if (!isSupported) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      recognition.start();
    } catch (err) {
      // Already running or starting
    }
  });

  return btn;
}
