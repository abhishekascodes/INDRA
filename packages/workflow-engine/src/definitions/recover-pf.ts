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
        return {
          sourceMemberId: dormant?.memberId || 'MHBAN0018274000004928',
          targetMemberId: active?.memberId || 'KNBLR0049281000010928',
          amountInr: dormant?.pfBalance || 142500,
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
