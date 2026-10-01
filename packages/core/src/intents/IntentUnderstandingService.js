const { normalizeAndParseIntent } = require('./commandNormalizer');
const { validateIntent, DEFAULT_CONFIDENCE_THRESHOLD } = require('./intentSchema');
const { providerRegistry } = require('../providers/ProviderRegistry');
const { APP_REGISTRY } = require('../registry/appRegistry');

class IntentUnderstandingService {
  constructor(config = {}) {
    this.confidenceThreshold = config.confidenceThreshold || DEFAULT_CONFIDENCE_THRESHOLD;
    this.providerRegistry = config.providerRegistry || providerRegistry;
  }

  /**
   * Main entrypoint for understanding user voice or text.
   * Enforces 3-Tier Pipeline:
   * Tier 1: Deterministic Fast Path (0ms, 100% confidence, zero AI cost)
   * Tier 2: AI Intent Understanding (Ollama / Local LLM)
   * Tier 3: Strict Schema Validation & Safety Gate
   * 
   * @param {string} prompt - Raw natural language prompt
   * @returns {Promise<object>} Structured intent result
   */
  async process(prompt) {
    if (!prompt || typeof prompt !== 'string') {
      return { isCommand: false, error: 'empty_prompt', source: 'pre_filter' };
    }

    const cleanPrompt = prompt.trim();

    // =========================================================================
    // TIER 1: DETERMINISTIC FAST PATH (Requirement #5 & #7)
    // If simple alias/pattern matches, return immediately with 0ms AI overhead.
    // =========================================================================
    const fastPathResult = normalizeAndParseIntent(cleanPrompt);
    if (fastPathResult && fastPathResult.isCommand) {
      return {
        isCommand: true,
        source: 'deterministic',
        provider: 'regex_normalizer',
        intent: fastPathResult.intent,
        target: fastPathResult.target,
        app: fastPathResult.app,
        parameters: fastPathResult.parameters || {},
        confidence: 1.0,
        normalizedText: fastPathResult.normalizedText,
        originalPrompt: cleanPrompt
      };
    }

    // =========================================================================
    // TIER 2: AI INTENT UNDERSTANDING (Requirement #3, #4 & #6)
    // For natural Hindi/Hinglish/English that didn't match the hardcoded fast path.
    // =========================================================================
    const activeProvider = await this.providerRegistry.getActiveProvider();
    
    // If no AI provider is available (e.g. Ollama offline), gracefully fall back
    if (!activeProvider) {
      return {
        isCommand: false,
        source: 'deterministic_fallback',
        reason: 'no_ai_provider_online',
        originalPrompt: cleanPrompt
      };
    }

    try {
      const appsList = Object.keys(APP_REGISTRY).map(k => `${k} (${APP_REGISTRY[k].displayName})`);
      const rawAiOutput = await activeProvider.extractIntent(cleanPrompt, { appsList });

      // If provider returned null (timeout or network error), fall back safely
      if (!rawAiOutput) {
        return {
          isCommand: false,
          source: 'ai_fallback',
          reason: 'provider_returned_empty',
          originalPrompt: cleanPrompt
        };
      }

      // =========================================================================
      // TIER 3: STRICT SCHEMA VALIDATION & SAFETY GATE (Requirement #2 & #10)
      // Validates intent allowlist, target against APP_REGISTRY, and confidence.
      // =========================================================================
      const validation = validateIntent(rawAiOutput, this.confidenceThreshold);

      // Low confidence or unknown target requiring user clarification
      if (validation.requiresClarification) {
        return {
          isCommand: false,
          source: 'ai_understanding',
          provider: activeProvider.name,
          requiresClarification: true,
          clarificationMessage: validation.clarificationMessage,
          originalPrompt: cleanPrompt
        };
      }

      // Invalid or rejected intent
      if (!validation.isValid || !validation.intent) {
        return {
          isCommand: false,
          source: 'ai_understanding',
          provider: activeProvider.name,
          error: validation.error,
          originalPrompt: cleanPrompt
        };
      }

      const validated = validation.intent;

      // Conversational CHAT intent (Requirement #11)
      if (validated.intent === 'CHAT') {
        return {
          isCommand: false,
          source: 'ai_understanding',
          provider: activeProvider.name,
          isChat: true,
          reply: validated.parameters.reply || null,
          confidence: validated.confidence,
          originalPrompt: cleanPrompt
        };
      }

      // Validated Action Intent (OPEN_APP, OPEN_URL, FOCUS_APP, CLOSE_APP, etc.)
      return {
        isCommand: true,
        source: 'ai_understanding',
        provider: activeProvider.name,
        intent: validated.intent,
        target: validated.target,
        app: validated.app,
        parameters: validated.parameters,
        confidence: validated.confidence,
        reasoning: validated.reasoning,
        normalizedText: cleanPrompt,
        originalPrompt: cleanPrompt
      };

    } catch (err) {
      console.warn('[INTENT SERVICE ERROR]:', err.message);
      return {
        isCommand: false,
        source: 'ai_fallback',
        error: err.message,
        originalPrompt: cleanPrompt
      };
    }
  }
}

const intentUnderstandingService = new IntentUnderstandingService();

module.exports = {
  IntentUnderstandingService,
  intentUnderstandingService
};
