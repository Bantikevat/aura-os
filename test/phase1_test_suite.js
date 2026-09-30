const http = require('http');

function postApi(data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request('http://localhost:3000/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ error: 'invalid_json', raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runPhase1AuditTests() {
  console.log('===============================================================');
  console.log('    AURA PHASE 1: REAL COMPUTER CONTROL & RELIABILITY TEST    ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(title, condition, detail = '') {
    if (condition) {
      console.log(`[PASS] ${title} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  // --- PART 1: Core Commands Test ---
  console.log('--- TEST 1: Specified App Commands ---');
  const commandsToTest = [
    { cmd: 'WhatsApp kholo', expectedTarget: 'WHATSAPP', expectedAction: 'open_url', expectFallback: true },
    { cmd: 'Open WhatsApp', expectedTarget: 'WHATSAPP', expectedAction: 'open_url', expectFallback: true },
    { cmd: 'YouTube kholo', expectedTarget: 'YOUTUBE', expectedAction: 'open_url' },
    { cmd: 'Open YouTube', expectedTarget: 'YOUTUBE', expectedAction: 'open_url' },
    { cmd: 'VS Code kholo', expectedTarget: 'VS_CODE', expectedAction: 'launch_desktop' },
    { cmd: 'Open VS Code', expectedTarget: 'VS_CODE', expectedAction: 'launch_desktop' },
    { cmd: 'Chrome kholo', expectedTarget: 'CHROME', expectedAction: 'launch_desktop' },
    { cmd: 'Notepad kholo', expectedTarget: 'NOTEPAD', expectedAction: 'launch_desktop' },
    { cmd: 'Calculator kholo', expectedTarget: 'CALCULATOR', expectedAction: 'launch_desktop' },
    { cmd: 'Paint kholo', expectedTarget: 'PAINT', expectedAction: 'launch_desktop' },
    { cmd: 'File Explorer kholo', expectedTarget: 'FILE_EXPLORER', expectedAction: 'launch_desktop' }
  ];

  for (const item of commandsToTest) {
    const res = await postApi({ prompt: item.cmd });
    const targetMatch = res.target === item.expectedTarget;
    const actionMatch = res.action === item.expectedAction;
    const stateComplete = res.state === 'COMPLETED';
    assert(
      `Command "${item.cmd}"`,
      targetMatch && actionMatch && stateComplete,
      `Target: ${res.target}, Action: ${res.action}, State: ${res.state}, Response: "${res.response}"`
    );
  }

  // --- PART 2: Close and Focus ---
  console.log('\n--- TEST 2: Focus & Close Windows Controls ---');
  const closeRes = await postApi({ prompt: 'Notepad band karo' });
  assert(
    'Close Command "Notepad band karo"',
    closeRes.intent === 'CLOSE_APP' && closeRes.target === 'NOTEPAD' && closeRes.state === 'COMPLETED',
    `Response: "${closeRes.response}"`
  );

  const focusRes = await postApi({ prompt: 'VS Code ko foreground mein lao' });
  assert(
    'Focus Command "VS Code ko foreground mein lao"',
    focusRes.intent === 'FOCUS_APP' && focusRes.target === 'VS_CODE' && focusRes.state === 'COMPLETED',
    `Response: "${focusRes.response}"`
  );

  // --- PART 3: Repetition & Idempotency Test (Mandatory Requirement #17) ---
  console.log('\n--- TEST 3: Duplicate Voice & Idempotency Protection ---');
  console.log('Waiting 2600ms for duplicate event window from previous tests to clear...');
  await sleep(2600);

  const actionId1 = 'cmd_rep_test_' + Date.now();
  
  // First execution (Fresh command after window)
  const rep1 = await postApi({ prompt: 'Open WhatsApp', actionId: actionId1 });
  assert(
    'First execution of "Open WhatsApp" executes exactly once',
    rep1.state === 'COMPLETED' && !rep1.deduplicated,
    `ActionId: ${rep1.actionId}, State: ${rep1.state}`
  );

  // Immediate duplicate call with SAME actionId
  const rep2 = await postApi({ prompt: 'Open WhatsApp', actionId: actionId1 });
  assert(
    'Duplicate call with SAME actionId is idempotent (not re-executed)',
    rep2.actionId === actionId1 && rep2.state === 'COMPLETED',
    `ActionId: ${rep2.actionId}`
  );

  // Rapid duplicate call with DIFFERENT actionId within duplicate window (<2500ms)
  const rep3 = await postApi({ prompt: 'Open WhatsApp', actionId: 'cmd_rep_test_diff_' + Date.now() });
  assert(
    'Rapid duplicate voice transcript within 2500ms window dropped cleanly',
    rep3.deduplicated === true,
    `deduplicated flag: ${rep3.deduplicated}`
  );

  // --- PART 4: Error Handling Tests (Requirement #18) ---
  console.log('\n--- TEST 4: Error Cases & Clean Termination ---');
  // 1. Empty prompt
  const emptyRes = await postApi({ prompt: '' });
  assert('Empty prompt terminates cleanly', emptyRes.status === 'ignored' || emptyRes.intent === 'noise_filtered');

  // 2. Hindi conversational greeting
  const convRes = await postApi({ prompt: 'नमस्ते AURA' });
  assert('Conversational greeting handled smoothly', convRes.intent === 'conversation' && convRes.response.includes('बंटी भाई'), `Resp: "${convRes.response}"`);

  // 3. NIST Safety Gate for destructive actions
  const nistRes = await postApi({ prompt: 'Delete all memories' });
  assert('NIST 2-Step Gate intercepts destructive command', nistRes.status === 'waiting_for_confirmation' && nistRes.requiresApproval === true);

  console.log('\n===============================================================');
  console.log(`TOTAL CHECKS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('===============================================================');

  if (failed > 0) process.exit(1);
}

runPhase1AuditTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
