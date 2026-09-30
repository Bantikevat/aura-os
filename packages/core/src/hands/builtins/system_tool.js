const os = require('os');

const systemInspectorTool = {
  name: 'system_inspector',
  description: 'Inspects host environment state, local time, memory, and OS architecture (Read-Only).',
  sensitivity: 'read_only', // 'read_only' | 'prepare' | 'mutating' | 'sensitive'
  requiresApproval: false,
  
  async execute(params = {}) {
    const uptimeHours = (os.uptime() / 3600).toFixed(2);
    const freeMemoryMB = (os.freemem() / 1024 / 1024).toFixed(0);
    const totalMemoryMB = (os.totalmem() / 1024 / 1024).toFixed(0);

    return {
      status: 'success',
      timestamp: new Date().toISOString(),
      localTime: new Date().toLocaleString(),
      os: {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        uptimeHours: uptimeHours + ' hours'
      },
      memory: {
        freeMB: freeMemoryMB,
        totalMB: totalMemoryMB,
        usagePercent: ((1 - (os.freemem() / os.totalmem())) * 100).toFixed(1) + '%'
      },
      evidence: `System inspected at ${new Date().toISOString()} on platform ${os.platform()}-${os.arch()}`
    };
  }
};

module.exports = { systemInspectorTool };
