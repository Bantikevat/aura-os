const http = require('http');
const { BaseProvider } = require('../BaseProvider');
const { sanitizeRawModelOutput } = require('../../intents/intentSchema');

class LocalOllamaAdapter extends BaseProvider {
  constructor(config = {}) {
    super('ollama');
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    this.model = config.model || process.env.OLLAMA_MODEL || 'llama3.2';
    this.timeout = config.timeout || 3500; // 3.5s timeout to protect user latency
  }

  /**
   * Health-check: returns true if Ollama daemon is running and reachable.
   */
  async isAvailable() {
    return new Promise((resolve) => {
      try {
        const url = new URL('/api/tags', this.baseUrl);
        const req = http.get(url, { timeout: 1000 }, (res) => {
          resolve(res.statusCode === 200);
        });

        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });

        req.on('error', () => {
          resolve(false);
        });

        req.end();
      } catch (e) {
        resolve(false);
      }
    });
  }

  /**
   * Sends prompt and available registry context to Ollama for structured intent extraction.
   */
  async extractIntent(prompt, context = {}) {
    const appsList = context.appsList || [
      'VS_CODE (Code editor)',
      'ANTIGRAVITY (Antigravity IDE)',
      'NOTEPAD (Text editor)',
      'CALCULATOR (Math calculator)',
      'CHROME (Web browser)',
      'PAINT (Drawing software)',
      'FILE_EXPLORER (Files browser)',
      'WHATSAPP (Messaging app)',
      'YOUTUBE (Video streaming)',
      'TERMINAL (Command Prompt)',
      'TASK_MANAGER (Process viewer)',
      'SETTINGS (System configuration)'
    ];

    const systemPrompt = `You are the Intent Understanding Engine for AURA Personal AI Life OS.
Your task is to analyze the user's speech/text (in English, Hindi, or Hinglish) and output a strict JSON object.

Allowed intents:
- "OPEN_APP": User wants to open or launch an application. Target MUST be one of: [${appsList.map(a => a.split(' ')[0]).join(', ')}].
- "OPEN_URL": User wants to open a web URL or site (e.g. YouTube).
- "FOCUS_APP": User wants to bring an app to foreground or switch to it. Target MUST be one of: [${appsList.map(a => a.split(' ')[0]).join(', ')}].
- "CLOSE_APP": User wants to close or quit an app. Target MUST be one of: [${appsList.map(a => a.split(' ')[0]).join(', ')}].
- "PLAY_MEDIA": User wants to play music, a song, or a video on YouTube or Spotify. Target is "YOUTUBE" or "SPOTIFY". Parameters MUST contain "query" (the search or song name).
- "SEARCH_WEB": User wants to search for information on Google, Wikipedia, GitHub, or the web. Target is "GOOGLE", "WIKIPEDIA", or "GITHUB". Parameters MUST contain "query" (the search keywords).
- "CHAT": User is asking a conversational question, coding explanation, greeting, or general inquiry.
- "CREATE_TASK": User wants to create or add a new task.
- "SEARCH_MEMORY": User is asking to remember or search memory.
- "SEND_MESSAGE": User wants to send a WhatsApp message to a contact or phone number. Target is "WHATSAPP". Parameters MUST contain "recipient" and "message".

STRICT RULES:
1. NEVER output shell commands or code.
2. If the user asks a question (e.g. "What is React?", "How are you?"), intent is "CHAT".
3. If the user asks to play a song/video or search on YouTube (e.g. "YouTube pe Arijit Singh ke gaane chala do"), intent is "PLAY_MEDIA", target is "YOUTUBE", parameters: {"query": "Arijit Singh ke gaane"}.
4. If the user asks to search on Google or Wikipedia (e.g. "Google pe search karo Best Laptops"), intent is "SEARCH_WEB", target is "GOOGLE", parameters: {"query": "Best Laptops"}.
5. If the target app is unknown or not in the allowed list, return intent with low confidence (< 0.5) so AURA can ask for clarification.

Respond ONLY with valid JSON. Do not add markdown fences or explanation.

Example:
{"intent": "OPEN_APP", "target": "VS_CODE", "confidence": 0.98}

Example:
{"intent": "PLAY_MEDIA", "target": "YOUTUBE", "parameters": {"query": "Arijit Singh ke gaane"}, "confidence": 0.98}

Example:
{"intent": "SEARCH_WEB", "target": "GOOGLE", "parameters": {"query": "Best Laptops 2026"}, "confidence": 0.98}

Example:
{"intent": "SEND_MESSAGE", "target": "WHATSAPP", "parameters": {"recipient": "Mummy", "message": "Main ghar aa raha hoon"}, "confidence": 0.98}

Example:
{"intent": "CHAT", "parameters": {"reply": "React is a JavaScript library for building UIs."}, "confidence": 0.99}`;

    const payload = JSON.stringify({
      model: this.model,
      prompt: `${systemPrompt}\n\nUser input: "${prompt}"\nJSON Output:`,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.0,
        num_predict: 120
      }
    });

    return new Promise((resolve) => {
      try {
        const url = new URL('/api/generate', this.baseUrl);
        const req = http.request(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          },
          timeout: this.timeout
        }, (res) => {
          let responseBody = '';
          res.on('data', chunk => responseBody += chunk);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(responseBody);
              const structured = sanitizeRawModelOutput(parsed.response);
              resolve(structured);
            } catch (e) {
              resolve(null);
            }
          });
        });

        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });

        req.on('error', () => {
          resolve(null);
        });

        req.write(payload);
        req.end();
      } catch (err) {
        resolve(null);
      }
    });
  }
}

module.exports = {
  LocalOllamaAdapter
};
