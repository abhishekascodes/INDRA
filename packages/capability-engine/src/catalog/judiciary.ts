import type { CapabilityContract } from '@indra/contracts';
import {
  JudiciaryCheckEcourtsStatusInputSchema,
  JudiciaryCheckEcourtsStatusOutputSchema,
  type JudiciaryCheckEcourtsStatusInput,
  type JudiciaryCheckEcourtsStatusOutput,
} from '@indra/contracts';
import { JudiciarySpiAdapter } from '@indra/spi-adapters';

const judiciaryAdapter = JudiciarySpiAdapter.getInstance();

export const JudiciaryCheckEcourtsStatusCapability: CapabilityContract<
  JudiciaryCheckEcourtsStatusInput,
  JudiciaryCheckEcourtsStatusOutput
> = {
  id: 'judiciary.check_ecourts_status',
  version: '1.0.0',
  domain: 'JUSTICE' as any,
  humanName: 'Check eCourts Litigation & Property Encumbrance Status',
  description:
    'Inquires the National Judicial Data Grid (NJDG) to verify pending civil suits, lis pendens notices, and debt recovery tribunals.',
  sideEffectClass: 'READ_ONLY',
  requiresHumanAuthorization: false,
  inputSchema: JudiciaryCheckEcourtsStatusInputSchema,
  outputSchema: JudiciaryCheckEcourtsStatusOutputSchema,
  execute: async (input) => {
    return judiciaryAdapter.checkEcourtsStatus(input);
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'LEGAL_CLEARANCE',
      entityId: input.queryValue,
      sourceType: 'FACT',
      sourceAuthority: 'e-Committee Supreme Court of India (NJDG)',
      confidence: 100,
    },
  ],
};
