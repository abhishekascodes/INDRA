import { getDb } from './client.js';
import * as schema from './schema.js';
import { eq } from 'drizzle-orm';

export const PRIYA_SHARMA_ID = 'e8b0a1b2-c3d4-4e5f-a6b7-c8d9e0f1a2b3';
export const AARAV_PATEL_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
export const DORMANT_EPFO_ID = 'f1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
export const ACTIVE_EPFO_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

export async function resetDatabase(db: any = null) {
  const database = db || (await getDb());
  await database.delete(schema.citizens).where(eq(schema.citizens.id, PRIYA_SHARMA_ID));
  await database.delete(schema.citizens).where(eq(schema.citizens.id, AARAV_PATEL_ID));
  return seedDatabase(database);
}

export async function seedDatabase(db: any = null) {
  const database = db || (await getDb());

  // Check if both Priya Sharma and Aarav Patel exist
  const existingPriya = await database
    .select()
    .from(schema.citizens)
    .where(eq(schema.citizens.id, PRIYA_SHARMA_ID));

  const existingAarav = await database
    .select()
    .from(schema.citizens)
    .where(eq(schema.citizens.id, AARAV_PATEL_ID));

  if (existingPriya.length > 0 && existingAarav.length > 0) {
    console.log('[Seed] Database already fully seeded with synthetic citizens.');
    return { citizenId: PRIYA_SHARMA_ID, secondaryCitizenId: AARAV_PATEL_ID };
  }

  if (existingPriya.length === 0) {
    console.log('[Seed] Seeding synthetic citizen graph: Priya Sharma...');

    // 1. Citizen Profile
    await database.insert(schema.citizens).values({
    id: PRIYA_SHARMA_ID,
    primaryName: 'Priya Sharma',
    dateOfBirth: '1994-08-15',
    gender: 'Female',
    primaryMobile: '+91 98765 43210',
    primaryEmail: 'priya.sharma@example.in',
    currentCity: 'Bengaluru',
    currentState: 'Karnataka',
  });

  // 2. Credentials (with intentional PAN name variation: "Priya S.")
  await database.insert(schema.citizenCredentials).values([
    {
      citizenId: PRIYA_SHARMA_ID,
      type: 'AADHAAR',
      identifierMasked: 'XXXX-XXXX-9012',
      identifierHash: 'hash_aadhaar_priya_9012',
      issuedDate: '2012-05-10',
      status: 'ACTIVE',
      metadata: { holderName: 'Priya Sharma', gender: 'Female', yob: '1994' },
    },
    {
      citizenId: PRIYA_SHARMA_ID,
      type: 'PAN',
      identifierMasked: 'ABCPS****F',
      identifierHash: 'hash_pan_priya_1234f',
      issuedDate: '2014-02-18',
      status: 'ACTIVE',
      // Intentional inconsistency: "Priya S." on PAN vs "Priya Sharma" on Aadhaar/DL
      metadata: { holderName: 'Priya S.', fathersName: 'Ramesh Sharma' },
    },
    {
      citizenId: PRIYA_SHARMA_ID,
      type: 'DRIVING_LICENCE',
      identifierMasked: 'KA-01-2018-******',
      identifierHash: 'hash_dl_priya_009124',
      issuedDate: '2018-04-12',
      expiryDate: '2038-04-11',
      status: 'ACTIVE',
      metadata: { holderName: 'Priya Sharma', class: 'LMV_MCWG', rto: 'KA-01 Koramangala' },
    },
    {
      citizenId: PRIYA_SHARMA_ID,
      type: 'PASSPORT',
      identifierMasked: 'Z198****',
      identifierHash: 'hash_passport_priya_z198',
      issuedDate: '2016-09-15',
      expiryDate: '2026-09-14', // Expiring soon in 2026!
      status: 'ACTIVE',
      metadata: { holderName: 'Priya Sharma', placeOfIssue: 'Bengaluru' },
    },
    {
      citizenId: PRIYA_SHARMA_ID,
      type: 'UAN',
      identifierMasked: '1014****1844',
      identifierHash: 'hash_uan_priya_1844',
      issuedDate: '2017-07-01',
      status: 'ACTIVE',
      metadata: { uanNumber: '101452901844' },
    },
  ]);

  // 3. Address
  await database.insert(schema.citizenAddresses).values([
    {
      citizenId: PRIYA_SHARMA_ID,
      type: 'CURRENT',
      line1: 'Flat 402, Shanti Heights, 12th Main',
      line2: 'HAL 2nd Stage, Indiranagar',
      city: 'Bengaluru',
      district: 'Bengaluru Urban',
      state: 'Karnataka',
      pincode: '560038',
      isVerified: true,
      validSince: '2021-06-01',
    },
  ]);

  // 4. Verifiable Documents
  await database.insert(schema.citizenDocuments).values([
    {
      citizenId: PRIYA_SHARMA_ID,
      documentType: 'AADHAAR_CARD',
      title: 'Aadhaar Identity Document',
      issuer: 'Unique Identification Authority of India',
      documentNumber: 'XXXX-XXXX-9012',
      issueDate: '2012-05-10',
      verificationStatus: 'VERIFIED',
      provenanceId: 'prov_uidai_9012',
    },
    {
      citizenId: PRIYA_SHARMA_ID,
      documentType: 'PAN_CARD',
      title: 'Permanent Account Number Card',
      issuer: 'Income Tax Department',
      documentNumber: 'ABCPS1234F',
      issueDate: '2014-02-18',
      verificationStatus: 'VERIFIED',
      provenanceId: 'prov_nsdl_1234f',
    },
    {
      citizenId: PRIYA_SHARMA_ID,
      documentType: 'DRIVING_LICENCE',
      title: 'Motor Vehicle Driving Licence',
      issuer: 'Karnataka Transport Department',
      documentNumber: 'KA-01-2018-009124',
      issueDate: '2018-04-12',
      expiryDate: '2038-04-11',
      verificationStatus: 'VERIFIED',
      provenanceId: 'prov_parivahan_009124',
    },
    {
      citizenId: PRIYA_SHARMA_ID,
      documentType: 'DEGREE_CERTIFICATE',
      title: 'Bachelor of Engineering (Computer Science)',
      issuer: 'Visvesvaraya Technological University',
      documentNumber: 'VTU-2016-CS-88192',
      issueDate: '2016-07-20',
      verificationStatus: 'VERIFIED',
      provenanceId: 'prov_nad_vtu_88192',
    },
  ]);

  // 5. SPI EPFO Ledgers (Active current employment + Dormant previous unlinked PF)
  await database.insert(schema.spiEpfoAccounts).values([
    {
      id: ACTIVE_EPFO_ID,
      uan: '101452901844',
      citizenId: PRIYA_SHARMA_ID,
      memberId: 'KNBLR0049281000010928',
      establishmentName: 'InnoTech Solutions India Pvt Ltd',
      establishmentId: 'KNBLR0049281000',
      joiningDate: '2021-05-01',
      exitDate: null,
      pfBalance: 384000,
      pensionBalance: 72000,
      status: 'ACTIVE',
    },
    {
      id: DORMANT_EPFO_ID,
      uan: '101452901844',
      citizenId: PRIYA_SHARMA_ID,
      memberId: 'MHBAN0018274000004928',
      establishmentName: 'Apex Systems Global Services',
      establishmentId: 'MHBAN0018274000',
      joiningDate: '2017-07-15',
      exitDate: '2021-03-31',
      pfBalance: 142500, // ₹1,42,500 waiting to be transferred!
      pensionBalance: 28000,
      status: 'DORMANT',
    },
  ]);

  // 6. SPI Driving Licence
  await database
    .insert(schema.spiDrivingLicences)
    .values({
      licenceNumber: 'KA-01-2018-009124',
      citizenId: PRIYA_SHARMA_ID,
      holderName: 'Priya Sharma',
      dob: '1994-08-15',
      issuedDate: '2018-04-12',
      validUntil: '2038-04-11',
      bloodGroup: 'B+',
      rtoCode: 'KA-01',
      status: 'ACTIVE',
      address: 'Flat 402, Shanti Heights, 12th Main, HAL 2nd Stage, Indiranagar, Bengaluru - 560038',
    })
    .onConflictDoNothing();

  // 7. SPI Telecom Record
  await database.insert(schema.spiTelecomRecords).values({
    imei: '864920051234567',
    mobileNumber: '+91 98765 43210',
    citizenId: PRIYA_SHARMA_ID,
    operator: 'Airtel India',
    simImsi: '404450123456789',
    deviceModel: 'OnePlus 11 5G (Titan Black, 256GB)',
    status: 'ACTIVE',
  });

  // 8. SPI Welfare Schemes Catalog
  await database
    .insert(schema.spiWelfareSchemes)
    .values([
      {
        code: 'PM_KISAN',
        title: 'PM Kisan Samman Nidhi',
        category: 'AGRICULTURE',
        eligibilityCriteria: { maxLandAcres: 5, occupation: 'FARMER' },
        benefitDescription: 'Direct income support of ₹6,000 per year in three equal installments',
        annualBenefitInr: 6000,
        isActive: true,
      },
      {
        code: 'PMJJBY',
        title: 'Pradhan Mantri Jeevan Jyoti Bima Yojana',
        category: 'INSURANCE',
        eligibilityCriteria: { minAge: 18, maxAge: 50, hasBankAcc: true },
        benefitDescription: 'Life insurance cover of ₹2,00,000 for death due to any reason',
        annualBenefitInr: 200000,
        isActive: true,
      },
      {
        code: 'STARTUP_INDIA_SEED',
        title: 'Startup India Seed Fund Scheme',
        category: 'BUSINESS',
        eligibilityCriteria: { businessType: 'PRIVATE_LIMITED', maxIncorporationYears: 2 },
        benefitDescription: 'Financial assistance up to ₹50 Lakhs for proof of concept and prototype development',
        annualBenefitInr: 2000000,
        isActive: true,
      },
    ])
    .onConflictDoNothing();

  // 9. Initial Proactive Government Inbox Items
  await database.insert(schema.governmentInbox).values([
    {
      citizenId: PRIYA_SHARMA_ID,
      category: 'ACTION_REQUIRED',
      title: 'Unlinked Provident Fund account detected',
      whatHappened:
        'An inactive EPF account from Apex Systems Global Services with a balance of ₹1,42,500 was identified under your UAN.',
      whyItMatters:
        'Dormant accounts stop earning compound interest after 36 months and should be consolidated into your active account.',
      whatToDo: 'Review your employment timeline and authorize a consolidated transfer.',
      byWhen: '31 Oct 2026',
      whatHappensNext:
        'INDRA will prepare a synthetic transfer claim (Form 13) and initiate field verification.',
      workflowCode: 'RECOVER_DORMANT_PF',
      actionPayload: {
        dormantMemberId: 'MHBAN0018274000004928',
        activeMemberId: 'KNBLR0049281000010928',
        amountInr: 142500,
      },
      isRead: false,
      isResolved: false,
    },
    {
      citizenId: PRIYA_SHARMA_ID,
      category: 'NOTICE',
      title: 'Passport expires in September 2026',
      whatHappened: 'Your passport (Z198****) reaches its 10-year validity on 14 September 2026.',
      whyItMatters:
        'International travel requires at least 6 months remaining validity. Early renewal avoids express tatkaal fees.',
      whatToDo: 'Confirm your current address and choose a convenient Passport Seva Kendra slot.',
      byWhen: '15 Aug 2026',
      whatHappensNext: 'INDRA will verify your police jurisdiction and schedule your appointment.',
      workflowCode: 'RENEW_PASSPORT',
      actionPayload: { passportNumber: 'Z1982341' },
      isRead: false,
      isResolved: false,
    },
    ]);
  }

  // 10. Seed Second Synthetic Citizen: Aarav Patel (Pune, Maharashtra)
  if (existingAarav.length === 0) {
    console.log('[Seed] Seeding synthetic citizen graph: Aarav Patel...');
    await database.insert(schema.citizens).values({
    id: AARAV_PATEL_ID,
    primaryName: 'Aarav Patel',
    dateOfBirth: '1991-03-22',
    gender: 'Male',
    primaryMobile: '+91 91234 56789',
    primaryEmail: 'aarav.patel@example.in',
    currentCity: 'Pune',
    currentState: 'Maharashtra',
  });

  await database.insert(schema.citizenCredentials).values([
    {
      citizenId: AARAV_PATEL_ID,
      type: 'AADHAAR',
      identifierMasked: 'XXXX-XXXX-4567',
      identifierHash: 'hash_aadhaar_aarav_4567',
      issuedDate: '2011-08-20',
      status: 'ACTIVE',
      metadata: { holderName: 'Aarav Patel', gender: 'Male', yob: '1991' },
    },
    {
      citizenId: AARAV_PATEL_ID,
      type: 'PAN',
      identifierMasked: 'BCDEF****K',
      identifierHash: 'hash_pan_aarav_5678k',
      issuedDate: '2013-11-14',
      status: 'ACTIVE',
      metadata: { holderName: 'Aarav Patel', fathersName: 'Dinesh Patel' },
    },
    {
      citizenId: AARAV_PATEL_ID,
      type: 'DRIVING_LICENCE',
      identifierMasked: 'MH-12-2016-******',
      identifierHash: 'hash_dl_aarav_mh12',
      issuedDate: '2016-06-18',
      expiryDate: '2036-06-17',
      status: 'ACTIVE',
      metadata: { holderName: 'Aarav Patel', class: 'LMV', rto: 'MH-12 Pune' },
    },
    {
      citizenId: AARAV_PATEL_ID,
      type: 'UAN',
      identifierMasked: '1019****8821',
      identifierHash: 'hash_uan_aarav_8821',
      issuedDate: '2018-09-01',
      status: 'ACTIVE',
      metadata: { uanNumber: '101988219012' },
    },
  ]);

  await database.insert(schema.citizenAddresses).values([
    {
      citizenId: AARAV_PATEL_ID,
      type: 'CURRENT',
      line1: 'Flat 402, Kothrud Heights',
      line2: 'Paud Road, Kothrud',
      city: 'Pune',
      district: 'Pune',
      state: 'Maharashtra',
      pincode: '411038',
      isVerified: true,
      validSince: '2020-04-01',
    },
  ]);

  await database.insert(schema.spiEpfoAccounts).values([
    {
      citizenId: AARAV_PATEL_ID,
      uan: '101988219012',
      memberId: 'MHPUN0098210000001824',
      establishmentName: 'TechCorp India Pune Pvt Ltd',
      establishmentId: 'MHPUN0098210',
      joiningDate: '2021-04-01',
      status: 'ACTIVE',
      pfBalance: 85000,
      pensionBalance: 24000,
    },
  ]);

  await database.insert(schema.spiTelecomRecords).values([
    {
      citizenId: AARAV_PATEL_ID,
      mobileNumber: '+91 91234 56789',
      simImsi: '404459123456789',
      imei: '867492049102847',
      deviceModel: 'OnePlus 11R 5G',
      operator: 'Airtel Maharashtra',
      status: 'ACTIVE',
    },
  ]);

  await database.insert(schema.citizenDocuments).values([
    {
      citizenId: AARAV_PATEL_ID,
      documentType: 'AADHAAR_CARD',
      title: 'Aadhaar Identity Document',
      issuer: 'Unique Identification Authority of India',
      documentNumber: 'XXXX-XXXX-4567',
      issueDate: '2011-08-20',
      verificationStatus: 'VERIFIED',
      provenanceId: 'prov_uidai_aarav_4567',
    },
    {
      citizenId: AARAV_PATEL_ID,
      documentType: 'PAN_CARD',
      title: 'Permanent Account Number',
      issuer: 'Income Tax Department',
      documentNumber: 'BCDEF****K',
      issueDate: '2013-11-14',
      verificationStatus: 'VERIFIED',
      provenanceId: 'prov_itd_aarav_5678k',
    },
    {
      citizenId: AARAV_PATEL_ID,
      documentType: 'DRIVING_LICENCE',
      title: 'Driving Licence',
      issuer: 'Maharashtra Transport Department (MH-12)',
      documentNumber: 'MH-12-2016-******',
      issueDate: '2016-06-18',
      expiryDate: '2036-06-17',
      verificationStatus: 'VERIFIED',
      provenanceId: 'prov_rto_aarav_mh12',
    },
  ]);

  await database.insert(schema.governmentInbox).values([
    {
      citizenId: AARAV_PATEL_ID,
      category: 'NOTICE',
      title: 'Advance Tax Assessment for FY 2026-27',
      whatHappened: 'Third quarter advance tax schedule is published for individual taxpayers.',
      whyItMatters: 'Timely installment payments prevent statutory interest under section 234B/C.',
      whatToDo: 'Review self-assessment calculations before the statutory quarterly date.',
      byWhen: '15 Dec 2026',
      whatHappensNext: 'INDRA will check for any prepaid TDS credits in your Form 26AS.',
      workflowCode: null,
      isRead: false,
      isResolved: false,
    },
  ]);
  }

  console.log('[Seed] Seeding completed successfully!');
  return { citizenId: PRIYA_SHARMA_ID, secondaryCitizenId: AARAV_PATEL_ID };
}

// Auto-run if executed directly
if (process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}
