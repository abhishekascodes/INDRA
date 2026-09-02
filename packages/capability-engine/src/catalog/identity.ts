import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { IdentitySpiAdapter } from '@indra/spi-adapters';

const identityAdapter = new IdentitySpiAdapter();

export const IdentityVerifyCredentialCapability: CapabilityContract<
  {
    citizenId: string;
    credentialType: 'AADHAAR' | 'PAN' | 'DRIVING_LICENCE' | 'PASSPORT';
  },
  any
> = {
  id: 'identity.verify_credential',
  version: '1.0.0',
  domain: 'IDENTITY',
  humanName: 'Verify Public Credential',
  description: 'Verifies synthetic credential status and holder metadata from official registries.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    credentialType: z.enum(['AADHAAR', 'PAN', 'DRIVING_LICENCE', 'PASSPORT']),
  }),
  outputSchema: z.object({
    verified: z.boolean(),
    holderName: z.string(),
    identifierMasked: z.string(),
    status: z.string(),
    metadata: z.record(z.any()),
  }),
  execute: async (input) => {
    const res = await identityAdapter.verifyCredential(input);
    if (!res) throw new Error(`Credential ${input.credentialType} not found`);
    return res;
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'CREDENTIAL_VERIFICATION',
      entityId: `${input.citizenId}:${input.credentialType}`,
      sourceType: 'FACT',
      sourceAuthority: 'Public Credential Registry',
      confidence: 100,
    },
  ],
};

export const IdentityUpdatePanNameCapability: CapabilityContract<
  {
    citizenId: string;
    correctedName: string;
    supportingAadhaarNumber: string;
  },
  any
> = {
  id: 'identity.update_pan_name',
  version: '1.0.0',
  domain: 'IDENTITY',
  humanName: 'Correct PAN Name via Verified Aadhaar',
  description: 'Synchronizes your legal name on PAN with your primary Aadhaar record.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm PAN Record Correction',
    summary: 'Update legal name on PAN from "Priya S." to "Priya Sharma".',
    consequencesNotice: 'This will align your tax records with your Aadhaar and passport ground truth.',
    confirmationLabel: 'Authorize Correction',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    correctedName: z.string(),
    supportingAadhaarNumber: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    newHolderName: z.string(),
  }),
  execute: async (input) => {
    return identityAdapter.updatePanName(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'PAN_CORRECTION',
      entityId: input.citizenId,
      sourceType: 'ACTION',
      sourceAuthority: 'Income Tax Department (NSDL/UTIITSL)',
      confidence: 100,
    },
  ],
};
