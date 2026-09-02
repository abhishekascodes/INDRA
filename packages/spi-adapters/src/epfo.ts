import { getDb, schema } from '@indra/database';
import { eq, and } from 'drizzle-orm';

export interface EpfoAccountSummary {
  id: string;
  uan: string;
  memberId: string;
  establishmentName: string;
  joiningDate: string;
  exitDate: string | null;
  pfBalance: number;
  pensionBalance: number;
  status: string;
}

export interface SubmitTransferClaimInput {
  citizenId: string;
  sourceMemberId: string;
  targetMemberId: string;
  authorizedByCitizen: boolean;
}

export interface SubmitTransferClaimResult {
  claimTrackingId: string;
  sourceEstablishment: string;
  targetEstablishment: string;
  transferredAmountInr: number;
  status: 'SUBMITTED' | 'UNDER_FIELD_VERIFICATION' | 'APPROVED';
  estimatedSettlementDays: number;
}

export class EpfoSpiAdapter {
  async getAccountsForCitizen(citizenId: string): Promise<EpfoAccountSummary[]> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.spiEpfoAccounts)
      .where(eq(schema.spiEpfoAccounts.citizenId, citizenId));

    return rows.map((r) => ({
      id: r.id,
      uan: r.uan,
      memberId: r.memberId,
      establishmentName: r.establishmentName,
      joiningDate: r.joiningDate,
      exitDate: r.exitDate,
      pfBalance: r.pfBalance,
      pensionBalance: r.pensionBalance,
      status: r.status,
    }));
  }

  async findDormantAccounts(citizenId: string): Promise<EpfoAccountSummary[]> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.spiEpfoAccounts)
      .where(
        and(
          eq(schema.spiEpfoAccounts.citizenId, citizenId),
          eq(schema.spiEpfoAccounts.status, 'DORMANT')
        )
      );

    return rows.map((r) => ({
      id: r.id,
      uan: r.uan,
      memberId: r.memberId,
      establishmentName: r.establishmentName,
      joiningDate: r.joiningDate,
      exitDate: r.exitDate,
      pfBalance: r.pfBalance,
      pensionBalance: r.pensionBalance,
      status: r.status,
    }));
  }

  async submitTransferClaim(
    input: SubmitTransferClaimInput
  ): Promise<SubmitTransferClaimResult> {
    if (!input.authorizedByCitizen) {
      throw new Error('Citizen authorization is required to initiate EPF consolidation');
    }

    const db = await getDb();
    const sourceRows = await db
      .select()
      .from(schema.spiEpfoAccounts)
      .where(
        and(
          eq(schema.spiEpfoAccounts.citizenId, input.citizenId),
          eq(schema.spiEpfoAccounts.memberId, input.sourceMemberId)
        )
      );

    const targetRows = await db
      .select()
      .from(schema.spiEpfoAccounts)
      .where(
        and(
          eq(schema.spiEpfoAccounts.citizenId, input.citizenId),
          eq(schema.spiEpfoAccounts.memberId, input.targetMemberId)
        )
      );

    if (sourceRows.length === 0 || targetRows.length === 0) {
      throw new Error('Source or target EPF member account not found');
    }

    const source = sourceRows[0];
    const target = targetRows[0];
    const amountToTransfer = source.pfBalance;

    // Simulate transfer by updating ledger
    await db
      .update(schema.spiEpfoAccounts)
      .set({
        status: 'TRANSFERRED',
        pfBalance: 0,
      })
      .where(eq(schema.spiEpfoAccounts.id, source.id));

    await db
      .update(schema.spiEpfoAccounts)
      .set({
        pfBalance: target.pfBalance + amountToTransfer,
      })
      .where(eq(schema.spiEpfoAccounts.id, target.id));

    const claimTrackingId = `EPFO-CLM-${Date.now().toString().slice(-6)}`;

    return {
      claimTrackingId,
      sourceEstablishment: source.establishmentName,
      targetEstablishment: target.establishmentName,
      transferredAmountInr: amountToTransfer,
      status: 'SUBMITTED',
      estimatedSettlementDays: 3,
    };
  }
}
