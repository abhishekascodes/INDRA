import { getDb } from './client.js';
import * as schema from './schema.js';
import { eq } from 'drizzle-orm';
import { PRIYA_SHARMA_ID } from './seed.js';

async function verifySeed() {
  const db = await getDb();

  const citizen = await db
    .select()
    .from(schema.citizens)
    .where(eq(schema.citizens.id, PRIYA_SHARMA_ID));

  const credentials = await db
    .select()
    .from(schema.citizenCredentials)
    .where(eq(schema.citizenCredentials.citizenId, PRIYA_SHARMA_ID));

  const epfoAccounts = await db
    .select()
    .from(schema.spiEpfoAccounts)
    .where(eq(schema.spiEpfoAccounts.citizenId, PRIYA_SHARMA_ID));

  const inbox = await db
    .select()
    .from(schema.governmentInbox)
    .where(eq(schema.governmentInbox.citizenId, PRIYA_SHARMA_ID));

  console.log('--- DATABASE VERIFICATION RESULTS ---');
  console.log('Citizen found:', citizen[0]?.primaryName, citizen[0]?.primaryMobile);
  console.log('Credentials count:', credentials.length, credentials.map((c) => c.type));
  console.log('EPFO accounts count:', epfoAccounts.length, epfoAccounts.map((e) => ({
    memberId: e.memberId,
    establishment: e.establishmentName,
    status: e.status,
    balance: e.pfBalance,
  })));
  console.log('Government inbox items:', inbox.length, inbox.map((i) => i.title));

  if (
    citizen.length > 0 &&
    credentials.length >= 5 &&
    epfoAccounts.length >= 2 &&
    inbox.length >= 2
  ) {
    console.log('>>> VERIFICATION PASSED: Synthetic citizen graph is fully intact!');
    process.exit(0);
  } else {
    console.error('>>> VERIFICATION FAILED: Missing records.');
    process.exit(1);
  }
}

verifySeed().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
