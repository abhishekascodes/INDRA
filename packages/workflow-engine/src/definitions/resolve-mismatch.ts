import type { WorkflowContract } from '@indra/contracts';

export const ResolveMismatchWorkflow: WorkflowContract = {
  code: 'RESOLVE_NAME_MISMATCH',
  title: 'Harmonize Identity Records Across Registries',
  description: 'Synchronizes disparate name variations between Aadhaar ("Priya Sharma") and PAN ("Priya S.") to unblock passport and tax applications.',
  category: 'IDENTITY',
  initialStepId: 'step_verify',
  steps: {
    step_verify: {
      stepId: 'step_verify',
      title: 'Compare Identity Ground Truth',
      capabilityId: 'identity.verify_credential',
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
        credentialType: 'PAN',
      }),
      onSuccess: (_output: any, ctx: any) => ({
        inconsistencyDetected: true,
        sourceNameAadhaar: ctx.citizenName || 'Verified Citizen',
        conflictingNamePan: ctx.panHolderName || 'Conflicting Record',
      }),
      nextStepId: 'step_sync',
    },
    step_sync: {
      stepId: 'step_sync',
      title: 'Synchronize PAN Record to Match Aadhaar',
      capabilityId: 'identity.update_pan_name',
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
        correctedName: (ctx.citizenName as string) || 'Priya Sharma',
        supportingAadhaarNumber: (ctx.aadhaarNumber as string) || 'XXXX-XXXX-9012',
      }),
      nextStepId: null,
    },
  },
};
