import type { WorkflowContract } from '@indra/contracts';

export const CheckItrStatusWorkflow: WorkflowContract = {
  code: 'CHECK_ITR_STATUS',
  title: 'Verify Income Tax Return & TRACES Credits',
  description: 'Inquires TRACES Form 26AS for verified TDS deductions and queries CPC e-Filing ledger for return processing and refund intimation.',
  category: 'TAX',
  initialStepId: 'step_fetch_26as',
  steps: {
    step_fetch_26as: {
      stepId: 'step_fetch_26as',
      title: 'Fetch Form 26AS Tax Credit Statement',
      capabilityId: 'tax.fetch_form26as',
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
        financialYear: (ctx.financialYear as string) || '2025-26',
      }),
      onSuccess: (output: any) => ({
        totalTdsInr: output.totalTdsInr,
        totalAdvanceTaxInr: output.totalAdvanceTaxInr,
        taxEntriesCount: output.entries?.length || 0,
      }),
      nextStepId: 'step_check_status',
    },
    step_check_status: {
      stepId: 'step_check_status',
      title: 'Inquire CPC e-Filing Return Processing Status',
      capabilityId: 'tax.check_itr_status',
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
        assessmentYear: (ctx.assessmentYear as string) || '2026-27',
      }),
      nextStepId: null,
    },
  },
};