import type { WorkflowContract } from '@indra/contracts';

export const LostPhoneWorkflow: WorkflowContract = {
  code: 'LOST_DEVICE_PROTECTION',
  title: 'Emergency Stolen Handset & SIM Protection',
  description: 'Instantly blacklists the device IMEI via CEIR, blocks linked SIM connections, and generates an e-Loss police acknowledgment.',
  category: 'SECURITY',
  initialStepId: 'step_confirm',
  steps: {
    step_confirm: {
      stepId: 'step_confirm',
      title: 'Confirm Lost Device Details',
      capabilityId: 'telecom.block_stolen_device',
      dynamicUI: (ctx: any) => ({
        workspaceTitle: 'Emergency Device Security',
        workspaceSubtitle: `INDRA identified your registered device on ${ctx.telecomOperator || 'telecom'} network.`,
        currentStepIndex: 1,
        totalSteps: 2,
        knownInformation: [
          { label: 'Device Model', value: ctx.telecomDeviceModel || 'Registered Handset', source: 'Telecom Equipment Registry' },
          { label: 'Linked Primary Number', value: ctx.telecomMobile || ctx.primaryMobile || 'Linked Mobile', source: 'Cellular Records' },
          { label: 'IMEI', value: ctx.telecomImei || 'Registered IMEI', source: 'CEIR Device Registry' },
        ],
        requiredFields: [
          {
            fieldId: 'incidentLocation',
            type: 'TEXT_INPUT',
            label: 'Incident Location / City',
            helperText: 'e.g. Indiranagar Metro Station, Bengaluru',
            required: true,
            defaultValue: 'Bengaluru Metro',
          },
        ],
        submitButtonText: 'Authorize Emergency Blacklist',
      }),
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
        reason: (ctx.reason as 'STOLEN' | 'LOST') || 'STOLEN',
        mobileNumber: (ctx.telecomMobile as string) || (ctx.primaryMobile as string),
        imei: ctx.telecomImei as string,
      }),
      nextStepId: null, // Single emergency atomic action
    },
  },
};
