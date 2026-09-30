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
  clean = clean.replace(/^(hey aura|hello aura|aura|सुनो|अरे|please)\s+/i, '').trim();

  // 2. Identify Target Application
  const targetApp = findAppByAlias(clean);
  if (!targetApp) {
    return { isCommand: false, reason: 'no_target_app_match' };
  }

  // 3. Detect Action Verb
  const closePatterns = [
    'band karo', 'band kar do', 'band kar', 'band kardo', 'close karo', 'close kar do',
    'hatao', 'hata do', 'exit', 'quit', 'kill', 'close', 'terminate',
    'बंद करो', 'बंद कर दो', 'बंद कीजिए', 'हटाओ', 'काटो'
  ];

  const focusPatterns = [
    'foreground mein lao', 'foreground me lao', 'foreground', 'focus karo', 'focus kar do',
    'focus', 'aage lao', 'samne lao', 'bring to front', 'switch to',
    'सामने लाओ', 'आगे लाओ', 'फोकस करो'
  ];

  const openPatterns = [
    'kholo', 'khol do', 'kholna', 'kholiye', 'kholdo', 'chalao', 'chala do',
    'open karo', 'open kar do', 'start karo', 'start kar do', 'launch karo', 'launch kar do',
    'open', 'launch', 'start', 'run',
    'खोलो', 'खोल दो', 'खोलिए', 'चलाओ', 'ओपन करो', 'चालू करो'
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
