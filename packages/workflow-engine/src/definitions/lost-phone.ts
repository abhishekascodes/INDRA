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
      dynamicUI: () => ({
        workspaceTitle: 'Emergency Device Security',
        workspaceSubtitle: 'INDRA identified your registered device on Airtel network.',
        currentStepIndex: 1,
        totalSteps: 2,
        knownInformation: [
          { label: 'Device Model', value: 'OnePlus 11 5G (Titan Black, 256GB)', source: 'Telecom Equipment Registry' },
          { label: 'Linked Primary Number', value: '+91 98765 43210', source: 'Aadhaar Linked Mobile' },
          { label: 'IMEI', value: '864920051234567', source: 'CEIR Device Registry' },
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
        reason: 'STOLEN',
        mobileNumber: '+91 98765 43210',
        imei: '864920051234567',
      }),
      nextStepId: null, // Single emergency atomic action
    },
  },
};
