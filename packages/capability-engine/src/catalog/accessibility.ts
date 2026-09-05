import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import {
  AccessibilityApplyUdidCardInputSchema,
  AccessibilityApplyUdidCardOutputSchema,
} from '@indra/contracts';
import { AccessibilitySpiAdapter } from '@indra/spi-adapters';

const accessibilityAdapter = AccessibilitySpiAdapter.getInstance();

export const AccessibilityApplyUdidCardCapability: CapabilityContract<any, any> = {
  id: 'accessibility.apply_udid_card',
  version: '1.0.0',
  domain: 'ACCESSIBILITY',
  humanName: 'Apply for UDID Disability Certificate (Swavlamban)',
  description: 'Submits application for Unique Disability ID (UDID) card and schedules district medical board assessment.',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm UDID Card Application',
    summary: 'Enroll citizen profile for national Swavlamban Unique Disability ID.',
    consequencesNotice: 'Schedules physical evaluation with government district medical board.',
    confirmationLabel: 'Submit UDID Application',
  },
  inputSchema: AccessibilityApplyUdidCardInputSchema,
  outputSchema: AccessibilityApplyUdidCardOutputSchema,
  execute: async (input) => {
    return accessibilityAdapter.applyUdidCard(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'UDID_APPLICATION',
      entityId: output.udidEnrollmentNo,
      sourceType: 'ACTION',
      sourceAuthority: 'Department of Empowerment of Persons with Disabilities (DEPwD)',
      confidence: 100,
    },
  ],
  reviewMetadata: {
    disclosures: [
      {
        recipient: 'DEPwD / Swavlamban',
        role: 'Disability Certificate Authority',
        categories: ['HEALTH', 'IDENTITY'],
        purpose: 'UDID card assessment and issuance',
      },
    ],
    statutoryDeclarations: [
      {
        id: 'AUTH_RPWD_ACC',
        text: 'I confirm that the medical documents submitted are authentic and issued by registered practitioners under RPwD Act 2016.',
        required: true,
        accepted: true,
      },
    ],
    consequences: {
      isIrreversible: false,
      severity: 'LOW',
      warning: 'Assessment slot can be rescheduled prior to medical board convening.',
      downstreamUpdates: ['Disability registry updated', 'Swavlamban card dispatched'],
      compensationAvailable: false,
    },
  },
};
