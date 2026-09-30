const { LocalOllamaAdapter } = require('./adapters/LocalOllamaAdapter');

class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.customProvider = null;
    this.initDefaultProviders();
  }

  initDefaultProviders() {
    // Register Ollama as primary local provider
    const ollama = new LocalOllamaAdapter();
    this.providers.set('ollama', ollama);
  }

  /**
   * Allows setting a custom or test mock provider (e.g. for CI / automated tests)
   */
  setCustomProvider(provider) {
    this.customProvider = provider;
  }

  /**
   * Resolves the active provider.
   * Priority:
   * 1. Custom/Mock Provider (if set)
   * 2. Local Ollama (if running)
   * 3. null (fallback to Phase 1 deterministic matcher)
   */
  async getActiveProvider() {
    if (this.customProvider) {
      const isAvail = await this.customProvider.isAvailable();
      if (isAvail) return this.customProvider;
    }

    const preferred = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();
    const candidate = this.providers.get(preferred) || this.providers.get('ollama');

    if (candidate) {
      const available = await candidate.isAvailable();
      if (available) {
        return candidate;
      }
    }

    return null; // No AI provider online; use Phase 1 fast deterministic path
  }
}

const providerRegistry = new ProviderRegistry();

module.exports = {
  ProviderRegistry,
  providerRegistry
};
