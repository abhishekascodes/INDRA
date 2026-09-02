import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { TelecomSpiAdapter } from '@indra/spi-adapters';

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
