/**
 * AURA Phase 2 & Phase 1 Comprehensive Verification Test Suite
 */
const http = require('http');
const { IntentUnderstandingService } = require('../packages/core/src/intents/IntentUnderstandingService');
const { ProviderRegistry } = require('../packages/core/src/providers/ProviderRegistry');
const { BaseProvider } = require('../packages/core/src/providers/BaseProvider');
const { validateIntent, sanitizeRawModelOutput } = require('../packages/core/src/intents/intentSchema');

// Helper to make HTTP POST requests to running server
function makePost(endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, body: raw });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Mock AI Provider for testing Tier 2 & Tier 3 behaviors
class MockAiProvider extends BaseProvider {
  constructor(name = 'mock-llm') {
    super(name);
    this.responses = {};
    this.defaultResponse = null;
    this.callCount = 0;
  }

  setMockResponse(promptPattern, response) {
    this.responses[promptPattern] = response;
  }

  async isAvailable() {
    return true;
  }

  async extractIntent(prompt, context) {
    this.callCount++;
    for (const [pattern, resp] of Object.entries(this.responses)) {
      if (prompt.toLowerCase().includes(pattern.toLowerCase())) {
        return resp;
      }
    }
    return this.defaultResponse;
  }
}

async function runPhase2Tests() {
  console.log('\n======================================================');
  console.log('       AURA PHASE 2 COMPREHENSIVE TEST SUITE          ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST A: Deterministic fast path ("VS Code kholo") -> NO LLM CALL
  // ----------------------------------------------------
  console.log('\n--- Section 1: Fast Path vs AI Routing ---');
  const mockRegistry = new ProviderRegistry();
  const mockProvider = new MockAiProvider();
  mockRegistry.setCustomProvider(mockProvider);
  const serviceWithMock = new IntentUnderstandingService({ providerRegistry: mockRegistry });

  const resA = await serviceWithMock.process('VS Code kholo');
  assert(
    resA.isCommand === true &&
    resA.source === 'deterministic' &&
    resA.intent === 'OPEN_APP' &&
    resA.target === 'VS_CODE' &&
    mockProvider.callCount === 0,
    'Test A: Deterministic Fast Path ("VS Code kholo" does NOT call LLM)'
  );

  // ----------------------------------------------------
  // TEST B: AI Path ("bhai zara wo coding editor khol de") -> OPEN_APP + VS_CODE
  // ----------------------------------------------------
  mockProvider.setMockResponse('coding editor', {
    intent: 'OPEN_APP',
    target: 'VS_CODE',
    confidence: 0.98,
    reasoning: 'User asked for the coding editor, which maps to VS_CODE'
  });

  const resB = await serviceWithMock.process('bhai zara wo coding editor khol de');
  assert(
    resB.isCommand === true &&
    resB.source === 'ai_understanding' &&
    resB.intent === 'OPEN_APP' &&
    resB.target === 'VS_CODE' &&
    resB.confidence >= 0.95 &&
    mockProvider.callCount === 1,
    'Test B: AI Path (Natural phrasing "bhai zara wo coding editor khol de" -> OPEN_APP + VS_CODE)'
  );

  // ----------------------------------------------------
  // TEST C: Hinglish phrasing ("calculator chalu karo")
  // ----------------------------------------------------
  mockProvider.setMockResponse('hisab kitab wala tool', {
    intent: 'OPEN_APP',
    target: 'CALCULATOR',
    confidence: 0.99
  });

  const resC = await serviceWithMock.process('hisab kitab wala tool chalu kar');
  assert(
    resC.isCommand === true &&
    resC.target === 'CALCULATOR' &&
    resC.source === 'ai_understanding',
    'Test C: Hinglish natural phrasing ("hisab kitab wala tool chalu kar" -> OPEN_APP + CALCULATOR)'
  );

  // ----------------------------------------------------
  // TEST D: URL resolution ("youtube chala do")
  // ----------------------------------------------------
  mockProvider.setMockResponse('video gaane sunao', {
    intent: 'OPEN_URL',
    target: 'YOUTUBE',
    parameters: { url: 'https://youtube.com' },
    confidence: 0.96
  });

  const resD = await serviceWithMock.process('kuch video gaane sunao');
  assert(
    resD.isCommand === true &&
    resD.intent === 'OPEN_URL' &&
    resD.target === 'YOUTUBE',
    'Test D: URL resolution via AI ("kuch video gaane sunao" -> OPEN_URL + YOUTUBE)'
  );

  // ----------------------------------------------------
  // TEST E: Conversational mode ("What is React?") -> CHAT (no OS action)
  // ----------------------------------------------------
  mockProvider.setMockResponse('What is React', {
    intent: 'CHAT',
    parameters: { reply: 'React is a popular JavaScript library for building user interfaces.' },
    confidence: 0.99
  });

  const resE = await serviceWithMock.process('What is React?');
  assert(
    resE.isCommand === false &&
    resE.isChat === true &&
    resE.reply !== null,
    'Test E: Conversational Intent ("What is React?" -> CHAT, does NOT execute OS command)'
  );

  // ----------------------------------------------------
  // TEST F: Invalid JSON / malformed model output -> safe fallback
  // ----------------------------------------------------
  console.log('\n--- Section 2: Strict Validation & Security Boundary ---');
  mockProvider.setMockResponse('corrupted_command', null); // simulates malformed/null output
  const resF = await serviceWithMock.process('corrupted_command');
  assert(
    resF.isCommand === false &&
    (resF.source === 'ai_fallback' || resF.error !== undefined),
    'Test F: Malformed / Invalid JSON -> safe fallback, no crash'
  );

  // Test markdown fence stripping in sanitizeRawModelOutput
  const fencedJson = 'Here is your intent:\n```json\n{"intent": "OPEN_APP", "target": "PAINT", "confidence": 0.95}\n```';
  const sanitized = sanitizeRawModelOutput(fencedJson);
  assert(
    sanitized !== null && sanitized.intent === 'OPEN_APP' && sanitized.target === 'PAINT',
    'Test F.1: Sanitization handles markdown code fences successfully'
  );

  // ----------------------------------------------------
  // TEST G: Unknown application ("open superhacker") -> rejected / clarification
  // ----------------------------------------------------
  mockProvider.setMockResponse('chalu karo cyber hacking', {
    intent: 'OPEN_APP',
    target: 'SUPER_HACKER_TOOL',
    confidence: 0.95
  });

  const resG = await serviceWithMock.process('chalu karo cyber hacking');
  assert(
    resG.isCommand === false &&
    resG.requiresClarification === true,
    'Test G: Unknown application target ("SUPER_HACKER_TOOL") rejected from APP_REGISTRY'
  );

  // ----------------------------------------------------
  // TEST H: Low confidence threshold enforcement (< 0.70)
  // ----------------------------------------------------
  mockProvider.setMockResponse('kuch dhoondho internet pe', {
    intent: 'OPEN_APP',
    target: 'CHROME',
    confidence: 0.45 // below 0.70 threshold
  });

  const resH = await serviceWithMock.process('kuch dhoondho internet pe');
  assert(
    resH.isCommand === false &&
    resH.requiresClarification === true &&
    resH.clarificationMessage.includes('Google Chrome'),
    'Test H: Low confidence (< 0.70) halts automatic execution and asks for user clarification'
  );

  // Direct schema verification of confidence threshold
  const lowConfValidation = validateIntent({ intent: 'OPEN_APP', target: 'VS_CODE', confidence: 0.50 }, 0.70);
  assert(
    lowConfValidation.isValid === false &&
    lowConfValidation.requiresClarification === true,
    'Test H.1: Validator unit-test strictly flags confidence < 0.70'
  );

  // ----------------------------------------------------
  // TEST I: Unauthorized shell-like instruction injection
  // ----------------------------------------------------
  const maliciousOutput = {
    intent: 'OPEN_APP',
    target: 'VS_CODE',
    confidence: 0.99,
    command: 'rmdir /s /q C:\\Windows',
    shell: 'powershell.exe -Command "iex(New-Object Net.WebClient)..."',
    exec: 'format D:'
  };
  const validatedMalicious = validateIntent(maliciousOutput);
  assert(
    validatedMalicious.isValid === true &&
    validatedMalicious.intent.command === undefined &&
    validatedMalicious.intent.shell === undefined &&
    validatedMalicious.intent.exec === undefined,
    'Test I: Security boundary strictly strips arbitrary command/shell injection fields'
  );

  // Test unauthorized intent rejected
  const fakeIntentOutput = {
    intent: 'EXECUTE_POWERSHELL_SCRIPT',
    confidence: 0.99
  };
  const validatedFakeIntent = validateIntent(fakeIntentOutput);
  assert(
    validatedFakeIntent.isValid === false &&
    validatedFakeIntent.error.includes('unsupported_intent'),
    'Test I.1: Disallowed intent types ("EXECUTE_POWERSHELL_SCRIPT") strictly rejected'
  );

  // ----------------------------------------------------
  // TEST J: Ollama offline / provider unavailable -> fallback
  // ----------------------------------------------------
  console.log('\n--- Section 3: Provider Fallback & Offline Resilience ---');
  const emptyRegistry = new ProviderRegistry(); // has only Ollama which may be offline
  const serviceWithEmpty = new IntentUnderstandingService({ providerRegistry: emptyRegistry });

  // A natural prompt that doesn't match fast path
  const resJ = await serviceWithEmpty.process('kripya mujhe koi aisi cheez dikhao');
  assert(
    resJ.isCommand === false &&
    (resJ.source === 'deterministic_fallback' || resJ.source === 'ai_fallback'),
    'Test J: Graceful fallback when AI provider is unavailable without unhandled errors'
  );

  // ----------------------------------------------------
  // TEST K: End-to-End HTTP Server Integration
  // ----------------------------------------------------
  console.log('\n--- Section 4: Live Server Integration & Phase-1 Invariants ---');
  
  // K1: Fast Path via API
  const apiFastRes = await makePost('/api/execute', { prompt: 'VS Code kholo' });
  assert(
    apiFastRes.status === 200 &&
    apiFastRes.body.status === 'verified_complete' &&
    apiFastRes.body.source === 'deterministic' &&
    apiFastRes.body.target === 'VS_CODE' &&
    apiFastRes.body.actionId !== undefined,
    'Test K.1: Live API Fast Path ("VS Code kholo" -> 200 verified_complete, source: deterministic)'
  );

  // K2: Conversational Chat via API
  const apiChatRes = await makePost('/api/execute', { prompt: 'What is React?' });
  assert(
    apiChatRes.status === 200 &&
    apiChatRes.body.intent === 'conversation' &&
    apiChatRes.body.target === undefined,
    'Test K.2: Live API Conversational Chat ("What is React?" routes to conversational intent, target undefined)'
  );

  // K3: NIST destructive policy preservation via API
  const nistRes = await makePost('/api/execute', { prompt: 'delete database' });
  assert(
    nistRes.status === 200 &&
    (nistRes.body.requiresConfirmation === true || nistRes.body.status === 'clarification_required' || nistRes.body.state === 'PENDING_APPROVAL' || nistRes.body.confirmationToken !== undefined),
    'Test K.3: NIST 2-step confirmation gate remains active on destructive action requests'
  );

  console.log('\n======================================================');
  console.log(`TOTAL PHASE 2 TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
