import { z } from 'zod';
import type { CapabilityContract } from '@indra/contracts';
import { PaymentsSpiAdapter } from '@indra/spi-adapters';
import { getDb, schema } from '@indra/database';
import { eq } from 'drizzle-orm';

const paymentsAdapter = new PaymentsSpiAdapter();

export const PaymentsProcessFeeCapability: CapabilityContract<
  {
    citizenId: string;
    applicationId?: string;
    amountInr: number;
    purpose: string;
    paymentMethod?: string;
    breakdown?: Record<string, number>;
  },
  any
> = {
  id: 'payments.process_fee',
  version: '1.0.0',
  domain: 'PAYMENTS',
  humanName: 'Process Government Fee Payment',
  description: 'Executes electronic statutory fee payment and returns official receipt.',
  sideEffectClass: 'IRREVERSIBLE',
  requiresHumanAuthorization: true,
  humanAuthorizationPrompt: {
    title: 'Confirm Payment',
    summary: 'Pay statutory processing fee via Bharat BillPay / UPI.',
    consequencesNotice: 'Amount will be deducted and an official government fee challan receipt will be issued.',
    confirmationLabel: 'Pay Now',
  },
  inputSchema: z.object({
    citizenId: z.string(),
    applicationId: z.string().optional(),
    amountInr: z.number().min(1),
    purpose: z.string(),
    paymentMethod: z.string().default('UPI_BHARAT'),
    breakdown: z.record(z.number()).optional(),
  }),
  outputSchema: z.object({
    paymentId: z.string(),
    referenceNo: z.string(),
    amountInr: z.number(),
    status: z.enum(['SUCCESS', 'FAILED', 'REFUNDED']),
    receiptNumber: z.string(),
  }),
  execute: async (input) => {
    return paymentsAdapter.processPayment(input);
  },
  compensate: async (input, output) => {
    const db = await getDb();
    if (output?.paymentId) {
      await db
        .update(schema.payments)
        .set({ status: 'REFUNDED' })
        .where(eq(schema.payments.id, output.paymentId));
    }
  },
  provenanceGenerator: (input, output) => [
    {
      entityType: 'PAYMENT_RECEIPT',
      entityId: output.referenceNo,
      sourceType: 'ACTION',
      sourceAuthority: 'Bharat BillPay System',
      confidence: 100,
    },
  ],
};
