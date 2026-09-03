import type { WorkflowContract } from '@indra/contracts';

export const RecoverDormantPfWorkflow: WorkflowContract = {
  code: 'RECOVER_DORMANT_PF',
  title: 'Consolidate Inactive Provident Fund',
  description: 'Identifies unlinked dormant EPFO member accounts and transfers balance to your active account.',
  category: 'EMPLOYMENT',
  initialStepId: 'step_inquire',
  steps: {
    step_inquire: {
      stepId: 'step_inquire',
      title: 'Scan EPFO Records for Inactive Accounts',
      capabilityId: 'epfo.inquire_accounts',
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
      }),
      onSuccess: (output: any) => {
        const dormant = output.dormantAccounts?.[0];
        const active = output.accounts?.find((a: any) => a.status === 'ACTIVE');
        if (!dormant) {
          throw new Error('No dormant provident fund account found to consolidate.');
        }
        if (!active) {
          throw new Error('No active provident fund account found to receive consolidated funds.');
        }
        return {
          sourceMemberId: dormant.memberId,
          targetMemberId: active.memberId,
          amountInr: dormant.pfBalance,
          sourceEstablishment: dormant.establishmentName,
          targetEstablishment: active.establishmentName,
        };
      },
      nextStepId: 'step_transfer',
    },
    step_transfer: {
      stepId: 'step_transfer',
      title: 'Execute Consolidated Transfer Claim',
      capabilityId: 'epfo.transfer_claim',
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
        sourceMemberId: ctx.sourceMemberId,
        targetMemberId: ctx.targetMemberId,
      }),
      nextStepId: null, // End of workflow
    },
  },
};
