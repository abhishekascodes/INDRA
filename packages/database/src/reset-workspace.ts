import { getDb } from './client.js';
import * as schema from './schema.js';
import { eq } from 'drizzle-orm';
import { PRIYA_SHARMA_ID, AARAV_PATEL_ID, ACTIVE_EPFO_ID, DORMANT_EPFO_ID } from './seed.js';

export async function resetCitizenWorkspace(db: any = null, citizenId: string) {
  const database = db || (await getDb());
  if (citizenId !== AARAV_PATEL_ID && citizenId !== PRIYA_SHARMA_ID) {
    throw new Error('Cannot reset synthetic workspace for unknown citizen ID: ' + citizenId);
  }

  // 1. Delete all transactional, workflow, transition and mutable evaluation tables
  await database.delete(schema.workflowRuns).where(eq(schema.workflowRuns.citizenId, citizenId));
  await database.delete(schema.citizenStateTransitions).where(eq(schema.citizenStateTransitions.citizenId, citizenId));
  await database.delete(schema.reviewSessions).where(eq(schema.reviewSessions.citizenId, citizenId));
  await database.delete(schema.applications).where(eq(schema.applications.citizenId, citizenId));
  await database.delete(schema.payments).where(eq(schema.payments.citizenId, citizenId));
  await database.delete(schema.consentArtifacts).where(eq(schema.consentArtifacts.citizenId, citizenId));
  await database.delete(schema.auditLogs).where(eq(schema.auditLogs.citizenId, citizenId));
  await database.delete(schema.proactiveFindings).where(eq(schema.proactiveFindings.citizenId, citizenId));
  await database.delete(schema.actionPlans).where(eq(schema.actionPlans.citizenId, citizenId));
  await database.delete(schema.capabilityRuns).where(eq(schema.capabilityRuns.citizenId, citizenId));
  await database.delete(schema.workflowRuns).where(eq(schema.workflowRuns.citizenId, citizenId));

  // 2. Delete domain and identity tables
  await database.delete(schema.citizenProperties).where(eq(schema.citizenProperties.citizenId, citizenId));
  await database.delete(schema.citizenVehicles).where(eq(schema.citizenVehicles.citizenId, citizenId));
  await database.delete(schema.citizenEmployments).where(eq(schema.citizenEmployments.citizenId, citizenId));
  await database.delete(schema.citizenEducations).where(eq(schema.citizenEducations.citizenId, citizenId));
  await database.delete(schema.citizenRelationships).where(eq(schema.citizenRelationships.citizenId, citizenId));
  await database.delete(schema.citizenStatutoryObligations).where(eq(schema.citizenStatutoryObligations.citizenId, citizenId));
  await database.delete(schema.citizenCredentials).where(eq(schema.citizenCredentials.citizenId, citizenId));
  await database.delete(schema.citizenAddresses).where(eq(schema.citizenAddresses.citizenId, citizenId));
  await database.delete(schema.citizenDocuments).where(eq(schema.citizenDocuments.citizenId, citizenId));
  await database.delete(schema.governmentInbox).where(eq(schema.governmentInbox.citizenId, citizenId));
  await database.delete(schema.citizenHealthRecords).where(eq(schema.citizenHealthRecords.citizenId, citizenId));
  await database.delete(schema.citizenAcademicRecords).where(eq(schema.citizenAcademicRecords.citizenId, citizenId));
  await database.delete(schema.citizenLegalRecords).where(eq(schema.citizenLegalRecords.citizenId, citizenId));
  await database.delete(schema.citizenBankAccounts).where(eq(schema.citizenBankAccounts.citizenId, citizenId));

  // 3. Delete SPI tables
  await database.delete(schema.spiEpfoAccounts).where(eq(schema.spiEpfoAccounts.citizenId, citizenId));
  await database.delete(schema.spiTelecomRecords).where(eq(schema.spiTelecomRecords.citizenId, citizenId));
  await database.delete(schema.spiDrivingLicences).where(eq(schema.spiDrivingLicences.citizenId, citizenId));
  await database.delete(schema.spiTrafficChallans).where(eq(schema.spiTrafficChallans.citizenId, citizenId));
  await database.delete(schema.spiRationCards).where(eq(schema.spiRationCards.citizenId, citizenId));
  await database.delete(schema.spiCropInsurances).where(eq(schema.spiCropInsurances.citizenId, citizenId));
  await database.delete(schema.spiMunicipalServices).where(eq(schema.spiMunicipalServices.citizenId, citizenId));
  await database.delete(schema.spiPoliceClearances).where(eq(schema.spiPoliceClearances.citizenId, citizenId));
  await database.delete(schema.spiCyberComplaints).where(eq(schema.spiCyberComplaints.citizenId, citizenId));

  // 4. Reset simulation outage configuration
  await database
    .insert(schema.syntheticOutageConfig)
    .values({
      id: 'GLOBAL_SIMULATION_CONFIG',
      simulatePropertyOutage: false,
      failNextPropertyRequest: false,
      injectDeedContradiction: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.syntheticOutageConfig.id,
      set: {
        simulatePropertyOutage: false,
        failNextPropertyRequest: false,
        injectDeedContradiction: true,
        updatedAt: new Date(),
      },
    });

  if (citizenId === AARAV_PATEL_ID) {
    // 5a. Reset Aarav Profile
    await database
      .update(schema.citizens)
      .set({
        primaryName: 'Aarav Patel',
        currentCity: 'Pune',
        currentState: 'Maharashtra',
        updatedAt: new Date(),
      })
      .where(eq(schema.citizens.id, AARAV_PATEL_ID));

    // 5b. Re-insert Aarav Credentials
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

    // 5c. Address
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

    // 5d. SPI EPFO
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
      {
        citizenId: AARAV_PATEL_ID,
        uan: '101988219012',
        memberId: 'KNBLR0049281000010928',
        establishmentName: 'CloudScale Technologies Bengaluru Pvt Ltd',
        establishmentId: 'KNBLR0049281',
        joiningDate: '2018-06-01',
        exitDate: '2021-03-31',
        status: 'DORMANT',
        pfBalance: 142500,
        pensionBalance: 28000,
      },
    ]);

    // 5e. SPI Telecom & DL
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

    await database
      .insert(schema.spiDrivingLicences)
      .values({
        licenceNumber: 'MH-12-2016-008192',
        citizenId: AARAV_PATEL_ID,
        holderName: 'Aarav Patel',
        dob: '1991-03-22',
        issuedDate: '2016-06-18',
        validUntil: '2036-06-17',
        bloodGroup: 'O+',
        rtoCode: 'MH-12',
        status: 'ACTIVE',
        address: 'Flat 402, Kothrud Heights, Paud Road, Kothrud, Pune - 411038',
      })
      .onConflictDoNothing();

    // 5f. Documents
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

    // 5g. Inbox
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

    // 5h. Relationships & Properties
    await database.insert(schema.citizenRelationships).values({
      citizenId: AARAV_PATEL_ID,
      relationType: 'PARENT',
      fullName: 'Sunita Patel',
      dateOfBirth: '1968-11-22',
      isNomineeForEpfo: true,
      isDependentForHealth: true,
    });

    await database.insert(schema.citizenProperties).values({
      citizenId: AARAV_PATEL_ID,
      propertyType: 'AGRICULTURAL_LAND',
      identifier: 'Gat No. 142/3',
      municipalBody: 'Satara District Revenue Department',
      address: 'Survey 142/3, Village Wai, Taluk Wai, District Satara - 412803',
      state: 'Maharashtra',
      annualTaxInr: 350,
      taxPaymentStatus: 'PAID',
    });

    // 5i. Employments, Educations, Obligations
    await database.insert(schema.citizenEmployments).values([
      {
        citizenId: AARAV_PATEL_ID,
        employerName: 'TechCorp India Pune Pvt Ltd',
        designation: 'Senior Data Analyst',
        uan: '101988219012',
        memberId: 'MHPUN0098210000001824',
        establishmentId: 'MHPUN0098210',
        startDate: '2021-04-01',
        isCurrent: true,
      },
    ]);

    await database.insert(schema.citizenEducations).values([
      {
        citizenId: AARAV_PATEL_ID,
        degree: 'Bachelor of Science (B.Sc.)',
        fieldOfStudy: 'Statistics',
        institution: 'Fergusson College, Pune',
        boardOrUniversity: 'Savitribai Phule Pune University',
        passingYear: 2018,
        rollNumber: 'PU-15-STAT-492',
        apaarId: 'APAAR-2018-491028',
      },
    ]);

    await database.insert(schema.citizenStatutoryObligations).values([
      {
        citizenId: AARAV_PATEL_ID,
        obligationType: 'ITR_FILING',
        title: 'Income Tax Return (ITR-2) for AY 2026-27',
        authority: 'Income Tax Department (Pune Circle)',
        dueDate: '2026-07-31',
        status: 'PENDING',
        penaltyInrPerDay: 50,
      },
      {
        citizenId: AARAV_PATEL_ID,
        obligationType: 'LAND_REVENUE',
        title: 'Maharashtra Gram Panchayat Land Assessment',
        authority: 'Satara Zilla Parishad',
        dueDate: '2026-03-31',
        status: 'SATISFIED',
      },
    ]);

    // 5j. Phase 3.5 & Wave 2 tables
    await database.insert(schema.citizenAcademicRecords).values([
      {
        citizenId: AARAV_PATEL_ID,
        apaarId: 'APAAR-411005-77312',
        degreeName: 'Bachelor of Science (Agriculture)',
        institutionName: 'College of Agriculture, Pune',
        yearOfPassing: '2018',
        creditsTotal: 140,
        gradeOrCgpa: '8.8 CGPA',
        verificationStatus: 'VERIFIED',
        provenanceData: {
          sourceAuthority: 'Academic Bank of Credits (DigiLocker NAD)',
          provenanceType: 'REGISTRY_FACT',
          isSimulationAssumption: true,
        },
      },
    ]);

    await database.insert(schema.citizenLegalRecords).values([
      {
        citizenId: AARAV_PATEL_ID,
        cnrNumber: 'MHST02-001948-2024',
        courtName: 'Court of Civil Judge Senior Division, Satara',
        caseType: 'CIVIL_SUIT',
        filingDate: '2024-02-15',
        caseStatus: 'DISPOSED_CLEARANCE_ISSUED',
        summary: 'Boundary demarcation verification suit between adjacent agricultural holders. Title confirmed in favor of Patel family. Zero encumbrance.',
        relatedPropertyIdentifier: 'SURVEY-142/B-SATARA',
        isEncumbrance: false,
        provenanceData: {
          sourceAuthority: 'e-Committee Supreme Court of India (NJDG)',
          provenanceType: 'SYSTEM_OBSERVATION',
          isSimulationAssumption: true,
        },
      },
    ]);

    await database.insert(schema.citizenBankAccounts).values([
      {
        citizenId: AARAV_PATEL_ID,
        fipId: 'FIP_SBI',
        bankName: 'State Bank of India',
        accountMasked: 'XXXX-1102',
        accountType: 'AGRICULTURE_SAVINGS',
        ifscCode: 'SBIN0001248',
        closingBalanceInr: 42100,
        aggregateCreditsInr: 215000,
        aggregateDebitsInr: 172900,
        verifiedTdsCount: 0,
        statementPeriod: '2025-04-01 to 2026-03-31',
        provenanceData: {
          sourceAuthority: 'State Bank of India Core Banking System (via Sahamati AA)',
          provenanceType: 'EXTERNAL_SPI',
          isSimulationAssumption: true,
        },
      },
    ]);

    await database.insert(schema.spiTrafficChallans).values([
      {
        citizenId: AARAV_PATEL_ID,
        vehicleRegNo: 'MH-12-AB-1234',
        challanNo: 'MH12093849102',
        violationDate: '2025-11-04 16:15:00',
        offense: 'Signal red light violation',
        amountInr: 500,
        status: 'PAID',
        location: 'Shivajinagar Junction, Pune',
        paidAt: new Date('2025-11-05T10:30:00Z'),
      },
    ]);

    await database.insert(schema.spiRationCards).values([
      {
        citizenId: AARAV_PATEL_ID,
        rationCardNo: 'RC-MH-2021-998821',
        schemeType: 'PHH',
        membersCount: 4,
        monthlyWheatKg: 15,
        monthlyRiceKg: 10,
        allocatedFpsName: 'Khadki Fair Price Shop #42, Pune Rural',
        lastLiftedDate: '2026-02-05',
        status: 'ACTIVE',
      },
    ]);

    await database.insert(schema.spiCropInsurances).values([
      {
        citizenId: AARAV_PATEL_ID,
        policyNumber: 'PMFBY-MH-KHARIF-2025-9981',
        surveyNumber: '142/B',
        season: 'KHARIF',
        cropName: 'Onion & Pulses',
        areaHectares: '1.42',
        sumInsuredInr: 250000,
        farmerPremiumInr: 5000,
        governmentSubsidyInr: 20000,
        status: 'ACTIVE',
      },
    ]);

    return { citizenId: AARAV_PATEL_ID, name: 'Aarav Patel', city: 'Pune', state: 'Maharashtra' };
  } else {
    // 6a. Reset Priya Profile
    await database
      .update(schema.citizens)
      .set({
        primaryName: 'Priya Sharma',
        currentCity: 'Bengaluru',
        currentState: 'Karnataka',
        updatedAt: new Date(),
      })
      .where(eq(schema.citizens.id, PRIYA_SHARMA_ID));

    // 6b. Re-insert Priya Credentials
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
        expiryDate: '2026-09-14',
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

    // 6c. Address
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

    // 6d. Documents
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

    // 6e. SPI EPFO
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
        pfBalance: 142500,
        pensionBalance: 28000,
        status: 'DORMANT',
      },
    ]);

    // 6f. SPI DL & Telecom
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

    await database.insert(schema.spiTelecomRecords).values({
      imei: '864920051234567',
      mobileNumber: '+91 98765 43210',
      citizenId: PRIYA_SHARMA_ID,
      operator: 'Airtel India',
      simImsi: '404450123456789',
      deviceModel: 'OnePlus 11 5G (Titan Black, 256GB)',
      status: 'ACTIVE',
    });

    // 6g. Inbox
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

    // 6h. Relationships, Vehicles, Properties
    await database.insert(schema.citizenRelationships).values({
      citizenId: PRIYA_SHARMA_ID,
      relationType: 'SPOUSE',
      fullName: 'Vikram Sharma',
      dateOfBirth: '1992-03-10',
      isNomineeForEpfo: true,
      isDependentForHealth: true,
    });

    await database.insert(schema.citizenVehicles).values({
      citizenId: PRIYA_SHARMA_ID,
      registrationNumber: 'KA-01-EQ-4921',
      chassisNumber: 'ME4JF5012NK094812',
      vehicleClass: 'TWO_WHEELER',
      makerModel: 'Ather 450X (Gen 3, Space Grey)',
      rtoCode: 'KA-01',
      state: 'Karnataka',
      registrationDate: '2022-06-15',
      fitnessValidUntil: '2037-06-14',
      puccValidUntil: '2027-06-14',
      hypothecatedTo: 'HDFC Bank Ltd',
      status: 'ACTIVE',
    });

    await database.insert(schema.citizenProperties).values({
      citizenId: PRIYA_SHARMA_ID,
      propertyType: 'RESIDENTIAL_FLAT',
      identifier: '114-W0124-9',
      municipalBody: 'Bruhat Bengaluru Mahanagara Palike (BBMP)',
      address: 'Flat 402, Shanti Heights, 12th Main, HAL 2nd Stage, Indiranagar, Bengaluru - 560038',
      state: 'Karnataka',
      annualTaxInr: 4200,
      taxPaymentStatus: 'PAID',
    });

    // 6i. Employments, Educations, Obligations
    await database.insert(schema.citizenEmployments).values([
      {
        citizenId: PRIYA_SHARMA_ID,
        employerName: 'TechSolutions Bengaluru Pvt Ltd',
        designation: 'Senior Software Engineer',
        uan: '100904523182',
        memberId: 'KNBLR0049281000010928',
        establishmentId: 'KNBLR0049281',
        startDate: '2022-01-10',
        isCurrent: true,
      },
      {
        citizenId: PRIYA_SHARMA_ID,
        employerName: 'Apex Systems Global Services',
        designation: 'Software Engineer',
        uan: '100904523182',
        memberId: 'MHBAN0018274000004928',
        establishmentId: 'MHBAN0018274',
        startDate: '2019-06-01',
        endDate: '2021-12-31',
        isCurrent: false,
      },
    ]);

    await database.insert(schema.citizenEducations).values([
      {
        citizenId: PRIYA_SHARMA_ID,
        degree: 'Bachelor of Engineering (B.E.)',
        fieldOfStudy: 'Computer Science & Engineering',
        institution: 'BMS College of Engineering, Bengaluru',
        boardOrUniversity: 'Visvesvaraya Technological University (VTU Belagavi)',
        passingYear: 2016,
        rollNumber: '1BM12CS084',
        apaarId: 'APAAR-2016-908124',
      },
    ]);

    await database.insert(schema.citizenStatutoryObligations).values([
      {
        citizenId: PRIYA_SHARMA_ID,
        obligationType: 'ITR_FILING',
        title: 'Income Tax Return (ITR-1) for AY 2026-27',
        authority: 'Income Tax Department (CPC Bengaluru)',
        dueDate: '2026-07-31',
        status: 'SATISFIED',
      },
      {
        citizenId: PRIYA_SHARMA_ID,
        obligationType: 'PROPERTY_TAX',
        title: 'BBMP Urban Property Tax (FY 2026-27)',
        authority: 'Bruhat Bengaluru Mahanagara Palike',
        dueDate: '2026-04-30',
        status: 'SATISFIED',
      },
    ]);

    // 6j. Phase 3.5 & Wave 2 tables
    await database.insert(schema.citizenHealthRecords).values([
      {
        citizenId: PRIYA_SHARMA_ID,
        abhaAddress: 'priya@abdm',
        hipName: 'Fortis Hospital (Bannerghatta Road, Bengaluru)',
        recordType: 'DISCHARGE_SUMMARY',
        recordDate: '2025-11-20',
        diagnosticSummary: 'Day-care arthroscopic ligament reconstruction. Post-op recovery normal. Full mobility restored.',
        provenanceData: {
          sourceAuthority: 'National Health Authority (ABDM Gateway)',
          provenanceType: 'SYSTEM_OBSERVATION',
          isSimulationAssumption: true,
        },
      },
    ]);

    await database.insert(schema.citizenAcademicRecords).values([
      {
        citizenId: PRIYA_SHARMA_ID,
        apaarId: 'APAAR-560038-99124',
        degreeName: 'Bachelor of Technology (Computer Science & Engineering)',
        institutionName: 'PES University, Bengaluru',
        yearOfPassing: '2016',
        creditsTotal: 160,
        gradeOrCgpa: '9.2 CGPA',
        verificationStatus: 'VERIFIED',
        provenanceData: {
          sourceAuthority: 'Academic Bank of Credits (DigiLocker NAD)',
          provenanceType: 'REGISTRY_FACT',
          isSimulationAssumption: true,
        },
      },
    ]);

    await database.insert(schema.citizenBankAccounts).values([
      {
        citizenId: PRIYA_SHARMA_ID,
        fipId: 'FIP_HDFC_BANK',
        bankName: 'HDFC Bank Ltd',
        accountMasked: 'XXXX-4928',
        accountType: 'SAVINGS',
        ifscCode: 'HDFC0000053',
        closingBalanceInr: 384250,
        aggregateCreditsInr: 1250000,
        aggregateDebitsInr: 865750,
        verifiedTdsCount: 4,
        statementPeriod: '2025-04-01 to 2026-03-31',
        provenanceData: {
          sourceAuthority: 'HDFC Bank Core Banking System (via Sahamati AA)',
          provenanceType: 'EXTERNAL_SPI',
          isSimulationAssumption: true,
        },
      },
    ]);

    await database.insert(schema.spiTrafficChallans).values([
      {
        citizenId: PRIYA_SHARMA_ID,
        vehicleRegNo: 'KA-01-MJ-5544',
        challanNo: 'KA90124810294',
        violationDate: '2026-02-18 11:42:00',
        offense: 'Exceeding statutory speed limit (82 km/h in 60 km/h corridor)',
        amountInr: 1000,
        status: 'UNPAID',
        location: 'Airport Elevated Corridor (NH-44), Bengaluru',
        evidenceUrl: 'https://synthetic.parivahan.gov.in/evidence/KA90124810294.jpg',
      },
    ]);

    await database.insert(schema.spiMunicipalServices).values([
      {
        citizenId: PRIYA_SHARMA_ID,
        serviceType: 'WATER_CONNECTION',
        identifier: 'WTR-BLR-984421',
        title: 'Domestic Piped Water Meter (15mm)',
        propertyIdentifier: 'PID-BBMP-77218-E',
        municipalBody: 'Bangalore Water Supply and Sewerage Board (BWSSB)',
        status: 'ACTIVE',
        metadata: { connectionType: 'DOMESTIC', meterSanctionedDate: '2023-08-10' },
      },
      {
        citizenId: PRIYA_SHARMA_ID,
        serviceType: 'TRADE_LICENSE',
        identifier: 'TL-BBMP-2024-5510',
        title: 'Shop & Commercial Establishment License',
        propertyIdentifier: 'PID-BBMP-77218-E',
        municipalBody: 'Bruhat Bengaluru Mahanagara Palike',
        status: 'ACTIVE',
        metadata: { tradeCategory: 'INFORMATION_TECHNOLOGY_SERVICES', validUntil: '2027-03-31' },
      },
    ]);

    await database.insert(schema.spiPoliceClearances).values([
      {
        citizenId: PRIYA_SHARMA_ID,
        recordType: 'PCC',
        referenceNumber: 'PCC-BLR-2025-44910',
        policeStation: 'Indiranagar Police Station, Bengaluru',
        incidentOrPurpose: 'Police Clearance Certificate for Employment Overseas',
        status: 'CLEARED',
      },
    ]);

    await database.insert(schema.spiCyberComplaints).values([
      {
        citizenId: PRIYA_SHARMA_ID,
        complaintAckNo: '1930-KA-2025-00918',
        incidentDate: '2025-10-12',
        fraudAmountInr: 5000,
        suspectAccountOrPhone: '+91 99887 76655',
        transactionRefNumber: 'UPI/9812480192',
        assignedCyberCell: 'Cyber Crime Police Station, CID Bengaluru',
        freezeRequestSentToBanks: true,
        portal1930Status: 'FUNDS_RECOVERED_CLOSED',
      },
    ]);

    return { citizenId: PRIYA_SHARMA_ID, name: 'Priya Sharma', city: 'Bengaluru', state: 'Karnataka' };
  }
}
