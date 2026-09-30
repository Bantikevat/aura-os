/**
 * Abstract Base Provider for AI Intent Understanding.
 * All providers (Local Ollama, Gemini, OpenAI) must implement this contract.
 */
class BaseProvider {
  constructor(config = {}) {
    this.name = 'base';
    this.config = config;
  }

  /**
   * Checks if the provider service is reachable and ready to process requests.
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return false;
  }

  /**
   * Extracts a structured intent from a natural language user prompt.
   * @param {string} prompt - Raw user input (Hindi/English/Hinglish)
   * @param {object} context - Metadata such as available APP_REGISTRY definitions
   * @returns {Promise<object|null>} Parsed JSON intent object or null
   */
  async extractIntent(prompt, context = {}) {
    throw new Error(`extractIntent not implemented in ${this.name} provider`);
  }
}

module.exports = { BaseProvider };
