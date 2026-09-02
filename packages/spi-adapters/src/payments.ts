import { getDb, schema } from '@indra/database';
import { eq } from 'drizzle-orm';

export interface ProcessPaymentInput {
  citizenId: string;
  applicationId?: string;
  amountInr: number;
  purpose: string;
  paymentMethod?: string;
  breakdown?: Record<string, number>;
  simulateFailure?: boolean;
}

export interface ProcessPaymentResult {
  paymentId: string;
  referenceNo: string;
  amountInr: number;
  purpose: string;
  status: 'SUCCESS' | 'FAILED';
  paidAt: string;
  receiptNumber: string;
}

export class PaymentsSpiAdapter {
  async processPayment(input: ProcessPaymentInput): Promise<ProcessPaymentResult> {
    const db = await getDb();
    const referenceNo = `TXN-INDRA-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const status = input.simulateFailure ? 'FAILED' : 'SUCCESS';

    const inserted = await db
      .insert(schema.payments)
      .values({
        citizenId: input.citizenId,
        applicationId: input.applicationId,
        amountInr: input.amountInr,
        purpose: input.purpose,
        status,
        referenceNo,
        paymentMethod: input.paymentMethod || 'UPI_BHARAT',
        breakdown: input.breakdown || { governmentFee: input.amountInr },
      })
      .returning();

    const payment = inserted[0];
    const receiptNumber = `RCPT-${referenceNo.slice(4)}`;

    return {
      paymentId: payment.id,
      referenceNo: payment.referenceNo,
      amountInr: payment.amountInr,
      purpose: payment.purpose,
      status: payment.status as 'SUCCESS' | 'FAILED',
      paidAt: payment.createdAt.toISOString(),
      receiptNumber,
    };
  }

  async refundPayment(referenceNo: string): Promise<{ success: boolean; refundedAt: string }> {
    const db = await getDb();
    await db
      .update(schema.payments)
      .set({ status: 'REFUNDED' })
      .where(eq(schema.payments.referenceNo, referenceNo));

    return {
      success: true,
      refundedAt: new Date().toISOString(),
    };
  }
}
