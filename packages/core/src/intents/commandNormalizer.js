const { APP_REGISTRY, findAppByAlias } = require('../registry/appRegistry');

const ytWord = '(?:youtube|you\\s*tube|yt|यूट्यूब|युटुब|यू\\s*ट्यूब|यूटुब)';
const googleWord = '(?:google|googal|गूगल)';
const wikiWord = '(?:wikipedia|wiki|विकिपीडिया|विकीपीडिया)';
const ghWord = '(?:github|गिटहब|गिट\\s*हब)';

const playVerbs = '(?:chala\\s*do|chalao|chala\\s*de|chala\\s*dena|play\\s*karo|play\\s*kar\\s*do|play|baja\\s*do|bajao|search\\s*karo|search\\s*kar\\s*do|dhoondo|khojo|चला\\s*दो|चलाओ|चला\\s*दे|चला\\s*देना|प्ले\\s*करो|बजा\\s*दो|बजाओ|सर्च\\s*करो|सर्च\\s*कर\\s*दो|ढूंढो|खोजो|दिखाओ|दिखा\\s*दो)';
const searchVerbs = '(?:search\\s*karo|search\\s*kar\\s*do|search|dhoondo|khojo|dekho|सर्च\\s*करो|सर्च\\s*कर\\s*दो|ढूंढो|खोजो|दिखाओ|दिखा\\s*दो|देखो)';

const prepOpt = '(?:\\s+(?:pe|par|me|mein|ko|पर|पे|में|को))?';

function extractMediaOrSearch(clean, rawPrompt) {
  // --- 1. YouTube Matchers ---
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

  // Pattern B: chalao <query> on youtube [par]
  ytMatch = clean.match(new RegExp(`^${playVerbs}\\s+(.+?)\\s+(?:on|pe|par|me|mein|पर|पे|में)?\\s*${ytWord}${prepOpt}$`, 'i'));
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
    if (!['kholo', 'open', 'start', 'खोलो'].includes(q.toLowerCase())) {
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

  // --- 2. Google Matchers ---
  // Pattern A: google [pe/par] search karo <query>
  let gMatch = clean.match(new RegExp(`^${googleWord}${prepOpt}\\s+${searchVerbs}\\s+(.+)`, 'i'));
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

  // Pattern B: search <query> on google
  gMatch = clean.match(new RegExp(`^${searchVerbs}\\s+(.+?)\\s+(?:on|pe|par|me|mein|पर|पे|में)?\\s*${googleWord}${prepOpt}$`, 'i'));
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

  // Pattern C: google [pe/par] <query> search karo
  gMatch = clean.match(new RegExp(`^${googleWord}${prepOpt}\\s+(.+?)\\s+${searchVerbs}$`, 'i'));
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

  // --- 3. Wikipedia Matchers ---
  let wMatch = clean.match(new RegExp(`^${wikiWord}${prepOpt}\\s+${searchVerbs}\\s+(.+)`, 'i')) ||
               clean.match(new RegExp(`^${wikiWord}${prepOpt}\\s+(.+?)\\s+${searchVerbs}$`, 'i')) ||
               clean.match(new RegExp(`^${searchVerbs}\\s+(.+?)\\s+(?:on|pe|par|me|mein|पर|पे|में)?\\s*${wikiWord}${prepOpt}$`, 'i'));
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

  // --- 4. GitHub Matchers ---
  let ghMatch = clean.match(new RegExp(`^${ghWord}${prepOpt}\\s+${searchVerbs}\\s+(.+)`, 'i')) ||
                clean.match(new RegExp(`^${ghWord}${prepOpt}\\s+(.+?)\\s+${searchVerbs}$`, 'i')) ||
                clean.match(new RegExp(`^${searchVerbs}\\s+(.+?)\\s+(?:on|pe|par|me|mein|पर|पे|में)?\\s*${ghWord}${prepOpt}$`, 'i'));
  if (ghMatch && ghMatch[1] && ghMatch[1].trim()) {
    const q = ghMatch[1].trim();
    return {
      isCommand: true,
      intent: 'SEARCH_WEB',
      target: 'GITHUB',
      app: null,
      parameters: { query: q, url: `https://github.com/search?q=${encodeURIComponent(q)}`, service: 'GITHUB' },
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
  clean = clean.replace(/^(hey aura|hello aura|aura|please|kripya|कृपया|सुनों|सुनो)\s+/i, '').trim();

  // =========================================================================
  // 1.5 BROWSER AUTOMATION FAST PATH: MEDIA & SEARCH
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
    'बंद करो', 'बंद कर दो', 'हटाओ', 'हटा दो', 'बंद'
  ];

  const focusPatterns = [
    'foreground mein lao', 'foreground me lao', 'foreground', 'focus karo', 'focus kar do',
    'focus', 'aage lao', 'samne lao', 'bring to front', 'switch to',
    'सामने लाओ', 'आगे लाओ', 'फोकस करो'
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
