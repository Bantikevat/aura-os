const { APP_REGISTRY, findAppByAlias } = require('../registry/appRegistry');

/**
 * Normalizes input text and parses OS application intents.
 * Supports Hindi, English, and Hinglish.
 */
function normalizeAndParseIntent(rawPrompt) {
  if (!rawPrompt || typeof rawPrompt !== 'string') {
    return { isCommand: false, error: 'empty_prompt' };
  }

  // 1. Clean and lowercase
  let clean = rawPrompt.toLowerCase().trim();

  // Strip common wake prefixes if present
  clean = clean.replace(/^(hey aura|hello aura|aura|please|kripya)\s+/i, '').trim();

  // =========================================================================
  // 1.5 BROWSER AUTOMATION FAST PATH: PLAY MEDIA & SEARCH WEB
  // =========================================================================

  // --- YouTube Play / Search ---
  // e.g. "youtube pe arijit singh ke gaane chala do"
  const ytPlayMatch1 = clean.match(/(?:youtube|yt)\s+(?:pe|par|me|mein)\s+(.+?)\s+(?:chala\s*do|chalao|play\s*karo|play\s*kar\s*do|baja\s*do|bajao)/i);
  // e.g. "play lofi beats on youtube" or "chalao lofi beats youtube pe"
  const ytPlayMatch2 = clean.match(/(?:play|chalao|chala\s*do|bajao|baja\s*do)\s+(.+?)\s+(?:on\s+youtube|youtube\s+pe|youtube\s+par)/i);
  // e.g. "youtube pe search karo ..."
  const ytSearchMatch = clean.match(/(?:youtube|yt)\s+(?:pe|par|me|mein)\s+(?:search\s*karo|search\s*kar\s*do|dhoondo)\s+(.+)/i);

  const ytQuery = (ytPlayMatch1 && ytPlayMatch1[1]) || (ytPlayMatch2 && ytPlayMatch2[1]) || (ytSearchMatch && ytSearchMatch[1]);
  if (ytQuery && ytQuery.trim()) {
    const query = ytQuery.trim();
    return {
      isCommand: true,
      intent: 'PLAY_MEDIA',
      target: 'YOUTUBE',
      app: APP_REGISTRY['YOUTUBE'],
      parameters: {
        query,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
        service: 'YOUTUBE'
      },
      normalizedText: clean,
      originalPrompt: rawPrompt
    };
  }

  // --- Google Search ---
  // e.g. "google pe search karo best laptops" or "google par dhoondo best laptops"
  const googleMatch1 = clean.match(/(?:google)\s+(?:pe|par|me|mein)\s+(?:search\s*karo|search\s*kar\s*do|dhoondo)\s+(.+)/i);
  // e.g. "google pe best laptops search karo"
  const googleMatch2 = clean.match(/(?:google)\s+(?:pe|par|me|mein)\s+(.+?)\s+(?:search\s*karo|search\s*kar\s*do|dhoondo)/i);
  // e.g. "search best laptops on google" or "search google for best laptops"
  const googleMatch3 = clean.match(/(?:search|dhoondo)\s+(?:on\s+google|google\s+for)\s+(.+)/i);
  const googleMatch4 = clean.match(/(?:search|dhoondo)\s+(.+?)\s+on\s+google/i);

  const googleQuery = (googleMatch1 && googleMatch1[1]) || (googleMatch2 && googleMatch2[1]) || (googleMatch3 && googleMatch3[1]) || (googleMatch4 && googleMatch4[1]);
  if (googleQuery && googleQuery.trim()) {
    const query = googleQuery.trim();
    return {
      isCommand: true,
      intent: 'SEARCH_WEB',
      target: 'GOOGLE',
      app: APP_REGISTRY['CHROME'] || null,
      parameters: {
        query,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        service: 'GOOGLE'
      },
      normalizedText: clean,
      originalPrompt: rawPrompt
    };
  }

  // --- Wikipedia Search ---
  const wikiMatch1 = clean.match(/(?:wikipedia|wiki)\s+(?:pe|par|me|mein)\s+(?:search\s*karo|search\s*kar\s*do|dhoondo)\s+(.+)/i);
  const wikiMatch2 = clean.match(/(?:wikipedia|wiki)\s+(?:pe|par|me|mein)\s+(.+?)\s+(?:search\s*karo|search\s*kar\s*do|dhoondo)/i);
  const wikiMatch3 = clean.match(/(?:search|dhoondo)\s+(.+?)\s+on\s+wikipedia/i);
  const wikiQuery = (wikiMatch1 && wikiMatch1[1]) || (wikiMatch2 && wikiMatch2[1]) || (wikiMatch3 && wikiMatch3[1]);
  if (wikiQuery && wikiQuery.trim()) {
    const query = wikiQuery.trim();
    return {
      isCommand: true,
      intent: 'SEARCH_WEB',
      target: 'WIKIPEDIA',
      app: null,
      parameters: {
        query,
        url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(query)}`,
        service: 'WIKIPEDIA'
      },
      normalizedText: clean,
      originalPrompt: rawPrompt
    };
  }

  // --- GitHub Search ---
  const ghMatch1 = clean.match(/(?:github)\s+(?:pe|par|me|mein)\s+(?:search\s*karo|search\s*kar\s*do|dhoondo)\s+(.+)/i);
  const ghMatch2 = clean.match(/(?:github)\s+(?:pe|par|me|mein)\s+(.+?)\s+(?:search\s*karo|search\s*kar\s*do|dhoondo)/i);
  const ghMatch3 = clean.match(/(?:search|dhoondo)\s+(.+?)\s+on\s+github/i);
  const ghQuery = (ghMatch1 && ghMatch1[1]) || (ghMatch2 && ghMatch2[1]) || (ghMatch3 && ghMatch3[1]);
  if (ghQuery && ghQuery.trim()) {
    const query = ghQuery.trim();
    return {
      isCommand: true,
      intent: 'SEARCH_WEB',
      target: 'GITHUB',
      app: null,
      parameters: {
        query,
        url: `https://github.com/search?q=${encodeURIComponent(query)}`,
        service: 'GITHUB'
      },
      normalizedText: clean,
      originalPrompt: rawPrompt
    };
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
    'hatao', 'hata do', 'exit', 'quit', 'kill', 'close', 'terminate'
  ];

  const focusPatterns = [
    'foreground mein lao', 'foreground me lao', 'foreground', 'focus karo', 'focus kar do',
    'focus', 'aage lao', 'samne lao', 'bring to front', 'switch to'
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
