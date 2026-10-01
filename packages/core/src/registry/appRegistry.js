const path = require('path');
const fs = require('fs');

const localAppData = process.env.LOCALAPPDATA || 'C:\\Users\\hp\\AppData\\Local';
const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';

const APP_REGISTRY = {
  WHATSAPP: {
    id: 'WHATSAPP',
    displayName: 'WhatsApp',
    aliases: [
      'whatsapp', 'whats app', '\u0935\u094d\u0939\u093e\u091f\u094d\u0938\u090f\u092a', '\u0935\u093e\u091f\u0938\u0905\u092a', '\u0935\u094d\u0939\u093e\u091f\u094d\u0938\u0905\u092a', '\u0935\u094d\u0939\u093e\u091f\u094d\u0938\u0910\u092a', 'whatsap'
    ],
    type: 'desktop_or_web',
    executableCandidates: [
      path.join(localAppData, 'WhatsApp', 'WhatsApp.exe'),
      path.join(programFiles, 'WhatsApp', 'WhatsApp.exe')
    ],
    protocol: 'whatsapp://',
    fallback: {
      type: 'url',
      url: 'https://web.whatsapp.com/',
      response: 'WhatsApp Web open ho gaya.'
    },
    successMessage: 'WhatsApp Desktop open ho gaya.',
    processName: 'WhatsApp'
  },

  YOUTUBE: {
    id: 'YOUTUBE',
    displayName: 'YouTube',
    aliases: [
      'youtube', 'you tube', '\u092f\u0942\u091f\u094d\u092f\u0942\u092c', '\u092f\u0941\u091f\u0941\u092c', '\u092f\u0942 \u091f\u094d\u092f\u0942\u092c', '\u092f\u0942\u091f\u0941\u092c'
    ],
    type: 'url',
    url: 'https://www.youtube.com/',
    successMessage: 'YouTube open ho gaya.',
    processName: null
  },

  VS_CODE: {
    id: 'VS_CODE',
    displayName: 'VS Code',
    aliases: [
      'vs code', 'vscode', 'v s code', '\u0935\u0940\u090f\u0938 \u0915\u094b\u0921', '\u0935\u0940 \u090f\u0938 \u0915\u094b\u0921', '\u0935\u093f\u091c\u0941\u0905\u0932 \u0938\u094d\u091f\u0942\u0921\u093f\u092f\u094b \u0915\u094b\u0921', '\u0915\u094b\u0921 \u090f\u0921\u093f\u091f\u0930', 'visual studio code', 'code'
    ],
    type: 'desktop_app',
    executableCandidates: [
      path.join(localAppData, 'Programs', 'Microsoft VS Code', 'bin', 'code.cmd'),
      path.join(localAppData, 'Programs', 'Microsoft VS Code', 'Code.exe'),
      'code'
    ],
    launchCommand: `code "C:\\Users\\hp\\Desktop\\prsnal\\aura-os"`,
    fallback: null,
    successMessage: 'VS Code open ho gaya.',
    notFoundMessage: 'VS Code is not installed or could not be found.',
    processName: 'Code'
  },

  ANTIGRAVITY: {
    id: 'ANTIGRAVITY',
    displayName: 'Antigravity IDE',
    aliases: [
      'antigravity', 'anti gravity', '\u090f\u0902\u091f\u0940\u0917\u094d\u0930\u0947\u0935\u093f\u091f\u0940', '\u090f\u0902\u091f\u0940 \u0917\u094d\u0930\u0947\u0935\u093f\u091f\u0940'
    ],
    type: 'desktop_app',
    executableCandidates: [
      path.join(localAppData, 'Programs', 'Antigravity IDE', 'Antigravity IDE.exe')
    ],
    launchCommand: `start "" "${path.join(localAppData, 'Programs', 'Antigravity IDE', 'Antigravity IDE.exe')}"`,
    fallback: null,
    successMessage: 'Antigravity IDE open ho gaya.',
    notFoundMessage: 'Antigravity IDE is not installed or could not be found.',
    processName: 'Antigravity IDE'
  },

  CHROME: {
    id: 'CHROME',
    displayName: 'Google Chrome',
    aliases: [
      'chrome', 'google chrome', '\u0917\u0942\u0917\u0932 \u0915\u094d\u0930\u094b\u092e', '\u0915\u094d\u0930\u094b\u092e'
    ],
    type: 'desktop_app',
    executableCandidates: [
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      'start chrome'
    ],
    launchCommand: 'start chrome',
    fallback: null,
    successMessage: 'Chrome open ho gaya.',
    notFoundMessage: 'Google Chrome is not installed or could not be found.',
    processName: 'chrome'
  },

  NOTEPAD: {
    id: 'NOTEPAD',
    displayName: 'Notepad',
    aliases: [
      'notepad', '\u0928\u094b\u091f\u092a\u0948\u0921', '\u0928\u094b\u091f \u092a\u0948\u0921'
    ],
    type: 'desktop_app',
    executableCandidates: [
      'C:\\WINDOWS\\system32\\notepad.exe',
      'notepad.exe'
    ],
    launchCommand: 'start notepad.exe',
    fallback: null,
    successMessage: 'Notepad open ho gaya.',
    processName: 'notepad'
  },

  CALCULATOR: {
    id: 'CALCULATOR',
    displayName: 'Calculator',
    aliases: [
      'calculator', 'calc', '\u0915\u0948\u0932\u0915\u0941\u0932\u0947\u091f\u0930', '\u0915\u0948\u0932\u0915'
    ],
    type: 'desktop_app',
    executableCandidates: [
      'C:\\WINDOWS\\system32\\calc.exe',
      'calc.exe'
    ],
    launchCommand: 'start calc.exe',
    fallback: null,
    successMessage: 'Calculator open ho gaya.',
    processName: 'CalculatorApp'
  },

  PAINT: {
    id: 'PAINT',
    displayName: 'Paint',
    aliases: [
      'paint', 'mspaint', '\u092a\u0947\u0902\u091f', '\u0921\u094d\u0930\u093e\u0907\u0902\u0917'
    ],
    type: 'desktop_app',
    executableCandidates: [
      path.join(localAppData, 'Microsoft', 'WindowsApps', 'mspaint.exe'),
      'mspaint.exe'
    ],
    launchCommand: 'start mspaint',
    fallback: null,
    successMessage: 'Paint open ho gaya.',
    processName: 'mspaint'
  },

  FILE_EXPLORER: {
    id: 'FILE_EXPLORER',
    displayName: 'File Explorer',
    aliases: [
      'file explorer', 'explorer', 'my computer', '\u092b\u093e\u0907\u0932 \u090f\u0915\u094d\u0938\u092a\u094d\u0932\u094b\u0930\u0930', '\u092e\u093e\u092f \u0915\u0902\u092a\u094d\u092f\u0942\u091f\u0930', '\u092b\u093e\u0907\u0932 \u092e\u0948\u0928\u0947\u091c\u0930'
    ],
    type: 'desktop_app',
    executableCandidates: [
      'explorer.exe'
    ],
    launchCommand: 'explorer.exe "C:\\Users\\hp\\Desktop\\prsnal"',
    fallback: null,
    successMessage: 'File Explorer open ho gaya.',
    processName: 'explorer'
  },

  TERMINAL: {
    id: 'TERMINAL',
    displayName: 'Command Prompt',
    aliases: [
      'terminal', 'cmd', 'command prompt', 'powershell', '\u091f\u0930\u094d\u092e\u093f\u0928\u0932', '\u0915\u092e\u093e\u0902\u0921 \u092a\u094d\u0930\u0949\u092e\u094d\u092a\u094d\u091f'
    ],
    type: 'desktop_app',
    executableCandidates: ['cmd.exe'],
    launchCommand: 'start cmd.exe',
    fallback: null,
    successMessage: 'Terminal open ho gaya.',
    processName: 'cmd'
  },

  TASK_MANAGER: {
    id: 'TASK_MANAGER',
    displayName: 'Task Manager',
    aliases: [
      'task manager', 'taskmgr', '\u091f\u093e\u0938\u094d\u0915 \u092e\u0948\u0928\u0947\u091c\u0930'
    ],
    type: 'desktop_app',
    executableCandidates: ['taskmgr.exe'],
    launchCommand: 'start taskmgr.exe',
    fallback: null,
    successMessage: 'Task Manager open ho gaya.',
    processName: 'Taskmgr'
  },

  SETTINGS: {
    id: 'SETTINGS',
    displayName: 'Windows Settings',
    aliases: [
      'settings', '\u0938\u0947\u091f\u093f\u0902\u0917\u094d\u0938', '\u0938\u0947\u091f\u093f\u0902\u0917'
    ],
    type: 'desktop_app',
    executableCandidates: ['start ms-settings:'],
    launchCommand: 'start ms-settings:',
    fallback: null,
    successMessage: 'Settings open ho gaya.',
    processName: 'SystemSettings'
  }
};

function findAppByAlias(query) {
  if (!query || typeof query !== 'string') return null;
  const clean = query.toLowerCase().trim();

  // 1. Exact alias match
  for (const key in APP_REGISTRY) {
    const app = APP_REGISTRY[key];
    for (const alias of app.aliases) {
      if (clean === alias.toLowerCase()) {
        return app;
      }
    }
  }

  // 2. Substring match (e.g. "open notepad now" contains "notepad")
  for (const key in APP_REGISTRY) {
    const app = APP_REGISTRY[key];
    for (const alias of app.aliases) {
      const regex = new RegExp(`\\b${alias.toLowerCase()}\\b`, 'i');
      if (regex.test(clean) || clean.includes(alias.toLowerCase())) {
        return app;
      }
    }
  }

  return null;
}

module.exports = {
  APP_REGISTRY,
  findAppByAlias
};
