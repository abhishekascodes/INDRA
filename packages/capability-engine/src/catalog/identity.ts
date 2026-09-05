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

export const IdentityUpdateAadhaarAddressCapability: CapabilityContract<
  {
    citizenId: string;
    newAddress: string;
    city: string;
    state: string;
    pincode: string;
  },
  any
> = {
  id: 'identity.update_aadhaar_address',
  version: '1.0.0',
  domain: 'IDENTITY',
  humanName: 'Update Aadhaar Residential Address',
  description: 'Synchronizes residential address on UIDAI Central Identities Data Repository.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  requiredPermissions: ['UIDAI_ADDRESS_UPDATE', 'IDENTITY_SYNC'],
  inputSchema: z.object({
    citizenId: z.string(),
    newAddress: z.string().min(5),
    city: z.string(),
    state: z.string(),
    pincode: z.string().length(6),
  }),
  outputSchema: z.object({
    updated: z.boolean(),
    maskedAadhaar: z.string(),
    city: z.string(),
    state: z.string(),
    pincode: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    return identityAdapter.updateAadhaarAddress(input);
  },
  compensate: async (input) => {
    // Reversal logic for UIDAI address update
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'AADHAAR_ADDRESS_UPDATE',
      entityId: input.citizenId,
      sourceType: 'FACT',
      sourceAuthority: 'Unique Identification Authority of India (UIDAI)',
      confidence: 100,
    },
  ],
};

export const IdentityTransferVoterConstituencyCapability: CapabilityContract<
  {
    citizenId: string;
    newConstituency: string;
    state: string;
    newAddress: string;
  },
  any
> = {
  id: 'identity.transfer_voter_constituency',
  version: '1.0.0',
  domain: 'IDENTITY',
  humanName: 'Transfer Voter Assembly Constituency',
  description: 'Transposes voter registration to new assembly constituency via ECI Form 8.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  requiredPermissions: ['ECI_ELECTORAL_ROLL_UPDATE'],
  inputSchema: z.object({
    citizenId: z.string(),
    newConstituency: z.string(),
    state: z.string(),
    newAddress: z.string(),
  }),
  outputSchema: z.object({
    formNumber: z.string(),
    status: z.string(),
    trackingRef: z.string(),
    newConstituency: z.string(),
    state: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    return identityAdapter.transferVoterConstituency(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'VOTER_ROLL_TRANSPOSITION',
      entityId: input.citizenId,
      sourceType: 'FACT',
      sourceAuthority: 'Election Commission of India (ECI)',
      confidence: 100,
    },
  ],
};

export const IdentityLockBiometricsCapability: CapabilityContract<any, any> = {
  id: 'identity.lock_biometrics',
  version: '1.0.0',
  domain: 'IDENTITY',
  humanName: 'Lock or Unlock Aadhaar Biometrics',
  description: 'Cryptographically locks biometric authentication at UIDAI to prevent identity hijacking and unauthorized authentication.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Biometric Security Setting',
    summary: 'Change UIDAI biometric locking status for your sovereign identity.',
    consequencesNotice: 'When locked, no third party or banking institution can verify fingerprint or iris until unlocked.',
    confirmationLabel: 'Confirm Biometric Lock',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    action: z.enum(['LOCK', 'UNLOCK']),
    biometricTypes: z.array(z.enum(['FINGERPRINT', 'IRIS', 'FACE'])).optional(),
    unlockDurationMinutes: z.number().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    status: z.string(),
    referenceId: z.string(),
    effectiveUntil: z.string().optional(),
    message: z.string(),
  }),
  execute: async (input) => {
    return identityAdapter.lockBiometrics(input);
  },
  compensate: async (input) => {
    // If locked, unlock to rollback
    await identityAdapter.lockBiometrics({
      citizenId: input.citizenId,
      action: input.action === 'LOCK' ? 'UNLOCK' : 'LOCK',
    });
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'AADHAAR_BIOMETRIC_LOCK',
      entityId: output.referenceId,
      sourceType: 'FACT',
      sourceAuthority: 'Unique Identification Authority of India (UIDAI)',
      confidence: 100,
    },
  ],
};

export const IdentityInquireMaskAadhaarCapability: CapabilityContract<any, any> = {
  id: 'identity.inquire_mask_aadhaar',
  version: '1.0.0',
  domain: 'IDENTITY',
  humanName: 'Generate Official Masked Aadhaar & VID',
  description: 'Issues a privacy-preserving masked Aadhaar copy and 16-digit Virtual ID (VID) for zero-knowledge verification.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    purpose: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    maskedAadhaar: z.string(),
    vid: z.string(),
    qrDigest: z.string(),
    generatedAt: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return identityAdapter.inquireMaskAadhaar(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'MASKED_AADHAAR_ARTIFACT',
      entityId: output.vid,
      sourceType: 'FACT',
      sourceAuthority: 'Unique Identification Authority of India (UIDAI)',
      confidence: 100,
    },
  ],
};
