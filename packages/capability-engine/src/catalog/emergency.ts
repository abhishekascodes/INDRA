import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import {
  EmergencyRequestDisasterReliefInputSchema,
  EmergencyRequestDisasterReliefOutputSchema,
} from '@indra/contracts';
import { EmergencySpiAdapter } from '@indra/spi-adapters';

const emergencyAdapter = EmergencySpiAdapter.getInstance();

export const EmergencyRequestDisasterReliefCapability: CapabilityContract<any, any> = {
  id: 'emergency.request_disaster_relief',
  version: '1.0.0',
  domain: 'EMERGENCY',
  humanName: 'Request Emergency Disaster Relief & Ex-Gratia',
  description: 'Submits statutory claim for NDRF/SDRF disaster financial compensation and emergency relief assistance.',
  sideEffectClass: 'REVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Disaster Relief Application',
    summary: 'Submit formal relief claim to the State Disaster Management Authority.',
    consequencesNotice: 'Initiates direct benefit transfer to the designated bank account following satellite damage assessment.',
    confirmationLabel: 'Submit Relief Claim',
  },
  inputSchema: EmergencyRequestDisasterReliefInputSchema,
  outputSchema: EmergencyRequestDisasterReliefOutputSchema,
  execute: async (input) => {
    return emergencyAdapter.requestDisasterRelief(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'DISASTER_RELIEF_CLAIM',
      entityId: output.reliefClaimNo,
      sourceType: 'ACTION',
      sourceAuthority: 'National Disaster Management Authority (NDMA / SDRF)',
      confidence: 100,
    },
  ],
  reviewMetadata: {
    disclosures: [
      {
        recipient: 'State Disaster Management Authority (SDMA / NDMA)',
        role: 'Disaster Relief Authority',
        categories: ['PROPERTY', 'BANKING'],
        purpose: 'Direct Benefit Transfer for disaster relief compensation',
      },
    ],
    statutoryDeclarations: [
      {
        id: 'DECL_DISASTER_LOSS',
        text: 'I hereby declare that the described property/crop loss was directly caused by the notified natural disaster.',
        required: true,
        accepted: true,
      },
    ],
    consequences: {
      isIrreversible: false,
      severity: 'MEDIUM',
      warning: 'Claim can be amended or withdrawn prior to district collector disbursement sanction.',
      downstreamUpdates: ['Disaster relief ledger updated', 'SDRF grant allocated'],
      compensationAvailable: true,
    },
  },
};
