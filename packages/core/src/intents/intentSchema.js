const { APP_REGISTRY } = require('../registry/appRegistry');
const { contactsManager } = require('../contacts/contactsManager');

const ALLOWED_INTENTS = new Set([
  'OPEN_APP',
  'OPEN_URL',
  'FOCUS_APP',
  'CLOSE_APP',
  'CHAT',
  'CREATE_TASK',
  'SEARCH_MEMORY',
  'PLAY_MEDIA',
  'SEARCH_WEB',
  'SEND_MESSAGE',
  'SAVE_CONTACT',
  'LIST_CONTACTS'
]);

const DEFAULT_CONFIDENCE_THRESHOLD = 0.70;

/**
 * Sanitizes and extracts a JSON object from raw model output
 * handles markdown code blocks, trailing commas, or surrounding text.
 */
function sanitizeRawModelOutput(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  let text = rawText.trim();

  // Strip markdown code fences if present (```json ... ``` or ``` ...)
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  } else {
    // If no fences, look for the first '{' and last '}'
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      text = text.substring(startIdx, endIdx + 1);
    }
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

/**
 * Validates a parsed intent against strict AURA safety and registry boundaries.
 * 
 * @param {object} parsed - Parsed JSON object from model
 * @param {number} threshold - Minimum confidence required for actions
 * @returns {object} { isValid: boolean, intent: object | null, error: string | null }
 */
function validateIntent(parsed, threshold = DEFAULT_CONFIDENCE_THRESHOLD) {
  if (!parsed || typeof parsed !== 'object') {
    return {
      isValid: false,
      intent: null,
      error: 'invalid_or_malformed_object'
    };
  }

  // 1. Validate intent type
  const intentType = (parsed.intent || '').toUpperCase().trim();
  if (!ALLOWED_INTENTS.has(intentType)) {
    return {
      isValid: false,
      intent: null,
      error: `unsupported_intent: ${parsed.intent}`
    };
  }

  const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 1.0;
  const parameters = (parsed.parameters && typeof parsed.parameters === 'object') ? parsed.parameters : {};

  // 2. Validate Target for OS App Actions
  if (['OPEN_APP', 'CLOSE_APP', 'FOCUS_APP'].includes(intentType)) {
    const rawTarget = (parsed.target || '').toUpperCase().trim();
    
    if (!rawTarget || !APP_REGISTRY[rawTarget]) {
      return {
        isValid: false,
        intent: null,
        error: `unknown_app_target: "${parsed.target}" not found in APP_REGISTRY`,
        requiresClarification: true,
        clarificationMessage: `I'm not sure which application you mean by "${parsed.target || 'that'}". Please specify an installed app.`
      };
    }

    // 3. Confidence Threshold Enforcement for OS Actions
    if (confidence < threshold) {
      const app = APP_REGISTRY[rawTarget];
      return {
        isValid: false,
        intent: null,
        error: 'low_confidence',
        requiresClarification: true,
        clarificationMessage: `Did you mean to open ${app.displayName}? Please confirm.`
      };
    }

    return {
      isValid: true,
      intent: {
        intent: intentType,
        target: rawTarget,
        app: APP_REGISTRY[rawTarget],
        parameters,
        confidence,
        reasoning: parsed.reasoning || null,
        requiresConfirmation: false
      },
      error: null
    };
  }

  // 4. Validate OPEN_URL
  if (intentType === 'OPEN_URL') {
    let url = parameters.url || null;
    let target = (parsed.target || '').toUpperCase().trim();
    let app = null;

    if (target && APP_REGISTRY[target]) {
      app = APP_REGISTRY[target];
      if (app.type === 'url' && app.url) {
        url = app.url;
      } else if (app.fallback && app.fallback.type === 'url') {
        url = app.fallback.url;
      }
    }

    if (!url && parameters.url) {
      url = parameters.url;
    }

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return {
        isValid: false,
        intent: null,
        error: 'missing_or_invalid_url'
      };
    }

    return {
      isValid: true,
      intent: {
        intent: 'OPEN_URL',
        target: target || 'WEB_URL',
        app,
        parameters: { url },
        confidence,
        reasoning: parsed.reasoning || null,
        requiresConfirmation: false
      },
      error: null
    };
  }

  // 5. PLAY_MEDIA (YouTube / Spotify Browser Automation)
  if (intentType === 'PLAY_MEDIA') {
    let target = (parsed.target || 'YOUTUBE').toUpperCase().trim();
    const query = (parameters.query || parsed.query || parameters.title || parameters.song || '').trim();

    if (!query) {
      return {
        isValid: false,
        intent: null,
        error: 'missing_media_query',
        requiresClarification: true,
        clarificationMessage: 'Aap kaunsa gaana ya video chalana chahte hain? Kripya naam batayein.'
      };
    }

    let url = '';
    let app = APP_REGISTRY[target] || APP_REGISTRY['YOUTUBE'];
    let appName = 'YouTube';

    if (target === 'SPOTIFY') {
      url = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
      appName = 'Spotify';
    } else {
      target = 'YOUTUBE';
      url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      appName = 'YouTube';
    }

    return {
      isValid: true,
      intent: 'PLAY_MEDIA',
      target,
      app,
      parameters: {
        query,
        url,
        service: target
      },
      confidence,
      reasoning: parsed.reasoning || null,
      responseMessage: `${appName} par "${query}" play kar diya gaya hai.`,
      requiresConfirmation: false
    };
  }

  // 6. SEARCH_WEB (Google / Wikipedia / GitHub / YouTube Web Search Automation)
  if (intentType === 'SEARCH_WEB') {
    let target = (parsed.target || 'GOOGLE').toUpperCase().trim();
    const query = (parameters.query || parsed.query || '').trim();

    if (!query) {
      return {
        isValid: false,
        intent: null,
        error: 'missing_search_query',
        requiresClarification: true,
        clarificationMessage: 'Aap kya search karna chahte hain? Kripya batayein.'
      };
    }

    let url = '';
    let appName = 'Google';
    let app = null;

    if (target === 'WIKIPEDIA') {
      url = `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`;
      appName = 'Wikipedia';
    } else if (target === 'GITHUB') {
      url = `https://github.com/search?q=${encodeURIComponent(query)}`;
      appName = 'GitHub';
    } else if (target === 'YOUTUBE') {
      url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      appName = 'YouTube';
    } else {
      target = 'GOOGLE';
      url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      appName = 'Google';
    }

    return {
      isValid: true,
      intent: 'SEARCH_WEB',
      target,
      app,
      parameters: {
        query,
        url,
        service: target
      },
      confidence,
      reasoning: parsed.reasoning || null,
      responseMessage: `${appName} par "${query}" search kar diya gaya hai.`,
      requiresConfirmation: false
    };
  }

  // 7. SEND_MESSAGE (WhatsApp Message Composer & Sender)
  if (intentType === 'SEND_MESSAGE') {
    const recipient = (parameters.recipient || parsed.recipient || parameters.to || '').trim();
    const message = (parameters.message || parsed.message || parameters.text || '').trim();

    if (!recipient) {
      return {
        isValid: false,
        intent: null,
        error: 'missing_recipient',
        requiresClarification: true,
        clarificationMessage: 'Aap kise WhatsApp message bhejna chahte hain? Kripya naam ya number batayein.'
      };
    }

    if (!message) {
      return {
        isValid: false,
        intent: null,
        error: 'missing_message',
        requiresClarification: true,
        clarificationMessage: `Aap ${recipient} ko kya message bhejna chahte hain? Kripya message batayein.`
      };
    }

    const contact = contactsManager.resolveContact(recipient);
    if (!contact || !contact.phone) {
      return {
        isValid: false,
        intent: null,
        error: 'unknown_contact',
        requiresClarification: true,
        clarificationMessage: `"${recipient}" ka phone number contact book mein nahi mila. Kripya unka 10-digit number batayein.`
      };
    }

    const cleanPhone = contact.phone.replace(/[^0-9]/g, '');
    const url = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

    return {
      isValid: true,
      intent: 'SEND_MESSAGE',
      target: 'WHATSAPP',
      app: APP_REGISTRY['WHATSAPP'],
      parameters: {
        recipient: contact.name,
        phone: contact.phone,
        message,
        url,
        service: 'WHATSAPP'
      },
      confidence,
      reasoning: parsed.reasoning || null,
      responseMessage: `${contact.name} ke liye WhatsApp message compose kar diya gaya hai: "${message}"`,
      requiresConfirmation: false
    };
  }

  // 8. CHAT intent
  if (intentType === 'CHAT') {
    return {
      isValid: true,
      intent: {
        intent: 'CHAT',
        target: null,
        parameters: {
          reply: parsed.reply || parameters.reply || null
        },
        confidence,
        reasoning: parsed.reasoning || null,
        requiresConfirmation: false
      },
      error: null
    };
  }

  // 9. CREATE_TASK intent
  if (intentType === 'CREATE_TASK') {
    const title = parameters.title || parsed.title || parsed.taskTitle || 'Untitled Task';
    return {
      isValid: true,
      intent: {
        intent: 'CREATE_TASK',
        target: null,
        parameters: { title },
        confidence,
        reasoning: parsed.reasoning || null,
        requiresConfirmation: false
      },
      error: null
    };
  }

  // 10. SEARCH_MEMORY intent
  if (intentType === 'SEARCH_MEMORY') {
    const query = parameters.query || parsed.query || '';
    return {
      isValid: true,
      intent: {
        intent: 'SEARCH_MEMORY',
        target: null,
        parameters: { query },
        confidence,
        reasoning: parsed.reasoning || null,
        requiresConfirmation: false
      },
      error: null
    };
  }

  return {
    isValid: false,
    intent: null,
    error: 'unhandled_intent_state'
  };
}

module.exports = {
  ALLOWED_INTENTS,
  DEFAULT_CONFIDENCE_THRESHOLD,
  sanitizeRawModelOutput,
  validateIntent
};
