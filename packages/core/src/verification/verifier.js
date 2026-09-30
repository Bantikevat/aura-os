class VerificationEngine {
  /**
   * Validates that the executed tool produced genuine verifiable evidence
   * before AURA claims the task is 'DONE'.
   */
  static verifyResult(tool, result) {
    if (!result) {
      return { verified: false, reason: 'Tool returned null or empty output' };
    }

    if (result.status !== 'success') {
      return { verified: false, reason: `Execution failed with status: ${result.status}` };
    }

    if (!result.evidence) {
      return { verified: false, reason: 'Tool did not provide audit evidence proof' };
    }

    return {
      verified: true,
      timestamp: new Date().toISOString(),
      proof: result.evidence,
      verifiedBy: 'AURA_Deterministic_Verification_Engine_v1.0'
    };
  }
}

module.exports = { VerificationEngine };
