const path = require('path');
const fs = require('fs');

const localAppData = process.env.LOCALAPPDATA || 'C:\\Users\\hp\\AppData\\Local';
const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';

const APP_REGISTRY = {
  WHATSAPP: {
    id: 'WHATSAPP',
    displayName: 'WhatsApp',
    aliases: [
      'whatsapp', 'whats app', 'व्हाट्सएप', 'व्हाट्सअप', 'व्हाट्सऐप', 'वाटसप', 'whatsap'
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
      'youtube', 'you tube', 'यूट्यूब', 'युटुब', 'यू ट्यूब', 'यूटुब'
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
      'vs code', 'vscode', 'v s code', 'वीएस कोड', 'वी एस कोड', 'विजुअल स्टूडियो कोड', 'कोड एडिटर', 'visual studio code', 'code'
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
      'antigravity', 'anti gravity', 'एंटीग्रैविटी', 'एंटी ग्रैविटी', 'एंटी ग्रेविटी', 'एंटीग्रेविटी'
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
      'chrome', 'google chrome', 'गूगल क्रोम', 'क्रोम'
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
      'notepad', 'नोटपैड'
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
      'calculator', 'calc', 'कैलकुलेटर', 'हिसाब'
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
      'paint', 'mspaint', 'पेंट'
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
      'file explorer', 'explorer', 'my computer', 'फ़ाइल एक्सप्लोरर', 'फाइल एक्सप्लोरर', 'फाइल', 'फ़ाइल', 'दस्तावेज़'
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
      'terminal', 'cmd', 'command prompt', 'powershell', 'टर्मिनल', 'कमांड'
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
      'task manager', 'taskmgr', 'टास्क मैनेजर'
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
      'settings', 'सेटिंग्स', 'सेटिंग'
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
  if (!query) return null;
  const q = query.toLowerCase().trim();
  
  for (const key of Object.keys(APP_REGISTRY)) {
    const app = APP_REGISTRY[key];
    for (const alias of app.aliases) {
      if (q.includes(alias.toLowerCase())) {
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
