const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class TrustPolicyEnforcer {
  constructor(auditPath) {
    this.auditPath = auditPath || path.join(__dirname, '../../../../data/audit_log.json');
    const dir = path.dirname(this.auditPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.auditPath)) {
      fs.writeFileSync(this.auditPath, JSON.stringify([], null, 2), 'utf8');
    }
  }

  _appendAudit(event) {
    try {
      const logs = JSON.parse(fs.readFileSync(this.auditPath, 'utf8'));
      logs.push(event);
      fs.writeFileSync(this.auditPath, JSON.stringify(logs, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write audit log:', e.message);
    }
  }

  evaluateToolAccess(tool, userApproved = false) {
    // NIST Trust rule:
    // Read-only tools can proceed autonomously within budget.
    // Mutating or Sensitive tools strictly require explicit user approval.
    if (tool.sensitivity === 'read_only') {
      return { allowed: true, reason: 'Safe read-only operation authorized' };
    }

    if (tool.sensitivity === 'mutating' || tool.sensitivity === 'sensitive') {
      if (!userApproved) {
        return { 
          allowed: false, 
          requiresApproval: true, 
          reason: `Action '${tool.name}' is ${tool.sensitivity}. Explicit user approval is required.`
        };
      }
      return { allowed: true, reason: 'Explicit user authorization confirmed.' };
    }

    return { allowed: true, reason: 'Standard operation' };
  }

  logExecution({ toolName, sensitivity, status, evidence, durationMs }) {
    const event = {
      id: 'audit_' + crypto.randomBytes(6).toString('hex'),
      timestamp: new Date().toISOString(),
      actor: 'aura_core_agent',
      toolName,
      sensitivity,
      status,
      evidence,
      durationMs
    };
    this._appendAudit(event);
    return event;
  }
}

module.exports = { TrustPolicyEnforcer };
