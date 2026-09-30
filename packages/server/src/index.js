const { exec } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { AuraEngine } = require('../../core/src/engine');
const { osBridge } = require('./osBridge');
const { normalizeAndParseIntent } = require('../../core/src/intents/commandNormalizer');
const { intentUnderstandingService } = require('../../core/src/intents/IntentUnderstandingService');

const aura = new AuraEngine();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '../../../apps/web/public');

// Helper to send JSON
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Helper to parse POST body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // --- API Routes ---
  if (url.pathname === '/api/status' && req.method === 'GET') {
    return sendJSON(res, 200, {
      system: 'AURA Personal AI Life OS',
      version: '1.0.0',
      status: 'ONLINE',
      trustLevel: 'NIST_ENFORCED',
      activeGoalsCount: aura.goals.getActiveGoals().length,
      memoriesCount: aura.memory.getAll().length,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  }

  if (url.pathname === '/api/system/time' && req.method === 'GET') {
    return sendJSON(res, 200, {
      iso: new Date().toISOString(),
      localeTime: new Date().toLocaleTimeString(),
      localeDate: new Date().toLocaleDateString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  if (url.pathname === '/api/notifications' && req.method === 'GET') {
    return sendJSON(res, 200, { notifications: aura.getNotifications() });
  }

  if (url.pathname === '/api/notifications/read' && req.method === 'POST') {
    return sendJSON(res, 200, aura.markNotificationsRead());
  }

  if (url.pathname === '/api/notifications/clear' && req.method === 'POST') {
    return sendJSON(res, 200, aura.clearNotifications());
  }

  if (url.pathname === '/api/memories' && req.method === 'GET') {
    const category = url.searchParams.get('category');
    const data = category ? aura.memory.findByCategory(category) : aura.memory.getAll();
    return sendJSON(res, 200, { memories: data });
  }

  if (url.pathname === '/api/memories' && req.method === 'POST') {
    const body = await parseBody(req);
    if (!body.content || !body.category) {
      return sendJSON(res, 400, { error: 'content and category are required' });
    }
    const mem = aura.memory.addMemory({
      category: body.category,
      content: body.content,
      tags: body.tags || []
    });
    return sendJSON(res, 201, { memory: mem });
  }

  if (url.pathname === '/api/memories/verify' && req.method === 'POST') {
    const body = await parseBody(req);
    const verified = aura.memory.verifyMemory(body.id);
    return sendJSON(res, 200, { memory: verified });
  }

  if (url.pathname === '/api/goals' && req.method === 'GET') {
    return sendJSON(res, 200, { goals: aura.goals.getActiveGoals() });
  }

  if (url.pathname === '/api/goals' && req.method === 'POST') {
    const body = await parseBody(req);
    const goal = aura.goals.createGoal({
      title: body.title,
      description: body.description,
      category: body.category || 'personal',
      milestones: body.milestones || []
    });
    return sendJSON(res, 201, { goal });
  }

  if (url.pathname === '/api/audits' && req.method === 'GET') {
    return sendJSON(res, 200, { audits: aura.getAudits() });
  }

  if (url.pathname === '/api/execute' && req.method === 'POST') {
    const body = await parseBody(req);
    const userPrompt = (body.prompt || body.query || '').trim();
    const actionId = body.actionId || osBridge.generateActionId();

    // 1. Multi-Tier Intent Understanding (Tier 1 Fast Path -> Tier 2 AI -> Tier 3 Validation)
    const parsed = await intentUnderstandingService.process(userPrompt);

    // If low confidence or unknown app requires user clarification
    if (parsed.requiresClarification) {
      return sendJSON(res, 200, {
        status: 'clarification_required',
        actionId,
        source: parsed.source,
        provider: parsed.provider,
        response: parsed.clarificationMessage || 'Aap kya karna chahte hain? Kripya spasht karein.'
      });
    }

    // If validated as an executable action
    if (parsed.isCommand) {
      const osResult = await osBridge.executeAction({
        actionId,
        intent: parsed.intent,
        target: parsed.target,
        app: parsed.app,
        normalizedText: parsed.normalizedText
      });

      return sendJSON(res, 200, {
        status: osResult.success ? 'verified_complete' : 'failed',
        actionId,
        source: parsed.source,
        provider: parsed.provider,
        intent: osResult.intent,
        target: osResult.target,
        action: osResult.action,
        url: osResult.url,
        appName: osResult.appName,
        state: osResult.state,
        deduplicated: !!osResult.deduplicated,
        response: osResult.response,
        timestamp: osResult.timestamp
      });
    }

    // 2. Standard Engine Execution (Goals, Memory, NIST Confirmation Gates, Greetings, Chat)
    const result = await aura.executeIntent({
      userPrompt,
      userApproved: !!body.userApproved,
      confirmationToken: body.confirmationToken || null,
      actionId
    });

    return sendJSON(res, 200, result);
  }

  // --- Static Files Serving ---
  let filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log('========================================================');
  console.log('  ✨ AURA Life OS — Command Center LIVE');
  console.log(`  🌐 Access Web Interface: http://localhost:${PORT}`);
  console.log('  🔒 NIST Security Engine: ACTIVE');
  console.log('========================================================');
});
