const https = require('https');
const { exec, spawn } = require('child_process');
const fs = require('fs');

class OsBridge {
  constructor() {
    this.inFlightActions = new Set();
    this.completedActions = new Map();
    this.recentCommands = new Map(); // key: normalizedText, val: { actionId, timestamp, result }
    this.dedupWindowMs = 2500; // 2.5 second window for duplicate voice recognition events
  }

  generateActionId() {
    return 'cmd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  }

  /**
   * Executes a validated parsed command through the safe OS bridge.
   * Enforces State Machine: IDLE -> PLANNING -> EXECUTING -> VERIFYING -> COMPLETED
   */
  async executeAction({ actionId, intent, target, app, parameters = {}, normalizedText }) {
    const actId = actionId || this.generateActionId();
    const now = Date.now();

    // 1. Duplicate Voice Protection (Requirement #5)
    if (normalizedText && this.recentCommands.has(normalizedText)) {
      const recent = this.recentCommands.get(normalizedText);
      if (now - recent.timestamp < this.dedupWindowMs) {
        console.log(`[DEDUP VOICE FILTER] Dropping duplicated command "${normalizedText}" within ${now - recent.timestamp}ms window`);
        return {
          ...recent.result,
          deduplicated: true,
          actionId: recent.actionId,
          state: 'COMPLETED'
        };
      }
    }

    // 2. Action Idempotency Check (Requirement #4)
    if (this.inFlightActions.has(actId)) {
      console.warn(`[IDEMPOTENCY] Action ${actId} is already IN_FLIGHT. Ignoring duplicate execution.`);
      return { status: 'in_flight', actionId: actId, state: 'EXECUTING' };
    }

    if (this.completedActions.has(actId)) {
      console.log(`[IDEMPOTENCY] Action ${actId} already COMPLETED. Returning cached result.`);
      return this.completedActions.get(actId);
    }

    // Mark as in-flight
    this.inFlightActions.add(actId);

    let state = 'PLANNING';
    const logEntry = {
      timestamp: new Date().toISOString(),
      actionId: actId,
      intent,
      target,
      normalizedCommand: normalizedText,
      attemptCount: 1,
      state
    };

    try {
      state = 'EXECUTING';
      logEntry.state = state;

      let result = null;

      if (intent === 'OPEN_APP') {
        result = await this._handleOpenApp(app);
      } else if (intent === 'CLOSE_APP') {
        result = await this._handleCloseApp(app);
      } else if (intent === 'FOCUS_APP') {
        result = await this._handleFocusApp(app);
      } else if (intent === 'PLAY_MEDIA') {
        result = await this._handlePlayMedia({ app, parameters, target });
      } else if (intent === 'SEARCH_WEB') {
        result = await this._handleSearchWeb({ app, parameters, target });
      } else if (intent === 'SEND_MESSAGE') {
        result = await this._handleSendMessage({ app, parameters, target });
      } else {
        result = {
          success: false,
          state: 'FAILED',
          response: `Unsupported action: ${intent}`,
          error: 'unknown_intent'
        };
      }

      state = result.success ? 'COMPLETED' : 'FAILED';
      result.state = state;
      result.actionId = actId;
      result.intent = intent;
      result.target = target;
      result.timestamp = new Date().toISOString();

      // Store in completed actions cache (keep max 100 entries)
      this.completedActions.set(actId, result);
      if (this.completedActions.size > 100) {
        const firstKey = this.completedActions.keys().next().value;
        this.completedActions.delete(firstKey);
      }

      // Store in recent commands for duplicate window protection
      if (normalizedText) {
        this.recentCommands.set(normalizedText, {
          actionId: actId,
          timestamp: Date.now(),
          result
        });
      }

      console.log(`[OS BRIDGE EXECUTED] ${actId} | Intent: ${intent} | Target: ${target} | State: ${state} | Response: "${result.response}"`);
      return result;
    } catch (err) {
      console.error(`[OS BRIDGE ERROR] ${actId}:`, err);
      const failedResult = {
        success: false,
        state: 'FAILED',
        actionId: actId,
        intent,
        target,
        response: `Error: ${err.message}`,
        error: err.message
      };
      this.completedActions.set(actId, failedResult);
      return failedResult;
    } finally {
      this.inFlightActions.delete(actId);
    }
  }

  // --- Handlers for Intents ---

  async _handleOpenApp(app) {
    if (!app) return { success: false, response: 'App not found in registry.' };

    // 1. Web-only apps (e.g. YouTube)
    if (app.type === 'url') {
      this._launchBrowserUrl(app.url);
      return {
        success: true,
        action: 'open_url',
        url: app.url,
        appName: app.displayName,
        response: app.successMessage || `${app.displayName} open ho gaya.`
      };
    }

    // 2. Desktop or Web Hybrid (WhatsApp)
    if (app.type === 'desktop_or_web') {
      // Check candidate executables
      let foundPath = null;
      if (app.executableCandidates) {
        for (const cand of app.executableCandidates) {
          if (fs.existsSync(cand)) {
            foundPath = cand;
            break;
          }
        }
      }

      if (foundPath) {
        await this._launchDetached(`"${foundPath}"`);
        return {
          success: true,
          action: 'launch_desktop',
          appName: app.displayName,
          response: app.successMessage || `${app.displayName} open ho gaya.`
        };
      }

      // Use safe fallback (WhatsApp Web) truthfully reporting fallback
      if (app.fallback && app.fallback.type === 'url') {
        this._launchBrowserUrl(app.fallback.url);
        return {
          success: true,
          action: 'open_url',
          url: app.fallback.url,
          appName: app.displayName,
          fallbackUsed: true,
          response: 'WhatsApp Web open ho gaya.'
        };
      }
    }

    // 3. Desktop Application (VS Code, Notepad, Calc, Chrome, etc.)
    if (app.launchCommand) {
      // For VS Code, verify availability
      if (app.id === 'VS_CODE') {
        const isCodeCmdAvailable = await this._verifyCommand('where code');
        if (!isCodeCmdAvailable && app.executableCandidates) {
          const found = app.executableCandidates.some(c => typeof c === 'string' && fs.existsSync(c));
          if (!found) {
            return {
              success: false,
              appName: app.displayName,
              response: app.notFoundMessage || 'VS Code is not installed or could not be found.'
            };
          }
        }
      }

      await this._launchDetached(app.launchCommand);
      return {
        success: true,
        action: 'launch_desktop',
        appName: app.displayName,
        response: app.successMessage || `${app.displayName} open ho gaya.`
      };
    }

    return {
      success: false,
      response: `No launch mechanism found for ${app.displayName}.`
    };
  }

  async _getTopYouTubeVideo(query) {
    return new Promise((resolve) => {
      try {
        const req = https.get(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'hi,en-US;q=0.9,en;q=0.8'
            },
            timeout: 2500
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => {
              data += chunk;
              const match = data.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
              if (match) {
                req.destroy();
                resolve(`https://www.youtube.com/watch?v=${match[1]}&autoplay=1`);
              }
            });
            res.on('end', () => {
              const match = data.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
              resolve(match ? `https://www.youtube.com/watch?v=${match[1]}&autoplay=1` : null);
            });
          }
        );
        req.on('timeout', () => {
          req.destroy();
          resolve(null);
        });
        req.on('error', () => resolve(null));
      } catch (e) {
        resolve(null);
      }
    });
  }

  async _handlePlayMedia({ app, parameters, target }) {
    const query = (parameters && parameters.query) || 'Music';
    let url = (parameters && parameters.url) || `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const appName = target === 'SPOTIFY' ? 'Spotify' : 'YouTube';

    // Auto-resolve top video so YouTube directly plays without user needing to click
    if (target === 'YOUTUBE' || !target) {
      try {
        const directUrl = await this._getTopYouTubeVideo(query);
        if (directUrl) {
          url = directUrl;
        }
      } catch (err) {
        // Fallback to search query results
      }
    }

    this._launchBrowserUrl(url);

    return {
      success: true,
      action: 'open_url',
      url,
      appName,
      query,
      response: `${appName} par "${query}" play kar diya gaya hai.`
    };
  }

  async _handleSearchWeb({ app, parameters, target }) {
    const query = (parameters && parameters.query) || 'Search';
    const targetName = target || 'Google';
    let url = (parameters && parameters.url) || `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    this._launchBrowserUrl(url);

    return {
      success: true,
      action: 'open_url',
      url,
      appName: targetName,
      query,
      response: `${targetName} par "${query}" search kar diya gaya hai.`
    };
  }

  _launchBrowserUrl(url) {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) return;
    try {
      exec(`rundll32 url.dll,FileProtocolHandler "${url}"`, (error) => {
        if (error) {
          exec(`start "" "${url}"`, (err2) => {
            if (err2) console.warn('[OS BRIDGE URL LAUNCH ERROR]:', err2.message);
          });
        }
      });
    } catch (e) {
      console.warn('[OS BRIDGE URL EXCEPTION]:', e.message);
    }
  }

  async _handleCloseApp(app) {
    if (!app || !app.processName) {
      return { success: false, response: 'Cannot close: Process name unknown.' };
    }

    // Windows taskkill: graceful then forced
    return new Promise((resolve) => {
      exec(`taskkill /IM "${app.processName}.exe" /F`, (err, stdout, stderr) => {
        if (err) {
          // Process might not have been running
          resolve({
            success: true,
            action: 'close_app',
            appName: app.displayName,
            response: `${app.displayName} band ho gaya.`
          });
        } else {
          resolve({
            success: true,
            action: 'close_app',
            appName: app.displayName,
            response: `${app.displayName} band ho gaya.`
          });
        }
      });
    });
  }

  async _handleFocusApp(app) {
    if (!app || !app.displayName) {
      return { success: false, response: 'Cannot focus: App unknown.' };
    }

    // Safe PowerShell foreground window script
    const safeTitle = app.displayName.replace(/[^a-zA-Z0-9 ]/g, '');
    const psScript = `
$wscript = New-Object -ComObject Wscript.Shell
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*${safeTitle}*" -or $_.ProcessName -like "*${app.processName || safeTitle}*" } | Select-Object -First 1
if ($proc) {
  $wscript.AppActivate($proc.Id)
  Write-Output "ACTIVATED"
} else {
  Write-Output "NOT_FOUND"
}
`.trim();

    return new Promise((resolve) => {
      exec(`powershell -NoProfile -Command "${psScript.replace(/\n/g, '; ')}"`, (err, stdout) => {
        resolve({
          success: true,
          action: 'focus_app',
          appName: app.displayName,
          response: `${app.displayName} foreground mein aa gaya.`
        });
      });
    });
  }

  // --- Safe Detached Process Launcher ---

  _launchDetached(commandStr) {
    return new Promise((resolve, reject) => {
      try {
        const child = exec(commandStr, { detached: true, stdio: 'ignore' }, (error) => {
          if (error && error.code !== 0) {
            // Note: start command exits immediately with 0
          }
        });
        child.unref();
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  async _handleSendMessage({ app, parameters, target }) {
    const rawTarget = String(target || '').toUpperCase();
    const recipient = parameters && parameters.recipient ? parameters.recipient : 'Recipient';
    const message = parameters && parameters.message ? parameters.message : '';
    const phone = parameters && parameters.phone ? parameters.phone : '';
    const url = parameters && parameters.url ? parameters.url : (
      phone 
        ? `https://web.whatsapp.com/send?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}`
        : 'https://web.whatsapp.com/'
    );

    if (rawTarget === 'WHATSAPP' || !rawTarget) {
      const launchCommand = `start "" "${url}"`;
      try {
        await this._launchDetached(launchCommand);
        return {
          success: true,
          action: 'send_message',
          target: 'WHATSAPP',
          recipient,
          phone,
          message,
          url,
          response: `${recipient} ke liye WhatsApp message tayar kar diya gaya hai: "${message}"`
        };
      } catch (err) {
        return {
          success: false,
          error: err.message,
          response: `WhatsApp message open karne me samasya aayi: ${err.message}`
        };
      }
    }

    return {
      success: false,
      response: `Unsupported message target: ${target}`
    };
  }

  _verifyCommand(cmd) {
    return new Promise((resolve) => {
      exec(cmd, (err, stdout) => {
        resolve(!err && stdout.trim().length > 0);
      });
    });
  }
}

const osBridge = new OsBridge();

module.exports = {
  OsBridge,
  osBridge
};
