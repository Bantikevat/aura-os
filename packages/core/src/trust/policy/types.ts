/**
 * AURA NIST-Aligned Trust & Approval Policies
 */

export type ActionSensitivity = 'read_only' | 'prepare' | 'mutating' | 'sensitive';

export interface ToolPolicy {
  toolName: string;
  sensitivity: ActionSensitivity;
  requiresExplicitApproval: boolean;
  actionBudgetPerSession: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: 'user' | 'aura_agent' | 'subagent';
  action: string;
  purpose: string;
  scope: string;
  inputPayload: Record<string, any>;
  resultStatus: 'success' | 'failed' | 'rejected';
  verificationEvidence?: string;
}
