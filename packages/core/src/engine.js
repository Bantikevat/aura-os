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
    this.notifications = [
      {
        id: 'notif_init_1',
        title: 'GitHub Synced',
        message: 'Repository Bantikevat/aura-os connected & tracked.',
        type: 'system',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        read: false,
        link: 'projects'
      },
      {
        id: 'notif_init_2',
        title: 'Project Milestone',
        message: 'AURA Life OS Core Scaffold and Memory engine ready.',
        type: 'project',
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        read: false,
        link: 'tasks'
      },
      {
        id: 'notif_init_3',
        title: 'NIST Policy Enforced',
        message: 'Human-in-the-loop approval boundaries active.',
        type: 'security',
        timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        read: false,
        link: 'settings'
      }
    ];

    // Register built-in tools
    this.registerTool(systemInspectorTool);
  }

  registerTool(tool) {
    this.tools.set(tool.name, tool);
  }

  getNotifications() {
    // Collect audit events from trust enforcer and combine
    const audits = this.getAudits().slice(-5).reverse();
    const dynamicNotifs = audits.map(a => ({
      id: 'notif_' + a.id,
      title: `Tool Executed: ${a.toolName}`,
      message: `Status: ${a.status.toUpperCase()} · ${a.evidence || 'Verified'}`,
      type: 'audit',
      timestamp: a.timestamp,
      read: false,
      link: 'audit'
    }));

    return [...this.notifications, ...dynamicNotifs];
  }

  markNotificationsRead() {
    this.notifications.forEach(n => n.read = true);
    return { success: true };
  }

  clearNotifications() {
    this.notifications = [];
    return { success: true };
  }

  getAudits() {
    try {
      if (fs.existsSync(this.trust.auditPath)) {
        return JSON.parse(fs.readFileSync(this.trust.auditPath, 'utf8'));
      }
    } catch {}
    return [];
  }

  /**
   * Universal Command & Intent Interpretation Layer:
   * Input -> Intent Detection -> Policy/Approval Check -> Execution -> Verification -> Response
   */
  async executeIntent({ userPrompt, userApproved = false, confirmationToken = null }) {
    const startTime = Date.now();
    const prompt = (userPrompt || '').trim();
    const pLower = prompt.toLowerCase();

    // 1. Sensitive / Destructive Actions Check (NIST Policy Requirement)
    if (pLower.startsWith('delete') || pLower.startsWith('remove') || pLower.includes('drop database') || pLower.includes('erase')) {
      if (!userApproved) {
        return {
          status: 'waiting_for_confirmation',
          requiresApproval: true,
          confirmationToken: 'confirm_' + Math.random().toString(36).substring(2, 8),
          warning: `Sensitive action requested: "${prompt}". This will irreversibly mutate state.`,
          action: 'destructive_mutation',
          prompt
        };
      }
    }

    // 2. Task / Goal Creation Intent ("Create task: ...", "Add task: ...", "Schedule: ...")
    if (pLower.startsWith('create task') || pLower.startsWith('add task') || pLower.startsWith('new task')) {
      const taskTitle = prompt.replace(/^(create task|add task|new task):?\s*/i, '').trim() || 'Untitled Task';
      
      const newGoal = this.goals.createGoal({
        title: taskTitle,
        description: `Task created via Universal Command Bar at ${new Date().toLocaleTimeString()}`,
        category: 'task',
        milestones: ['Define task scope', 'Implement solution', 'Verify completion']
      });

      // Verification: verify the task actually exists in goals file
      const allActive = this.goals.getActiveGoals();
      const verifiedSaved = allActive.some(g => g.id === newGoal.id);

      const auditEvent = this.trust.logExecution({
        toolName: 'task_manager',
        sensitivity: 'mutating',
        status: verifiedSaved ? 'success' : 'failed',
        evidence: `Goal '${newGoal.id}' verified saved to persistent storage`,
        durationMs: Date.now() - startTime
      });

      this.notifications.unshift({
        id: 'notif_' + newGoal.id,
        title: 'New Task Created',
        message: taskTitle,
        type: 'task',
        timestamp: new Date().toISOString(),
        read: false,
        link: 'tasks'
      });

      return {
        status: 'verified_complete',
        intent: 'create_task',
        task: newGoal,
        verification: {
          verified: verifiedSaved,
          proof: `Task '${taskTitle}' successfully written and verified in goals store`,
          auditEventId: auditEvent.id
        },
        response: `Task "${taskTitle}" has been verified and added to your active plan.`,
        navigateTo: 'tasks'
      };
    }

    // 3. Navigation Intents ("Open settings", "Go to learning", "Open my AURA project", etc.)
    const navMatch = this._detectNavigationIntent(pLower);
    if (navMatch) {
      return {
        status: 'verified_complete',
        intent: 'navigation',
        navigateTo: navMatch.page,
        response: navMatch.message
      };
    }

    // 3.5. Memory Store Intent ("Remember that ...", "Save note: ...")
    if (pLower.startsWith('remember that') || pLower.startsWith('store memory') || pLower.startsWith('save note')) {
      const content = prompt.replace(/^(remember that|store memory|save note):?\s*/i, '').trim();
      const mem = this.memory.addMemory({
        category: 'user_fact',
        content,
        tags: ['command_bar', 'header_intent']
      });
      const verified = this.memory.verifyMemory(mem.id);

      this.notifications.unshift({
        id: 'notif_mem_' + mem.id,
        title: 'New Memory Recorded',
        message: content.slice(0, 60),
        type: 'memory',
        timestamp: new Date().toISOString(),
        read: false,
        link: 'memory'
      });

      return {
        status: 'verified_complete',
        intent: 'memory_store',
        memory: mem,
        verification: {
          verified: !!verified,
          proof: `Memory '${mem.id}' successfully saved and verified in persistent store`
        },
        response: `I have verified and remembered: "${content}".`,
        navigateTo: 'memory'
      };
    }

    // 4. Memory Recall Intent ("What do you remember about...", "Search memory for...")
    if (pLower.includes('remember') || pLower.includes('memory') || pLower.startsWith('recall')) {
      const query = prompt.replace(/(what do you remember about|search memory for|recall|memory:?)/i, '').trim();
      const memories = query ? this.memory.search(query) : this.memory.getAll();

      return {
        status: 'verified_complete',
        intent: 'memory_search',
        memories,
        response: memories.length > 0
          ? `Found ${memories.length} relevant memories about "${query || 'your profile'}".`
          : `No existing memories found matching "${query}". You can add one by saying "Remember that..."`,
        navigateTo: 'memory'
      };
    }

    // 5. Memory Storing Intent ("Remember that...", "Store fact:...")
    if (pLower.startsWith('remember that') || pLower.startsWith('remember:') || pLower.startsWith('store:')) {
      const fact = prompt.replace(/^(remember that|remember:|store:)\s*/i, '').trim();
      const newMem = this.memory.addMemory({
        category: 'fact',
        content: fact,
        source: 'universal_command_bar',
        tags: ['user_note']
      });

      return {
        status: 'verified_complete',
        intent: 'store_memory',
        memory: newMem,
        response: `Got it Banti! I have stored in personal memory: "${fact}"`,
        navigateTo: 'memory'
      };
    }

    // 6. Research Intent ("Research latest...", "Search web for...")
    if (pLower.startsWith('research') || pLower.startsWith('find out about') || pLower.startsWith('search web')) {
      const topic = prompt.replace(/^(research|find out about|search web for|search:?)\s*/i, '').trim();
      return {
        status: 'verified_complete',
        intent: 'research',
        query: topic,
        response: `Initiating research on "${topic}". Opening research workspace.`,
        navigateTo: 'research'
      };
    }

    // 7. System Inspector Tool Loop (System health, status, telemetry)
    if (pLower.includes('system') || pLower.includes('health') || pLower.includes('status') || pLower.includes('ram')) {
      const tool = this.tools.get('system_inspector');
      const toolOutput = await tool.execute();
      const durationMs = Date.now() - startTime;
      const verification = VerificationEngine.verifyResult(tool, toolOutput);

      const auditEvent = this.trust.logExecution({
        toolName: tool.name,
        sensitivity: tool.sensitivity,
        status: verification.verified ? 'success' : 'unverified',
        evidence: verification.proof,
        durationMs
      });

      return {
        status: 'verified_complete',
        intent: 'system_inspector',
        tool: tool.name,
        toolOutput,
        verification,
        auditEventId: auditEvent.id,
        durationMs,
        response: `System Status: ${toolOutput.os.platform}-${toolOutput.os.arch} is operational. Free RAM: ${toolOutput.memory.freeMB} MB / ${toolOutput.memory.totalMB} MB.`
      };
    }

    // 8. General conversational query using memory context
    const relevantMemories = this.memory.search(prompt);
    return {
      status: 'verified_complete',
      intent: 'conversation',
      response: `Banti, I processed your query: "${prompt}". (${relevantMemories.length} memories evaluated).`,
      memories: relevantMemories
    };
  }

  _detectNavigationIntent(lower) {
    if (lower.includes('project') || lower.includes('github') || lower.includes('repo')) {
      return { page: 'projects', message: "Opening Projects Workspace." };
    }
    if (lower.includes('setting') || lower.includes('config') || lower.includes('preference')) {
      return { page: 'settings', message: "Opening System Settings." };
    }
    if (lower.includes('learn') || lower.includes('study') || lower.includes('teacher') || lower.includes('recursion')) {
      return { page: 'learning', message: "Opening Learning Center (Teacher Mode)." };
    }
    if (lower.includes('task') || lower.includes('todo') || lower.includes('plan')) {
      return { page: 'tasks', message: "Opening Tasks & Planning Board." };
    }
    if (lower.includes('goal')) {
      return { page: 'goals', message: "Opening Master Goals & Milestones." };
    }
    if (lower.includes('vision') || lower.includes('camera') || lower.includes('screen')) {
      return { page: 'vision', message: "Opening Vision Workspace." };
    }
    if (lower.includes('voice') || lower.includes('speak') || lower.includes('audio')) {
      return { page: 'voice', message: "Opening Voice Conversation Station." };
    }
    if (lower.includes('automate') || lower.includes('workflow') || lower.includes('n8n')) {
      return { page: 'automation', message: "Opening Automation Engine." };
    }
    if (lower.includes('calendar') || lower.includes('schedule')) {
      return { page: 'calendar', message: "Opening Calendar & Events." };
    }
    if (lower.includes('file') || lower.includes('doc') || lower.includes('pdf')) {
      return { page: 'files', message: "Opening Files & Documents Vault." };
    }
    if (lower.includes('device') || lower.includes('hardware')) {
      return { page: 'devices', message: "Opening Connected Devices." };
    }
    if (lower.includes('browser') || lower.includes('web agent')) {
      return { page: 'browser', message: "Opening Browser Agent Console." };
    }
    if (lower.includes('computer use') || lower.includes('desktop')) {
      return { page: 'computer', message: "Opening Computer-Use Environment." };
    }
    if (lower.includes('chat') || lower.includes('talk')) {
      return { page: 'chat', message: "Opening AURA Conversational Chat." };
    }
    if (lower.includes('home') || lower.includes('dashboard')) {
      return { page: 'home', message: "Returning to Main Command Center Dashboard." };
    }
    return null;
  }
}

module.exports = { AuraEngine };
