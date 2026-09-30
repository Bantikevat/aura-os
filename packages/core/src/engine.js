const { MemoryStore } = require('./brain/memory/store');
const { GoalTracker } = require('./brain/goals/tracker');
const { systemInspectorTool } = require('./hands/builtins/system_tool');
const { TrustPolicyEnforcer } = require('./trust/policy/enforcer');
const { VerificationEngine } = require('./verification/verifier');

class AuraEngine {
  constructor() {
    this.memory = new MemoryStore();
    this.goals = new GoalTracker();
    this.trust = new TrustPolicyEnforcer();
    this.tools = new Map();

    // Register built-in tools
    this.registerTool(systemInspectorTool);
  }

  registerTool(tool) {
    this.tools.set(tool.name, tool);
  }

  /**
   * First Real Tool Loop (Section 20 & 72-Hour spec):
   * Understand Request -> Retrieve Memory -> Select Tool -> Policy Check -> Execute -> Verify -> Update Memory & Audit
   */
  async executeIntent({ userPrompt, userApproved = false }) {
    const startTime = Date.now();

    // 1. Context & Memory Retrieval
    const relevantMemories = this.memory.search(userPrompt);
    const activeGoals = this.goals.getActiveGoals();

    // 2. Intent Routing / Tool Selection
    // For demo/system queries, route to system_inspector
    let selectedTool = null;
    if (userPrompt.toLowerCase().includes('system') || 
        userPrompt.toLowerCase().includes('status') || 
        userPrompt.toLowerCase().includes('time') ||
        userPrompt.toLowerCase().includes('health')) {
      selectedTool = this.tools.get('system_inspector');
    }

    if (!selectedTool) {
      return {
        status: 'completed',
        response: `I processed your request using personal memory (${relevantMemories.length} memories retrieved). No external tool execution required.`,
        memories: relevantMemories
      };
    }

    // 3. Trust & Policy Check (NIST compliance)
    const policyCheck = this.trust.evaluateToolAccess(selectedTool, userApproved);
    if (!policyCheck.allowed) {
      return {
        status: 'blocked_pending_approval',
        tool: selectedTool.name,
        sensitivity: selectedTool.sensitivity,
        reason: policyCheck.reason
      };
    }

    // 4. Execution
    const toolOutput = await selectedTool.execute();
    const durationMs = Date.now() - startTime;

    // 5. Verification
    const verification = VerificationEngine.verifyResult(selectedTool, toolOutput);

    // 6. Audit Logging
    const auditEvent = this.trust.logExecution({
      toolName: selectedTool.name,
      sensitivity: selectedTool.sensitivity,
      status: verification.verified ? 'success' : 'unverified',
      evidence: verification.proof,
      durationMs
    });

    // 7. Write Execution Event to Memory
    this.memory.addMemory({
      category: 'episode',
      content: `Executed tool '${selectedTool.name}' with verified evidence: ${verification.proof}`,
      source: 'aura_agent_execution',
      tags: ['tool_execution', selectedTool.name]
    });

    return {
      status: 'verified_complete',
      tool: selectedTool.name,
      toolOutput,
      verification,
      auditEventId: auditEvent.id,
      durationMs
    };
  }
}

module.exports = { AuraEngine };
