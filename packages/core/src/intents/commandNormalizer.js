const { APP_REGISTRY, findAppByAlias } = require('../registry/appRegistry');
const { contactsManager } = require('../contacts/contactsManager');

// Pure ASCII Unicode escape sequences for cross-platform reliability
const ytHindi = '\u092f\u0942\u091f\u094d\u092f\u0942\u092c|\u092f\u0941\u091f\u0941\u092c|\u092f\u0942 \u091f\u094d\u092f\u0942\u092c|\u092f\u0942\u091f\u0941\u092c';
const googleHindi = '\u0917\u0942\u0917\u0932|\u0917\u0941\u0917\u0932';
const wikiHindi = '\u0935\u093f\u0915\u093f\u092a\u0940\u0921\u093f\u092f\u093e|\u0935\u093f\u0915\u0940\u092a\u0940\u0921\u093f\u092f\u093e';
const ghHindi = '\u0917\u093f\u091f\u0939\u092c|\u0917\u093f\u091f \u0939\u092c';
const waHindi = '\u0935\u094d\u0939\u093e\u091f\u094d\u0938\u090f\u092a|\u0935\u093e\u091f\u0938\u0905\u092a|\u0935\u094d\u0939\u093e\u091f\u094d\u0938\u0905\u092a|\u0935\u094d\u0939\u093e\u091f\u094d\u0938\u0910\u092a';

const playHindi = '\u091a\u0932\u093e \u0926\u094b|\u091a\u0932\u093e\u0913|\u091a\u0932\u093e \u0926\u0947|\u091a\u0932\u093e \u0926\u0947\u0928\u093e|\u091a\u0932\u093e|\u092a\u094d\u0932\u0947 \u0915\u0930\u094b|\u092a\u094d\u0932\u0947 \u0915\u0930 \u0926\u094b|\u092c\u091c\u093e \u0926\u094b|\u092c\u091c\u093e\u0913|\u092c\u091c\u093e \u0926\u0947|\u0938\u0930\u094d\u091a \u0915\u0930\u094b|\u0938\u0930\u094d\u091a \u0915\u0930 \u0926\u094b|\u0938\u0930\u094d\u091a|\u0922\u0942\u0902\u0922\u094b|\u0916\u094b\u091c\u094b|\u0938\u0941\u0928\u093e\u0913|\u0938\u0941\u0928\u093e \u0926\u094b|\u0926\u093f\u0916\u093e\u0913|\u0926\u093f\u0916\u093e \u0926\u094b';
const openHindi = '\u0916\u094b\u0932\u094b|\u0916\u094b\u0932 \u0926\u094b|\u0916\u094b\u0932\u093f\u090f|\u0916\u094b\u0932\u0928\u093e|\u0936\u0941\u0930\u0942 \u0915\u0930\u094b|\u091a\u093e\u0932\u0942 \u0915\u0930\u094b|\u091a\u093e\u0932\u0942 \u0915\u0930 \u0926\u094b|\u091a\u093e\u0932\u0942';
const prepHindi = '\u092a\u0930|\u092a\u0947|\u092e\u0947\u0902|\u0915\u094b|\u0915\u0947|\u0938\u0947';
const msgHindi = '\u092e\u0948\u0938\u0947\u091c \u092d\u0947\u091c\u094b|\u092e\u0948\u0938\u0947\u091c \u0915\u0930\u094b|\u092e\u0948\u0938\u0947\u091c \u0921\u093e\u0932\u094b|\u092e\u0948\u0938\u0947\u091c \u0932\u093f\u0916\u094b|\u092e\u0948\u0938\u0947\u091c|\u0938\u0902\u0926\u0947\u0936 \u092d\u0947\u091c\u094b|\u0938\u0902\u0926\u0947\u0936|\u092c\u094b\u0932\u094b|\u0932\u093f\u0916\u094b|\u092d\u0947\u091c\u094b';
const closeHindi = '\u092c\u0902\u0926 \u0915\u0930\u094b|\u092c\u0902\u0926 \u0915\u0930 \u0926\u094b|\u0939\u091f\u093e\u0913|\u0939\u091f\u093e \u0926\u094b|\u092c\u0902\u0926';
const focusHindi = '\u0938\u093e\u092e\u0928\u0947 \u0932\u093e\u0913|\u0906\u0917\u0947 \u0932\u093e\u0913|\u092b\u094b\u0915\u0938 \u0915\u0930\u094b';

const ytWord = `(?:youtube|you\\s*tube|yt|${ytHindi})`;
const googleWord = `(?:google|googal|${googleHindi})`;
const wikiWord = `(?:wikipedia|wiki|${wikiHindi})`;
const ghWord = `(?:github|${ghHindi})`;
const waWord = `(?:whatsapp|whats\\s*app|${waHindi})`;

const playVerbs = `(?:chala\\s*do|chalao|chala\\s*de|chala\\s*dena|play\\s*karo|play\\s*kar\\s*do|play|baja\\s*do|bajao|baja|search\\s*karo|search\\s*kar\\s*do|search|dhoondo|khojo|suna\\s*do|sunao|${playHindi})`;
const openVerbs = `(?:kholo|open|start|launch|khol\\s*do|kholna|kholiye|open\\s*karo|chalu\\s*karo|chalu|${openHindi})`;
const searchVerbs = `(?:search\\s*karo|search\\s*kar\\s*do|search|dhoondo|khojo|dekho|${playHindi})`;

const prepOpt = `(?:\\s+(?:pe|par|me|mein|ko|ke|se|${prepHindi}))?`;
const toWord = `(?:ko|se|\\u0915\\u094b|\\u0938\\u0947)`;
const msgAction = `(?:message\\s*bhejo|message\\s*send\\s*karo|message\\s*karo|msg\\s*bhejo|msg\\s*karo|message|msg|bolo|likho|bhejo|send\\s*karo|${msgHindi})`;

function extractMediaOrSearch(clean, rawPrompt) {
  // Check if it is purely an open command (e.g. "youtube kholo" or "whatsapp kholo")
  if (new RegExp(`^${ytWord}${prepOpt}\\s*${openVerbs}?$`, 'i').test(clean) ||
      new RegExp(`^${openVerbs}\\s+${ytWord}$`, 'i').test(clean) ||
      new RegExp(`^${waWord}${prepOpt}\\s*${openVerbs}?$`, 'i').test(clean) ||
      new RegExp(`^${openVerbs}\\s+${waWord}$`, 'i').test(clean)) {
    return null; // Let standard APP_REGISTRY handle it as OPEN_APP
  }

  // --- 0. WhatsApp Message Composer ---
  // e.g. "whatsapp pe mummy ko message bhejo: ghar aa raha hoon"
  let waMatch = clean.match(new RegExp(`^${waWord}${prepOpt}\\s+(.+?)\\s+${toWord}\\s+${msgAction}\\s*[:\\-]?\\s*(.+)`, 'i')) ||
                clean.match(new RegExp(`^(?:send|bhejo)\\s+(?:whatsapp\\s+message|message\\s+on\\s+whatsapp|message)\\s+to\\s+([^:\\-]+?)\\s*[:\\-]?\\s*(.+)`, 'i'));
  if (waMatch && waMatch[1] && waMatch[2]) {
    const recipient = waMatch[1].trim();
    const msg = waMatch[2].trim();
    const contact = contactsManager.resolveContact(recipient);
    const phone = contact ? contact.phone : (recipient.replace(/[^0-9]/g, '').length >= 10 ? contactsManager.sanitizePhone(recipient) : null);
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
    const url = cleanPhone
      ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
      : 'https://web.whatsapp.com/';

    return {
      isCommand: true,
      intent: 'SEND_MESSAGE',
      target: 'WHATSAPP',
      app: APP_REGISTRY['WHATSAPP'],
      parameters: {
        recipient: contact ? contact.name : recipient,
        phone,
        message: msg,
        url,
        service: 'WHATSAPP'
      },
      normalizedText: clean,
      originalPrompt: rawPrompt
    };
  }

  // 1. YouTube Queries
  // Pattern A: youtube [pe/par] chala do <query>
  let ytMatch = clean.match(new RegExp(`^${ytWord}${prepOpt}\\s+${playVerbs}\\s+(.+)`, 'i'));
  if (ytMatch && ytMatch[1] && ytMatch[1].trim()) {
    const q = ytMatch[1].trim();
    return {
      isCommand: true,
      intent: 'PLAY_MEDIA',
      target: 'YOUTUBE',
      app: APP_REGISTRY['YOUTUBE'],
      parameters: { query: q, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, service: 'YOUTUBE' },
      normalizedText: clean,
      originalPrompt: rawPrompt
    };
  }

  // Pattern B: chalao <query> on youtube [pe/par]
  ytMatch = clean.match(new RegExp(`^${playVerbs}\\s+(.+?)\\s+(?:on|pe|par|me|mein|${prepHindi})?\\s*${ytWord}${prepOpt}$`, 'i'));
  if (ytMatch && ytMatch[1] && ytMatch[1].trim()) {
    const q = ytMatch[1].trim();
    return {
      isCommand: true,
      intent: 'PLAY_MEDIA',
      target: 'YOUTUBE',
      app: APP_REGISTRY['YOUTUBE'],
      parameters: { query: q, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, service: 'YOUTUBE' },
      normalizedText: clean,
      originalPrompt: rawPrompt
    };
  }

  // Pattern C: youtube [pe/par] <query> chala do
  ytMatch = clean.match(new RegExp(`^${ytWord}${prepOpt}\\s+(.+?)\\s+${playVerbs}$`, 'i'));
  if (ytMatch && ytMatch[1] && ytMatch[1].trim()) {
    const q = ytMatch[1].trim();
    const openWords = ['kholo', 'open', 'start', '\\u0916\\u094b\\u0932\\u094b'];
    if (!openWords.includes(q.toLowerCase())) {
      return {
        isCommand: true,
        intent: 'PLAY_MEDIA',
        target: 'YOUTUBE',
        app: APP_REGISTRY['YOUTUBE'],
        parameters: { query: q, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, service: 'YOUTUBE' },
        normalizedText: clean,
        originalPrompt: rawPrompt
      };
    }
  }

  // Pattern D: Catch "youtube pe/par <query>" without explicit verb (e.g. "youtube par arjit singh ke gaane")
  ytMatch = clean.match(new RegExp(`^${ytWord}${prepOpt}\\s+(.+)$`, 'i'));
  if (ytMatch && ytMatch[1] && ytMatch[1].trim()) {
    const q = ytMatch[1].trim();
    if (!new RegExp(`^${openVerbs}$`, 'i').test(q)) {
      const cleanQ = q.replace(new RegExp(`\\s+${playVerbs}$`, 'i'), '').trim();
      return {
        isCommand: true,
        intent: 'PLAY_MEDIA',
        target: 'YOUTUBE',
        app: APP_REGISTRY['YOUTUBE'],
        parameters: { query: cleanQ, url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ)}`, service: 'YOUTUBE' },
        normalizedText: clean,
        originalPrompt: rawPrompt
      };
    }
  }

  // 2. Google Queries
  let gMatch = clean.match(new RegExp(`^${googleWord}${prepOpt}\\s+${searchVerbs}\\s+(.+)`, 'i')) ||
               clean.match(new RegExp(`^${searchVerbs}\\s+(.+?)\\s+(?:on|pe|par|me|mein|${prepHindi})?\\s*${googleWord}${prepOpt}$`, 'i')) ||
               clean.match(new RegExp(`^${googleWord}${prepOpt}\\s+(.+?)\\s+${searchVerbs}$`, 'i'));
  if (gMatch && gMatch[1] && gMatch[1].trim()) {
    const q = gMatch[1].trim();
    return {
      isCommand: true,
      intent: 'SEARCH_WEB',
      target: 'GOOGLE',
      app: APP_REGISTRY['CHROME'] || null,
      parameters: { query: q, url: `https://www.google.com/search?q=${encodeURIComponent(q)}`, service: 'GOOGLE' },
      normalizedText: clean,
      originalPrompt: rawPrompt
    };
  }

  // 3. Wikipedia Queries
  let wMatch = clean.match(new RegExp(`^${wikiWord}${prepOpt}\\s+${searchVerbs}\\s+(.+)`, 'i')) ||
               clean.match(new RegExp(`^${wikiWord}${prepOpt}\\s+(.+?)\\s+${searchVerbs}$`, 'i')) ||
               clean.match(new RegExp(`^${searchVerbs}\\s+(.+?)\\s+(?:on|pe|par|me|mein|${prepHindi})?\\s*${wikiWord}${prepOpt}$`, 'i'));
  if (wMatch && wMatch[1] && wMatch[1].trim()) {
    const q = wMatch[1].trim();
    return {
      isCommand: true,
      intent: 'SEARCH_WEB',
      target: 'WIKIPEDIA',
      app: null,
      parameters: { query: q, url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`, service: 'WIKIPEDIA' },
      normalizedText: clean,
      originalPrompt: rawPrompt
    };
  }

  return null;
}

/**
 * Normalizes input text and parses OS application intents.
 * Supports Hindi (Devanagari), English, and Hinglish.
 */
function normalizeAndParseIntent(rawPrompt) {
  if (!rawPrompt || typeof rawPrompt !== 'string') {
    return { isCommand: false, error: 'empty_prompt' };
  }

  // 1. Clean and lowercase
  let clean = rawPrompt.toLowerCase().trim();

  // Strip common wake prefixes if present
  clean = clean.replace(/^(?:hey\\s+aura|hello\\s+aura|aura|please|kripya|\\u0915\\u0943\\u092a\\u092f\\u093e|\\u0938\\u0941\\u0928\\u094b)\\s+/i, '').trim();

  // =========================================================================
  // 1.5 BROWSER AUTOMATION FAST PATH: MEDIA, SEARCH & WHATSAPP
  // =========================================================================
  const mediaOrSearchResult = extractMediaOrSearch(clean, rawPrompt);
  if (mediaOrSearchResult) {
    return mediaOrSearchResult;
  }

  // =========================================================================
  // 2. STANDARD APP LAUNCHING / FOCUS / CLOSE
  // =========================================================================
  const targetApp = findAppByAlias(clean);
  if (!targetApp) {
    return { isCommand: false, reason: 'no_target_app_match' };
  }

  // 3. Detect Action Verb
  const closePatterns = [
    'band karo', 'band kar do', 'band kar', 'band kardo', 'close karo', 'close kar do',
    'hatao', 'hata do', 'exit', 'quit', 'kill', 'close', 'terminate',
    closeHindi
  ];

  const focusPatterns = [
    'foreground mein lao', 'foreground me lao', 'foreground', 'focus karo', 'focus kar do',
    'focus', 'aage lao', 'samne lao', 'bring to front', 'switch to',
    focusHindi
  ];

  let intent = 'OPEN_APP'; // default when app is identified

  for (const p of closePatterns) {
    if (clean.includes(p)) {
      intent = 'CLOSE_APP';
      break;
    }
  }

  if (intent === 'OPEN_APP') {
    for (const p of focusPatterns) {
      if (clean.includes(p)) {
        intent = 'FOCUS_APP';
        break;
      }
    }
  }

  return {
    isCommand: true,
    intent, // 'OPEN_APP' | 'CLOSE_APP' | 'FOCUS_APP'
    target: targetApp.id,
    app: targetApp,
    normalizedText: clean,
    originalPrompt: rawPrompt
  };
}

module.exports = {
  normalizeAndParseIntent
};
