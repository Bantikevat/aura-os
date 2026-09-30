const { APP_REGISTRY } = require('../registry/appRegistry');

const ALLOWED_INTENTS = new Set([
  'OPEN_APP',
  'OPEN_URL',
  'FOCUS_APP',
  'CLOSE_APP',
  'CHAT',
  'CREATE_TASK',
  'SEARCH_MEMORY'
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

  // 5. CHAT intent
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

  // 6. CREATE_TASK intent
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

  // 7. SEARCH_MEMORY intent
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
