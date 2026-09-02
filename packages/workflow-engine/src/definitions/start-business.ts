import type { WorkflowContract } from '@indra/contracts';

export const StartBusinessWorkflow: WorkflowContract = {
  code: 'START_BUSINESS',
  title: 'Incorporate Enterprise in India',
  description: 'One-stop corporate setup: MCA name approval, incorporation certificate, PAN, GSTIN, and Udyam MSME credentials.',
  category: 'BUSINESS',
  initialStepId: 'step_details',
  steps: {
    step_details: {
      stepId: 'step_details',
      title: 'Company Details & Structure',
      capabilityId: 'business.reserve_name',
      dynamicUI: () => ({
        workspaceTitle: 'Set Up Your Enterprise',
        workspaceSubtitle: 'Tell INDRA about the company you wish to establish.',
        currentStepIndex: 1,
        totalSteps: 3,
        knownInformation: [
          { label: 'Director / Founder', value: 'Priya Sharma', source: 'Verified Aadhaar' },
          { label: 'Director PAN', value: 'ABCPS****F', source: 'Income Tax Records' },
        ],
        requiredFields: [
          {
            fieldId: 'companyName',
            type: 'TEXT_INPUT',
            label: 'Proposed Legal Name',
            helperText: 'e.g. Apex AI Innovations Private Limited',
            required: true,
          },
          {
            fieldId: 'entityType',
            type: 'SELECT_CHOICE',
            label: 'Corporate Structure',
            required: true,
            defaultValue: 'PRIVATE_LIMITED',
            options: [
              { label: 'Private Limited Company (Pvt Ltd)', value: 'PRIVATE_LIMITED', hint: 'Most popular for startups and fundraising' },
              { label: 'Limited Liability Partnership (LLP)', value: 'LLP', hint: 'Ideal for professional services and lower compliance' },
              { label: 'Sole Proprietorship', value: 'PROPRIETORSHIP', hint: 'Single-owner unlisted business' },
            ],
          },
        ],
        submitButtonText: 'Verify Name & Proceed',
      }),
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
        proposedName: ctx.companyName || 'Apex AI Innovations Private Limited',
        entityType: ctx.entityType || 'PRIVATE_LIMITED',
      }),
      nextStepId: 'step_payment',
    },
    step_payment: {
      stepId: 'step_payment',
      title: 'Statutory MCA & Processing Fee',
      capabilityId: 'payments.process_fee',
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
        amountInr: 1000,
        purpose: 'MCA Name Reservation & SPICe+ Processing Fee',
        paymentMethod: 'UPI_BHARAT',
      }),
      nextStepId: 'step_incorporate',
    },
    step_incorporate: {
      stepId: 'step_incorporate',
      title: 'Incorporate & Issue Verifiable Credentials',
      capabilityId: 'business.incorporate',
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
        companyName: ctx.companyName || 'Apex AI Innovations Private Limited',
        entityType: ctx.entityType || 'PRIVATE_LIMITED',
        registeredAddress: {
          line1: 'Flat 402, Shanti Heights, Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038',
        },
        capitalInr: 100000,
      }),
      nextStepId: null, // End of workflow
    },
  },
};
