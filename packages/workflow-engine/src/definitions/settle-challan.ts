import type { WorkflowContract } from '@indra/contracts';

export const SettleTrafficChallanWorkflow: WorkflowContract = {
  code: 'SETTLE_TRAFFIC_CHALLAN',
  title: 'Inquire & Reconcile Traffic e-Challan Penalty',
  description: 'Inquires the MoRTH Parivahan national enforcement register for pending violation notices and reconciles statutory compliance.',
  category: 'TRANSPORT',
  initialStepId: 'step_inquire_challan',
  steps: {
    step_inquire_challan: {
      stepId: 'step_inquire_challan',
      title: 'Inquire Parivahan e-Challan Register',
      capabilityId: 'transport.inquire_echallan',
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
        vehicleRegNo: (ctx.vehicleRegNo as string) || (ctx.vehicleNumber as string) || 'KA-01-MJ-5544',
      }),
      onSuccess: (output: any) => ({
        totalPendingChallans: output.totalPendingChallans,
        totalFineAmountInr: output.totalFineAmountInr,
        challans: output.challans,
      }),
      nextStepId: null,
    },
  },
};
