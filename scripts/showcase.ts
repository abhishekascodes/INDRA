import { getDb, schema, seedDatabase, resetDatabase, PRIYA_SHARMA_ID } from '@indra/database';
import { CapabilityRegistry, registerDefaultCapabilities } from '@indra/capability-engine';
import { WorkflowRegistry, WorkflowRunner, registerDefaultWorkflows } from '@indra/workflow-engine';
import { IntentEngine } from '@indra/intent-engine';

async function runShowcase() {
  console.log('============================================================');
  console.log('              PROJECT INDRA — SYSTEM DEMO                   ');
  console.log('============================================================\n');

  // 1. Initialize Engine & Registries
  registerDefaultCapabilities();
  registerDefaultWorkflows();
  await resetDatabase();

  const intentEngine = new IntentEngine();
  const workflowRunner = new WorkflowRunner();

  // 2. Health & Catalog
  const capabilities = CapabilityRegistry.getInstance().list();
  const workflows = WorkflowRegistry.getInstance().list();
  console.log(`[1] SYSTEM HEALTH`);
  console.log(`    Capabilities Registered: ${capabilities.length}`);
  console.log(`    Workflows Registered:    ${workflows.length}`);
  console.log(`    Database Engine:         PostgreSQL-compatible PGlite (Embedded)`);
  console.log(`    Status:                  OPERATIONAL & READY\n`);

  // 3. Citizen Profile
  const db = await getDb();
  const [citizen] = await db.select().from(schema.citizens).limit(1);
  const creds = await db.select().from(schema.citizenCredentials);
  const epfo = await db.select().from(schema.spiEpfoAccounts);
  const inbox = await db.select().from(schema.governmentInbox);

  console.log(`[2] AUTHENTICATED CITIZEN`);
  console.log(`    Name:       ${citizen.primaryName}`);
  console.log(`    DOB/Gender: ${citizen.dateOfBirth} (${citizen.gender})`);
  console.log(`    Location:   ${citizen.currentCity}, ${citizen.currentState}`);
  console.log(`    Mobile:     ${citizen.primaryMobile}`);
  console.log(`    Credentials:`);
  for (const c of creds) {
    const meta = (c.metadata as any) || {};
    console.log(`      • ${c.type.padEnd(16)}: ${c.identifierMasked.padEnd(18)} [${c.status}] (Holder: ${meta.holderName || 'Verified'})`);
  }
  console.log(`\n    Provident Fund Ledgers:`);
  for (const e of epfo) {
    console.log(`      • Member: ${e.memberId} | Est: ${e.establishmentName.slice(0, 24)}... | Status: ${e.status} | Balance: ₹${e.pfBalance.toLocaleString('en-IN')}`);
  }
  console.log(`\n    Government Action Inbox:`);
  for (const i of inbox) {
    console.log(`      • [${i.category}] ${i.title}`);
    console.log(`        Action Needed: ${i.whatToDo} (By: ${i.byWhen})`);
  }
  console.log('\n------------------------------------------------------------');

  // 4. Intent Understanding
  console.log(`[3] UNIVERSAL INTENT RESOLUTION`);
  const queries = [
    'I want to start a company',
    'My PF transfer is stuck',
    'My phone was stolen in the metro',
    'Fix name mismatch between PAN and Aadhaar',
    'What benefits am I eligible for?',
  ];

  for (const q of queries) {
    const res = intentEngine.resolve(q);
    console.log(`    Query:   "${q}"`);
    console.log(`    Intent:  ${res.intentId} (${(res.confidence * 100).toFixed(0)}% confidence)`);
    console.log(`    Target:  ${res.matchedWorkflowCode ? `Workflow: ${res.matchedWorkflowCode}` : 'Direct Capability'}`);
    console.log(`    Summary: ${res.suggestedActionTitle} — ${res.suggestedActionDescription}\n`);
  }
  console.log('------------------------------------------------------------');

  // 5. Flagship Journey: Recover Dormant PF
  console.log(`[4] WORKFLOW EXECUTION: RECOVER DORMANT PROVIDENT FUND`);
  console.log(`    Step 1: Starting workflow...`);
  const pfRun1 = await workflowRunner.startWorkflow({
    workflowCode: 'RECOVER_DORMANT_PF',
    citizenId: PRIYA_SHARMA_ID,
  });
  console.log(`    State:       ${pfRun1.state}`);
  console.log(`    Step:        ${pfRun1.currentStepId} (Transfers ₹1,42,500 from Apex Systems to InnoTech)`);
  console.log(`    Safety Gate: Paused for explicit citizen authorization.`);

  console.log(`    Step 2: Citizen reviews and authorizes transfer...`);
  const pfRun2 = await workflowRunner.resumeWorkflow({
    workflowRunId: pfRun1.id,
    authorize: true,
  });
  console.log(`    State:       ${pfRun2.state}`);
  const pfOutput = pfRun2.contextData.step_transfer_output as any;
  console.log(`    Outcome:     Claim Tracking ID: ${pfOutput.claimTrackingId}`);
  console.log(`                 Transferred Amount: ₹${pfOutput.transferredAmountInr.toLocaleString('en-IN')}`);
  console.log(`                 Status: ${pfOutput.status}\n`);

  // Verify Database State Change
  const epfoAfter = await db.select().from(schema.spiEpfoAccounts);
  console.log(`    Verified Database Ledger After Transfer:`);
  for (const e of epfoAfter) {
    console.log(`      • ${e.establishmentName.slice(0, 24)}: Status=${e.status}, Balance=₹${e.pfBalance.toLocaleString('en-IN')}`);
  }
  console.log('\n============================================================');
  console.log('                    DEMO RUN COMPLETED                      ');
  console.log('============================================================');
}

runShowcase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
