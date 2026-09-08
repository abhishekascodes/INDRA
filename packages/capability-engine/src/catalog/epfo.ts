import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { EpfoSpiAdapter } from '@indra/spi-adapters';
import { getDb, schema } from '@indra/database';
import { eq } from 'drizzle-orm';

const epfoAdapter = new EpfoSpiAdapter();

export const EpfoInquireAccountsCapability: CapabilityContract<{ citizenId: string }, any> = {
  id: 'epfo.inquire_accounts',
  version: '1.0.0',
  domain: 'EMPLOYMENT',
  humanName: 'Inquire Provident Fund Accounts',
  description: 'Retrieves all active and dormant EPF member accounts associated with the citizen.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
  }),
  outputSchema: z.object({
    accounts: z.array(z.any()),
    dormantFound: z.boolean(),
  }),
  execute: async (input) => {
    const accounts = await epfoAdapter.getAccountsForCitizen(input.citizenId);
    const dormant = accounts.filter((a) => a.status === 'DORMANT' || a.status === 'INACTIVE');
    return {
      accounts,
      dormantFound: dormant.length > 0,
      dormantAccounts: dormant,
    };
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'EPFO_ACCOUNTS',
      entityId: input.citizenId,
      sourceType: 'SYSTEM_OBSERVATION',
      sourceAuthority: "Employees' Provident Fund Organisation",
      confidence: 100,
    },
  ],
};

export const EpfoTransferClaimCapability: CapabilityContract<
  {
    citizenId: string;
    sourceMemberId: string;
    targetMemberId: string;
  },
  any
> = {
  id: 'epfo.transfer_claim',
  version: '1.0.0',
  domain: 'EMPLOYMENT',
  humanName: 'Consolidate Inactive Provident Fund Account',
  description: 'Submits a synthetic Form 13 transfer claim to consolidate dormant balance into the active employment account.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Authorize EPF Account Consolidation',
    summary: 'Transfer ₹1,42,500 from your inactive Apex Systems account to InnoTech Solutions.',
    consequencesNotice: 'Once initiated, the previous member ID will be marked TRANSFERRED and funds will be credited to your active account.',
    confirmationLabel: 'Authorize Transfer',
  },
  consentRequirement: {
    purpose: 'EPFO account transfer and service history consolidation',
    dataElements: ['UAN', 'MEMBER_ID', 'ESTABLISHMENT_SERVICE_HISTORY'],
    retentionDuration: 'Active claim duration',
    userFriendlyExplanation: 'Allows INDRA to submit your signed Form 13 claim to EPFO on your behalf.',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    sourceMemberId: z.string(),
    targetMemberId: z.string(),
  }),
  outputSchema: z.object({
    claimTrackingId: z.string(),
    sourceEstablishment: z.string(),
    targetEstablishment: z.string(),
    transferredAmountInr: z.number(),
    status: z.string(),
  }),
  execute: async (input, ctx) => {
    return epfoAdapter.submitTransferClaim({
      citizenId: input.citizenId,
      sourceMemberId: input.sourceMemberId,
      targetMemberId: input.targetMemberId,
      authorizedByCitizen: ctx.authorizationGranted ?? true,
    });
  },
  compensate: async (input, output) => {
    const db = await getDb();
    const [source] = await db
      .select()
      .from(schema.spiEpfoAccounts)
      .where(eq(schema.spiEpfoAccounts.memberId, input.sourceMemberId));
    const [target] = await db
      .select()
      .from(schema.spiEpfoAccounts)
      .where(eq(schema.spiEpfoAccounts.memberId, input.targetMemberId));

    if (source && target && output?.transferredAmountInr) {
      await db
        .update(schema.spiEpfoAccounts)
        .set({
          pfBalance: source.pfBalance + output.transferredAmountInr,
          status: 'DORMANT',
        })
        .where(eq(schema.spiEpfoAccounts.id, source.id));

      await db
        .update(schema.spiEpfoAccounts)
        .set({
          pfBalance: Math.max(0, target.pfBalance - output.transferredAmountInr),
        })
        .where(eq(schema.spiEpfoAccounts.id, target.id));
    }
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'EPFO_CLAIM',
      entityId: output.claimTrackingId,
      sourceType: 'ACTION',
      sourceAuthority: "Employees' Provident Fund Organisation",
      confidence: 100,
      metadata: { transferredAmountInr: output.transferredAmountInr },
    },
  ],
};

export const EpfoDownloadPassbookCapability: CapabilityContract<
  {
    citizenId: string;
    memberId: string;
  },
  any
> = {
  id: 'epfo.download_passbook',
  version: '1.0.0',
  domain: 'EMPLOYMENT',
  humanName: 'Download EPFO Member Passbook',
  description: 'Retrieves monthly employee/employer contribution ledger and annual statutory interest accrual.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    memberId: z.string(),
  }),
  outputSchema: z.object({
    memberId: z.string(),
    uan: z.string(),
    establishmentName: z.string(),
    totalPfBalanceInr: z.number(),
    pensionBalanceInr: z.number(),
    interestRatePercent: z.number(),
    lastContributionMonth: z.string(),
    monthlyBreakdown: z.array(
      z.object({
        month: z.string(),
        employeeShare: z.number(),
        employerShare: z.number(),
        pensionShare: z.number(),
      })
    ),
    generatedAt: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    return epfoAdapter.downloadPassbook(input.citizenId, input.memberId);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'EPFO_PASSBOOK',
      entityId: input.memberId,
      sourceType: 'FACT',
      sourceAuthority: "Employees' Provident Fund Organisation (EPFO)",
      confidence: 100,
    },
  ],
};

export const EpfoUpdateKycPanCapability: CapabilityContract<
  {
    citizenId: string;
    panNumber: string;
  },
  any
> = {
  id: 'epfo.update_kyc_pan',
  version: '1.0.0',
  domain: 'EMPLOYMENT',
  humanName: 'Seed Verified PAN into EPFO UAN Profile',
  description: 'Seeds verified Income Tax PAN into EPFO member profile to prevent TDS deduction on withdrawals.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  requiredPermissions: ['EPFO_KYC_UPDATE', 'TAX_IDENTITY_LINK'],
  inputSchema: z.object({
    citizenId: z.string(),
    panNumber: z.string().min(10),
  }),
  outputSchema: z.object({
    panNumberMasked: z.string(),
    seedingStatus: z.string(),
    seededAt: z.string(),
    uanLinked: z.boolean(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    return epfoAdapter.updateKycPan(input.citizenId, input.panNumber);
  },
  compensate: async (input) => {
    // Reversal logic for unlinking PAN
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'EPFO_PAN_SEEDING',
      entityId: input.citizenId,
      sourceType: 'FACT',
      sourceAuthority: "Employees' Provident Fund Organisation (EPFO)",
      confidence: 100,
    },
  ],
};

export const EpfoGenerateUanCardCapability: CapabilityContract<any, any> = {
  id: 'epfo.generate_uan_card',
  version: '1.0.0',
  domain: 'EMPLOYMENT',
  humanName: 'Generate Official EPFO UAN Card',
  description: 'Issues authoritative EPFO Universal Account Number card with secure QR verification code.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    uan: z.string().min(10),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    uan: z.string(),
    holderName: z.string(),
    qrCodePayload: z.string(),
    issuanceDate: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return epfoAdapter.generateUanCard(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'EPFO_UAN_CARD',
      entityId: output.uan,
      sourceType: 'FACT',
      sourceAuthority: "Employees' Provident Fund Organisation (EPFO)",
      confidence: 100,
    },
  ],
};

export const EpfoInquirePensionStatusCapability: CapabilityContract<any, any> = {
  id: 'epfo.inquire_pension_status',
  version: '1.0.0',
  domain: 'EMPLOYMENT',
  humanName: 'Inquire EPS-95 Pension Eligibility & Annuity',
  description: 'Calculates pensionable service years, statutory vesting status, and projected monthly annuity under EPS-95.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    uan: z.string().min(10),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    uan: z.string(),
    pensionableServiceYears: z.number(),
    eligibleForEps95: z.boolean(),
    estimatedMonthlyPensionInr: z.number(),
    pensionStatus: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return epfoAdapter.inquirePensionStatus(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'EPS95_PENSION_CALCULATION',
      entityId: input.uan,
      sourceType: 'FACT',
      sourceAuthority: "Employees' Provident Fund Organisation (EPFO Pension Division)",
      confidence: 100,
    },
  ],
};

