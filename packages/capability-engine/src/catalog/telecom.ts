import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { TelecomSpiAdapter } from '@indra/spi-adapters';
import { getDb, schema } from '@indra/database';
import { eq } from 'drizzle-orm';

const telecomAdapter = new TelecomSpiAdapter();

export const TelecomBlockStolenDeviceCapability: CapabilityContract<
  {
    citizenId: string;
    mobileNumber?: string;
    imei?: string;
    reason: 'STOLEN' | 'LOST';
  },
  any
> = {
  id: 'telecom.block_stolen_device',
  version: '1.0.0',
  domain: 'TELECOM',
  humanName: 'Emergency Mobile & SIM Protection',
  description: 'Initiates immediate CEIR blacklisting of the handset IMEI and blocks linked SIM cards.',
  sideEffectClass: 'COMPENSATABLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Emergency Handset & SIM Lock',
    summary: 'Block handset IMEI and deactivate SIM connection across all Indian networks.',
    consequencesNotice: 'The device will be instantly rendered unusable across all Indian telecom operators and an electronic police report receipt will be generated.',
    confirmationLabel: 'Block Device Now',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    mobileNumber: z.string().optional(),
    imei: z.string().optional(),
    reason: z.enum(['STOLEN', 'LOST']),
  }),
  outputSchema: z.object({
    deviceBlocked: z.boolean(),
    imei: z.string(),
    deviceModel: z.string(),
    ceirTicketNumber: z.string(),
    simBlocked: z.boolean(),
    operator: z.string(),
    policeAcknowledgmentReceipt: z.string(),
  }),
  execute: async (input) => {
    return telecomAdapter.blockStolenDevice(input);
  },
  compensate: async (input, output) => {
    const db = await getDb();
    if (output?.imei) {
      await db
        .update(schema.spiTelecomRecords)
        .set({ status: 'ACTIVE', reportedStolenAt: null })
        .where(eq(schema.spiTelecomRecords.imei, output.imei));
    }
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'CEIR_BLOCK_REQUEST',
      entityId: output.ceirTicketNumber,
      sourceType: 'ACTION',
      sourceAuthority: 'Central Equipment Identity Register (DoT)',
      confidence: 100,
    },
  ],
};

export const TelecomInquireRegisteredSimsCapability: CapabilityContract<any, any> = {
  id: 'telecom.inquire_registered_sims',
  version: '1.0.0',
  domain: 'TELECOM',
  humanName: 'Inquire Registered SIM Cards (TAFCOP)',
  description: 'Audits Telecom Analytics for Fraud management and Consumer Protection (TAFCOP) for all mobile numbers issued under citizen identity.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: z.object({
    citizenId: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    totalActiveConnections: z.number(),
    connections: z.array(
      z.object({
        mobileMasked: z.string(),
        operator: z.string(),
        activationDate: z.string(),
        isFlaggedUnauthorized: z.boolean(),
      })
    ),
    message: z.string(),
  }),
  execute: async (input) => {
    return telecomAdapter.inquireRegisteredSims(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'TAFCOP_SIM_AUDIT',
      entityId: input.citizenId,
      sourceType: 'FACT',
      sourceAuthority: 'Department of Telecommunications (TAFCOP Portal)',
      confidence: 100,
    },
  ],
};

