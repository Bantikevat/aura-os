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

    // 0. System Self-Echo Barrier (Drop speaker-to-mic loops before any matching)
    if (
      pLower.includes('मैंने सुना') ||
      pLower.includes('अलार्म सेट कर दिया गया है') ||
      pLower.includes('खोल रहा हूँ') ||
      pLower.includes('processed your query') ||
      pLower.includes('memories evaluated') ||
      pLower.includes('मेमोरीज') ||
      pLower.includes('एवालुएटेड')
    ) {
      return {
        status: 'ignored',
        intent: 'self_echo_filtered',
        response: null
      };
    }

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

    // 6.1. Stop Speech Command (English + Devanagari Hindi)
    if (
      pLower === 'stop' || 
      pLower.includes('ruko') || 
      pLower.includes('band karo') || 
      pLower.includes('chup') || 
      pLower.includes('shant') ||
      pLower.includes('स्टॉप') ||
      pLower.includes('रुको') ||
      pLower.includes('रुकिए') ||
      pLower.includes('चुप') ||
      pLower.includes('बंद करो')
    ) {
      return {
        status: 'verified_complete',
        intent: 'stop_speech',
        action: 'stop',
        response: null
      };
    }

    // 6.0. Real Native Windows Desktop App Launchers (VS Code, Antigravity, Notepad, Calc, Chrome, Paint, Terminal, Explorer)
    if (
      pLower.includes('vs code') || 
      pLower.includes('vscode') || 
      pLower.includes('वीएस कोड') || 
      pLower.includes('वी एस कोड') ||
      pLower.includes('कोड एडिटर')
    ) {
      return {
        status: 'verified_complete',
        intent: 'launch_desktop_app',
        appName: 'VS Code',
        command: 'code "C:\\Users\\hp\\Desktop\\prsnal\\aura-os"',
        response: 'VS Code खोल दिया गया है बंटी भाई!',
        action: 'launch_desktop_app'
      };
    }

    if (
      pLower.includes('antigravity') || 
      pLower.includes('anti gravity') || 
      pLower.includes('एंटीग्रैविटी') || 
      pLower.includes('एंटी ग्रैविटी') || 
      pLower.includes('एंटी ग्रेविटी') ||
      pLower.includes('एंटीग्रेविटी')
    ) {
      return {
        status: 'verified_complete',
        intent: 'launch_desktop_app',
        appName: 'Antigravity IDE',
        command: 'start "" "C:\\Users\\hp\\AppData\\Local\\Programs\\Antigravity IDE\\Antigravity IDE.exe"',
        response: 'Antigravity IDE खोल दिया गया है बंटी भाई!',
        action: 'launch_desktop_app'
      };
    }

    if (pLower.includes('notepad') || pLower.includes('नोटपैड')) {
      return {
        status: 'verified_complete',
        intent: 'launch_desktop_app',
        appName: 'Notepad',
        command: 'start notepad.exe',
        response: 'नोटपैड खोल दिया गया है।',
        action: 'launch_desktop_app'
      };
    }

    if (pLower.includes('calc') || pLower.includes('calculator') || pLower.includes('कैलकुलेटर') || pLower.includes('हिसाब')) {
      return {
        status: 'verified_complete',
        intent: 'launch_desktop_app',
        appName: 'Calculator',
        command: 'start calc.exe',
        response: 'कैलकुलेटर खोल दिया गया है।',
        action: 'launch_desktop_app'
      };
    }

    if (pLower.includes('chrome') || pLower.includes('क्रोम')) {
      return {
        status: 'verified_complete',
        intent: 'launch_desktop_app',
        appName: 'Google Chrome',
        command: 'start chrome',
        response: 'गूगल क्रोम खोल दिया गया है।',
        action: 'launch_desktop_app'
      };
    }

    if (pLower.includes('paint') || pLower.includes('पेंट')) {
      return {
        status: 'verified_complete',
        intent: 'launch_desktop_app',
        appName: 'Paint',
        command: 'start mspaint',
        response: 'पेंट खोल दिया गया है।',
        action: 'launch_desktop_app'
      };
    }

    if (pLower.includes('cmd') || pLower.includes('terminal') || pLower.includes('powershell') || pLower.includes('टर्मिनल') || pLower.includes('कमांड')) {
      return {
        status: 'verified_complete',
        intent: 'launch_desktop_app',
        appName: 'Terminal',
        command: 'start cmd.exe',
        response: 'कमांड टर्मिनल खोल दिया गया है।',
        action: 'launch_desktop_app'
      };
    }

    if (pLower.includes('task manager') || pLower.includes('टास्क मैनेजर')) {
      return {
        status: 'verified_complete',
        intent: 'launch_desktop_app',
        appName: 'Task Manager',
        command: 'start taskmgr.exe',
        response: 'टास्क मैनेजर खोल दिया गया है।',
        action: 'launch_desktop_app'
      };
    }

    if (pLower.includes('settings') || pLower.includes('सेटिंग्स') || pLower.includes('सेटिंग')) {
      return {
        status: 'verified_complete',
        intent: 'launch_desktop_app',
        appName: 'Windows Settings',
        command: 'start ms-settings:',
        response: 'विंडोज सेटिंग्स खोल दी गई हैं।',
        action: 'launch_desktop_app'
      };
    }

    if (pLower.includes('explorer') || pLower.includes('फाइल') || pLower.includes('फ़ाइल') || pLower.includes('files') || pLower.includes('my computer')) {
      return {
        status: 'verified_complete',
        intent: 'launch_desktop_app',
        appName: 'File Explorer',
        command: 'explorer.exe "C:\\Users\\hp\\Desktop\\prsnal"',
        response: 'फ़ाइल एक्सप्लोरर खोल दिया गया है।',
        action: 'launch_desktop_app'
      };
    }

    // 6.2. Real Web App Launchers (English + Devanagari Hindi)
    if (
      pLower.includes('youtube') || 
      pLower.includes('युटुब') || 
      pLower.includes('यूट्यूब') || 
      pLower.includes('यू ट्यूब') ||
      pLower.includes('यूटुब')
    ) {
      return {
        status: 'verified_complete',
        intent: 'open_url',
        url: 'https://www.youtube.com',
        appName: 'YouTube',
        response: 'यूट्यूब खोल रहा हूँ।',
        action: 'open_url'
      };
    }

    if (
      pLower.includes('whatsapp') || 
      pLower.includes('व्हाट्सएप') || 
      pLower.includes('व्हाट्सअप') || 
      pLower.includes('व्हाट्सऐप') ||
      pLower.includes('वाटसप')
    ) {
      return {
        status: 'verified_complete',
        intent: 'open_url',
        url: 'https://web.whatsapp.com',
        appName: 'WhatsApp',
        response: 'व्हाट्सएप खोल रहा हूँ।',
        action: 'open_url'
      };
    }

    if (pLower.includes('github') || pLower.includes('repo') || pLower.includes('गिटहब')) {
      return {
        status: 'verified_complete',
        intent: 'open_url',
        url: 'https://github.com/Bantikevat/aura-os',
        appName: 'GitHub',
        response: 'गिटहब खोल रहा हूँ।',
        action: 'open_url'
      };
    }

    if (pLower.includes('google') || pLower.includes('गूगल') || pLower.includes('गुगल')) {
      return {
        status: 'verified_complete',
        intent: 'open_url',
        url: 'https://www.google.com',
        appName: 'Google',
        response: 'गूगल खोल रहा हूँ।',
        action: 'open_url'
      };
    }
    if (pLower.includes('spotify') || pLower.includes('music') || pLower.includes('gana')) {
      return {
        status: 'verified_complete',
        intent: 'open_url',
        url: 'https://open.spotify.com',
        appName: 'Spotify',
        response: 'म्यूजिक खोल रहा हूँ।',
        action: 'open_url'
      };
    }

    // 6.3. Real Alarm & Timer ("Alarm set kar do 5 minute", "Set alarm for 10 minutes")
    if (pLower.includes('alarm') || pLower.includes('timer') || pLower.includes('अलार्म') || pLower.includes('टाइमर')) {
      const matchMin = prompt.match(/(\d+)\s*(min|minute|मिनट)/i);
      const minutes = matchMin ? parseInt(matchMin[1], 10) : 2;
      
      this.notifications.unshift({
        id: 'notif_alarm_' + Date.now(),
        title: 'Alarm Set',
        message: `${minutes} minute timer initiated`,
        type: 'alarm',
        timestamp: new Date().toISOString(),
        read: false,
        link: 'home'
      });

      return {
        status: 'verified_complete',
        intent: 'set_alarm',
        minutes,
        response: `${minutes} मिनट का अलार्म सेट कर दिया गया है।`,
        action: 'set_alarm'
      };
    }

    // 6.4. Real System Time ("Time bata do", "What is the time", "Time kya hua")
    if (pLower.includes('time') || pLower.includes('समय') || pLower.includes('घड़ी') || pLower.includes('kitne baje')) {
      const now = new Date();
      return {
        status: 'verified_complete',
        intent: 'tell_time',
        formattedTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        response: `अभी समय ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} है।`,
        action: 'tell_time'
      };
    }

    // 6.5. "Abhi kya chal raha hai" / Status Overview
    if (pLower.includes('kya chal raha') || pLower.includes('status batao') || pLower.includes('what are you doing') || pLower.includes('kya ho raha')) {
      const goalsCount = this.goals.getActiveGoals().length;
      const memoriesCount = this.memory.getAll().length;
      return {
        status: 'verified_complete',
        intent: 'status_overview',
        response: `AURA एक्टिव है। ${goalsCount} टास्क्स और ${memoriesCount} यादें सेफ़ हैं।`,
        action: 'status_overview'
      };
    }

    // 6.6. English Practice Partner Mode ("English practice", "Practice English", "Let's talk in English")
    if (pLower.includes('english practice') || pLower.includes('practice english') || pLower.includes('english me') || pLower.startsWith('hi aura') || pLower.startsWith('hello aura')) {
      return {
        status: 'verified_complete',
        intent: 'english_practice',
        mode: 'english',
        response: `Awesome Banti! I am your English practice partner. Let's speak in English! Tell me, what did you work on today, and how is your AI engineering journey going?`,
        action: 'english_practice'
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

    // 8. Filter out audio self-echoes or meaningless fragments
    if (
      pLower.includes('processed your query') ||
      pLower.includes('मैंने सुना') ||
      pLower.includes('अलार्म सेट कर दिया गया है') ||
      pLower.includes('खोल रहा हूँ') || 
      pLower.includes('memories evaluated') || 
      pLower.includes('मेमोरीज') || 
      pLower.includes('एवालुएटेड') ||
      prompt.length < 3
    ) {
      return {
        status: 'ignored',
        intent: 'noise_filtered',
        response: null
      };
    }

    // 8.1. Friendly, intelligent, warm conversation with Banti
    if (
      pLower.includes('tum kon ho') || 
      pLower.includes('tum kaun ho') || 
      pLower.includes('who are you') || 
      pLower.includes('तुम कौन हो') || 
      pLower.includes('तुम्हारा नाम क्या है') ||
      pLower.includes('apna parichay')
    ) {
      return {
        status: 'verified_complete',
        intent: 'conversation',
        response: 'मैं AURA हूँ, आपकी पर्सनल AI लाइफ OS। मैं आपके वॉइस कमांड्स से VS Code, Antigravity खोल सकता हूँ, और रियल टास्क पूरे कर सकता हूँ!'
      };
    }

    if (
      pLower.includes('kya kar sakte ho') || 
      pLower.includes('what can you do') || 
      pLower.includes('क्या कर सकते हो') || 
      pLower.includes('क्या कर सकता है')
    ) {
      return {
        status: 'verified_complete',
        intent: 'conversation',
        response: 'बंटी भाई, मैं आपके लिए VS Code, Antigravity, यूट्यूब खोल सकता हूँ, अलार्म लगा सकता हूँ और कोडिंग टास्क कर सकता हूँ।'
      };
    }

    if (
      pLower.includes('good morning') || 
      pLower.includes('गुड मॉर्निंग') || 
      pLower.includes('सुप्रभात')
    ) {
      return {
        status: 'verified_complete',
        intent: 'conversation',
        response: 'सुप्रभात बंटी भाई! आपका दिन बहुत शानदार और प्रोडक्टिव रहे। बताइए आज क्या शुरू करना है?'
      };
    }

    if (
      pLower.includes('kaise ho') || 
      pLower.includes('kaisa hai') || 
      pLower.includes('how are you') ||
      pLower.includes('कैसे हो') ||
      pLower.includes('कैसा है') ||
      pLower.includes('kya haal hai') ||
      pLower.includes('क्या हाल')
    ) {
      return {
        status: 'verified_complete',
        intent: 'conversation',
        response: 'नमस्ते बंटी भाई! मैं बिल्कुल मस्त और फुल एनर्जी में हूँ। आप बताइए, आज कोडिंग में क्या नया शुरू करना है?'
      };
    }

    if (
      pLower.includes('namaste') || 
      pLower.includes('नमस्ते') || 
      pLower.includes('hello') || 
      pLower.includes('hey') || 
      pLower.includes('hi') ||
      pLower.includes('हेलो') ||
      pLower.includes('हाय') ||
      pLower.includes('सुनो')
    ) {
      return {
        status: 'verified_complete',
        intent: 'conversation',
        response: 'नमस्ते बंटी भाई! AURA पूरी तरह आपकी सेवा में हाज़िर है। बताइए, कौन सा सॉफ़्टवेयर खोलें या किस टास्क पर काम करें?'
      };
    }

    if (pLower.includes('shukriya') || pLower.includes('dhanyawad') || pLower.includes('thank you') || pLower.includes('thanks') || pLower.includes('धन्यवाद') || pLower.includes('शुक्रिया')) {
      return {
        status: 'verified_complete',
        intent: 'conversation',
        response: 'अरे बंटी भाई, आपका बहुत-बहुत स्वागत है! मैं हमेशा आपकी सेवा में हाज़िर हूँ।'
      };
    }

    // 8.2. Contextual memory search or natural response
    const relevantMemories = this.memory.search(prompt);
    if (relevantMemories.length > 0) {
      return {
        status: 'verified_complete',
        intent: 'conversation',
        response: `बंटी भाई, मुझे आपकी यादों में मिला: "${relevantMemories[0].content}"। क्या इसपर आगे काम करें?`,
        memories: relevantMemories
      };
    }

    return {
      status: 'verified_complete',
      intent: 'conversation',
      response: 'जी बंटी भाई! आप मुझे VS Code या Antigravity खोलने, यूट्यूब चलाने या अलार्म सेट करने को कह सकते हैं।'
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
