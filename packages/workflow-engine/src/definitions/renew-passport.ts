import type { WorkflowContract } from '@indra/contracts';

export const RenewPassportWorkflow: WorkflowContract = {
  code: 'RENEW_PASSPORT',
  title: 'Passport Re-Issue Application',
  description: 'Prepares passport re-issue under the Passports Act 1967, calculates statutory fee, and issues official PSK appointment receipt.',
  category: 'TRAVEL',
  initialStepId: 'step_details',
  steps: {
    step_details: {
      stepId: 'step_details',
      title: 'Reissue Parameters & Validity Check',
      capabilityId: 'passport.check_status',
      dynamicUI: (ctx: any) => ({
        workspaceTitle: 'Passport Re-Issue Application (Form R-1)',
        workspaceSubtitle: 'Confirm renewal parameters before submission to the Ministry of External Affairs.',
        currentStepIndex: 1,
        totalSteps: 3,
        knownInformation: [
          { label: 'Passport Holder', value: ctx.citizenName || 'Verified Citizen', source: 'UIDAI & MEA PSP Record' },
          { label: 'Current Passport', value: ctx.passportNumberMasked || 'Z198****', source: 'Passport Seva Project' },
          { label: 'Regional Passport Office', value: ctx.rpoOffice || 'RPO Bengaluru', source: 'Jurisdiction Register' },
        ],
        requiredFields: [
          {
            fieldId: 'bookletType',
            type: 'SELECT_CHOICE',
            label: 'Passport Booklet Size',
            required: true,
            defaultValue: '36_PAGES',
            options: [
              { label: 'Standard 36 Pages (Regular Travelers)', value: '36_PAGES', hint: 'Standard validity 10 years' },
              { label: 'Jumbo 60 Pages (Frequent International Travelers)', value: '60_PAGES', hint: 'Recommended for extensive travel' },
            ],
          },
          {
            fieldId: 'schemeType',
            type: 'SELECT_CHOICE',
            label: 'Application Scheme',
            required: true,
            defaultValue: 'NORMAL',
            options: [
              { label: 'Normal Processing (₹1,500 fee, 7-10 working days dispatch)', value: 'NORMAL', hint: 'Standard verification timeline' },
              { label: 'Tatkaal Express Processing (₹3,500 fee, 1-3 working days dispatch)', value: 'TATKAAL', hint: 'Urgent biometric and dispatch processing' },
            ],
          },
          {
            fieldId: 'preferredSlot',
            type: 'SELECT_CHOICE',
            label: 'Preferred PSK Biometric Window',
            required: true,
            defaultValue: 'NEXT_AVAILABLE_MORNING',
            options: [
              { label: 'Next Available Morning Slot (10:00 AM - 12:00 PM)', value: 'NEXT_AVAILABLE_MORNING', hint: 'Passport Seva Kendra' },
              { label: 'Next Available Afternoon Slot (02:00 PM - 04:00 PM)', value: 'NEXT_AVAILABLE_AFTERNOON', hint: 'Passport Seva Kendra' },
            ],
          },
        ],
        submitButtonText: 'Confirm Details & Continue to Payment',
      }),
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
      }),
      onSuccess: (output: any, ctx: any) => ({
        passportNumberMasked: output.passportNumberMasked || 'Z198****',
        rpoOffice: output.rpoOffice || 'RPO Bengaluru',
        holderName: output.holderName || ctx.citizenName,
        feeAmountInr: ctx.schemeType === 'TATKAAL' ? 3500 : 1500,
        bookletType: ctx.bookletType || '36_PAGES',
        schemeType: ctx.schemeType || 'NORMAL',
      }),
      nextStepId: 'step_payment',
    },
    step_payment: {
      stepId: 'step_payment',
      title: 'Statutory Passport Reissue Fee',
      capabilityId: 'payments.process_fee',
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
        amountInr: (ctx.feeAmountInr as number) || (ctx.schemeType === 'TATKAAL' ? 3500 : 1500),
        purpose: `Passport Seva Project Re-Issue Fee (${ctx.schemeType || 'NORMAL'} Scheme, ${ctx.bookletType || '36_PAGES'})`,
        paymentMethod: 'UPI_BHARAT',
      }),
      onSuccess: (output: any) => ({
        paymentReference: output.referenceNo,
        receiptNumber: output.receiptNumber,
      }),
      nextStepId: 'step_issuance',
    },
    step_issuance: {
      stepId: 'step_issuance',
      title: 'Issue Official PSP Appointment & Tracking Slip',
      capabilityId: 'documents.issue_credential',
      inputMapper: (ctx) => ({
        citizenId: ctx.citizenId,
        title: 'Passport Re-Issue Application Receipt & PSK Slot (Form R-1)',
        documentType: 'PASSPORT_APPLICATION_RECEIPT',
        issuer: 'Ministry of External Affairs (Passport Seva Project)',
        documentNumber: `PSP-ARN-${Date.now().toString().slice(-8)}`,
        payload: {
          applicationType: 'REISSUE',
          scheme: ctx.schemeType || 'NORMAL',
          booklet: ctx.bookletType || '36_PAGES',
          feePaidInr: ctx.feeAmountInr || 1500,
          paymentReference: ctx.paymentReference,
          rpoOffice: ctx.rpoOffice || 'RPO Bengaluru',
          appointmentWindow: ctx.preferredSlot || 'NEXT_AVAILABLE_MORNING',
          status: 'APPOINTMENT_SCHEDULED_AWAITING_BIOMETRICS',
          instructions: 'Bring original current passport, Aadhaar, and this electronic ARN receipt to the PSK appointment.',
        },
      }),
      nextStepId: null,
    },
  },
};