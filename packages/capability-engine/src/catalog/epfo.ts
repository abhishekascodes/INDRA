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
    const dormant = accounts.filter((a) => a.status === 'DORMANT');
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
