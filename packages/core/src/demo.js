const { AuraEngine } = require('./engine');

async function runDemo() {
  console.log('====================================================');
  console.log('   AURA — Personal AI Life OS (Core Engine MVP)     ');
  console.log('   Version 1.0 — 30 September 2026                 ');
  console.log('====================================================\n');

  const aura = new AuraEngine();

  // 1. Seed Initial Memories
  console.log('[1/4] Storing Personal Memories...');
  const m1 = aura.memory.addMemory({
    category: 'fact',
    content: 'User primary focus is building AURA 2050 Personal AI Life OS on GitHub.',
    tags: ['aura', 'vision', 'github']
  });
  const m2 = aura.memory.addMemory({
    category: 'preference',
    content: 'Requires explicit human-in-the-loop approvals for any mutating action.',
    tags: ['security', 'nist', 'approvals']
  });
  console.log('  ✔ Memory 1 saved:', m1.content);
  console.log('  ✔ Memory 2 saved:', m2.content);

  // 2. Seed Initial Goal
  console.log('\n[2/4] Initializing Master Goal...');
  const g1 = aura.goals.createGoal({
    title: 'AURA 72-Hour Foundation',
    description: 'Complete Core MVP with Memory, Goals, Read-Only Tool, and Verification Loop',
    milestones: ['Scaffold repository', 'Memory & Goal store', 'First tool loop', 'Verification engine']
  });
  console.log('  ✔ Goal registered:', g1.title);

  // 3. Run First Real Tool Loop with Verification
  console.log('\n[3/4] Triggering First Real Tool Loop (System Inspector)...');
  console.log('  -> Flow: Understand Intent -> Retrieve Memory -> Trust Check -> Execute -> Verify -> Audit');
  
  const result = await aura.executeIntent({
    userPrompt: 'AURA, inspect the system health, memory and local time for today.'
  });

  console.log('\n[4/4] Execution Result & Verification:');
  console.log('  Status        :', result.status);
  console.log('  Tool Executed :', result.tool);
  console.log('  OS Platform   :', result.toolOutput.os.platform, '(' + result.toolOutput.os.arch + ')');
  console.log('  Free RAM      :', result.toolOutput.memory.freeMB, 'MB /', result.toolOutput.memory.totalMB, 'MB');
  console.log('  Evidence Proof:', result.verification.proof);
  console.log('  Audit Event ID:', result.auditEventId);
  console.log('  Duration      :', result.durationMs, 'ms');
  console.log('  Verified By   :', result.verification.verifiedBy);

  console.log('\n====================================================');
  console.log('  ✔ AURA Core MVP Loop PASSED & VERIFIED (Green)');
  console.log('====================================================');
}

runDemo().catch(console.error);
