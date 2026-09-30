const http = require('http');
const { BaseProvider } = require('../BaseProvider');
const { sanitizeRawModelOutput } = require('../../intents/intentSchema');

class LocalOllamaAdapter extends BaseProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'ollama';
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    this.model = config.model || process.env.OLLAMA_MODEL || 'llama3.2';
    this.timeoutMs = config.timeoutMs || 3500;
  }

  /**
   * Pings Ollama server at /api/tags with a quick timeout.
   */
  async isAvailable() {
    return new Promise((resolve) => {
      try {
        const url = new URL('/api/tags', this.baseUrl);
        const req = http.request({
          hostname: url.hostname,
          port: url.port || 11434,
          path: url.pathname,
          method: 'GET',
          timeout: 800
        }, (res) => {
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
- "CHAT": User is asking a conversational question, coding explanation, greeting, or general inquiry.
- "CREATE_TASK": User wants to create or add a new task.
- "SEARCH_MEMORY": User is asking to remember or search memory.

STRICT RULES:
1. NEVER output shell commands or code.
2. If the user asks a question (e.g. "What is React?", "How are you?"), intent is "CHAT".
3. Return ONLY a valid JSON object in this format:
{
  "intent": "OPEN_APP",
  "target": "VS_CODE",
  "confidence": 0.95,
  "reasoning": "User requested to open VS Code in Hindi/Hinglish"
}`;

    const requestBody = JSON.stringify({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      format: 'json',
      stream: false,
      options: {
        temperature: 0.1
      }
    });

    return new Promise((resolve) => {
      try {
        const url = new URL('/api/chat', this.baseUrl);
        const req = http.request({
          hostname: url.hostname,
          port: url.port || 11434,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
          },
          timeout: this.timeoutMs
        }, (res) => {
          let responseText = '';
          res.on('data', chunk => { responseText += chunk; });
          res.on('end', () => {
            try {
              const data = JSON.parse(responseText);
              const content = data.message ? data.message.content : data.response;
              const sanitized = sanitizeRawModelOutput(content);
              resolve(sanitized);
            } catch (err) {
              resolve(null);
            }
          });
        });

        req.on('timeout', () => {
          req.destroy();
          console.warn('[OLLAMA ADAPTER] Request timed out');
          resolve(null);
        });

        req.on('error', (err) => {
          console.warn('[OLLAMA ADAPTER] Network error:', err.message);
          resolve(null);
        });

        req.write(requestBody);
        req.end();
      } catch (err) {
        resolve(null);
      }
    });
  }
}

module.exports = { LocalOllamaAdapter };
