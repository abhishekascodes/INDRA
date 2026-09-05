import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { DigiLockerSpiAdapter } from '@indra/spi-adapters';

const digiLockerAdapter = new DigiLockerSpiAdapter();

export const DocumentsFetchDigiLockerCapability: CapabilityContract<
  {
    citizenId: string;
    documentType: string;
    title: string;
    issuerId: string;
    parameters: Record<string, string>;
  },
  any
> = {
  id: 'documents.fetch_digilocker',
  version: '1.0.0',
  domain: 'DOCUMENTS',
  humanName: 'Fetch Verifiable Document from DigiLocker',
  description: 'Pulls authentic digital certificate or document from official issuer via DigiLocker URI.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    documentType: z.string(),
    title: z.string(),
    issuerId: z.string(),
    parameters: z.record(z.string()),
  }),
  outputSchema: z.object({
    documentId: z.string(),
    title: z.string(),
    documentType: z.string(),
    issuer: z.string(),
    documentNumber: z.string(),
    verificationStatus: z.string(),
    uri: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    return digiLockerAdapter.fetchFromIssuer(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'DIGILOCKER_DOCUMENT',
      entityId: output.documentId,
      sourceType: 'FACT',
      sourceAuthority: input.issuerId,
      confidence: 100,
    },
  ],
};

export const DocumentsIssueCredentialCapability: CapabilityContract<
  {
    citizenId: string;
    title: string;
    documentType: string;
    issuer: string;
    documentNumber: string;
    payload: Record<string, unknown>;
  },
  any
> = {
  id: 'documents.issue_credential',
  version: '1.0.0',
  domain: 'DOCUMENTS',
  humanName: 'Issue Sovereign Verifiable Credential',
  description: 'Issues a cryptographically verifiable sovereign digital credential to the citizen vault.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  requiredPermissions: ['CREDENTIAL_ISSUANCE'],
  inputSchema: z.object({
    citizenId: z.string(),
    title: z.string(),
    documentType: z.string(),
    issuer: z.string(),
    documentNumber: z.string(),
    payload: z.record(z.any()),
  }),
  outputSchema: z.object({
    documentId: z.string(),
    title: z.string(),
    documentType: z.string(),
    issuer: z.string(),
    documentNumber: z.string(),
    verificationStatus: z.string(),
    uri: z.string(),
    provenance: z.record(z.any()),
  }),
  execute: async (input) => {
    return digiLockerAdapter.issueCredential(input);
  },
  compensate: async (input) => {
    // Reversal logic for issued credential revocation
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'VERIFIABLE_CREDENTIAL',
      entityId: input.documentNumber,
      sourceType: 'FACT',
      sourceAuthority: input.issuer,
      confidence: 100,
    },
  ],
};

export const DocumentsRevokeCredentialCapability: CapabilityContract<any, any> = {
  id: 'documents.revoke_credential',
  version: '1.0.0',
  domain: 'DOCUMENTS',
  humanName: 'Revoke Sovereign Document Credential',
  description: 'Revokes an active credential in the citizen vault, notifying issuing authorities and updating verification registries.',
  sideEffectClass: 'IRREVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Credential Revocation',
    summary: 'Permanently revoke selected credential from your active sovereign vault.',
    consequencesNotice: 'This action is irreversible. The credential status will be broadcast as REVOKED across all relying party verifiers.',
    confirmationLabel: 'Revoke Credential',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    documentId: z.string(),
    reason: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    documentId: z.string(),
    status: z.string(),
    revokedAt: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return digiLockerAdapter.revokeCredential(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'CREDENTIAL_REVOCATION',
      entityId: input.documentId,
      sourceType: 'ACTION',
      sourceAuthority: 'DigiLocker National Trust Framework',
      confidence: 100,
    },
  ],
};

export const DocumentsVerifyDocHashCapability: CapabilityContract<any, any> = {
  id: 'documents.verify_doc_hash',
  version: '1.0.0',
  domain: 'DOCUMENTS',
  humanName: 'Verify Document Cryptographic Integrity',
  description: 'Validates SHA-256 hash of a vault document against the issuing authority’s published cryptographic ledger.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
    documentId: z.string(),
    hashAlgorithm: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    documentId: z.string(),
    provenanceMatch: z.boolean(),
    issuerAuthority: z.string(),
    merkleRoot: z.string(),
    message: z.string(),
  }),
  execute: async (input) => {
    return digiLockerAdapter.verifyDocHash(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'DOCUMENT_CRYPTO_VERIFICATION',
      entityId: input.documentId,
      sourceType: 'FACT',
      sourceAuthority: output.issuerAuthority,
      confidence: 100,
    },
  ],
};

