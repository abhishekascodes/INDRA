import { getDb, schema, eq } from '@indra/database';

export interface RequestDisasterReliefInput {
  citizenId: string;
  disasterType: 'FLOOD' | 'CYCLONE' | 'DROUGHT' | 'EARTHQUAKE';
  lossDescription: string;
  bankAccountMasked: string;
}

export interface RequestDisasterReliefOutput {
  success: boolean;
  reliefClaimNo: string;
  assessedAssistanceInr: number;
  status: string;
  disbursementSchedule: string;
  message: string;
}

export class EmergencySpiAdapter {
  private static instance: EmergencySpiAdapter | null = null;

  public static getInstance(): EmergencySpiAdapter {
    if (!EmergencySpiAdapter.instance) {
      EmergencySpiAdapter.instance = new EmergencySpiAdapter();
    }
    return EmergencySpiAdapter.instance;
  }

  async requestDisasterRelief(input: RequestDisasterReliefInput): Promise<RequestDisasterReliefOutput> {
    const db = await getDb();
    const claimNo = `NDMA-RELIEF-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const assessedAmount = input.disasterType === 'FLOOD' ? 25000 : 18000;

    await db.insert(schema.spiDisasterRelief).values({
      citizenId: input.citizenId,
      reliefClaimNo: claimNo,
      disasterType: input.disasterType,
      lossDescription: input.lossDescription,
      assessedAssistanceInr: assessedAmount,
      status: 'APPROVED',
      disbursementSchedule: 'Direct Benefit Transfer (DBT) within 72 hours to ' + input.bankAccountMasked,
    });

    return {
      success: true,
      reliefClaimNo: claimNo,
      assessedAssistanceInr: assessedAmount,
      status: 'APPROVED_FOR_DBT',
      disbursementSchedule: 'Disbursement within 72 business hours under State Disaster Response Fund guidelines',
      message: `Emergency financial assistance of INR ${assessedAmount.toLocaleString('en-IN')} approved for ${input.disasterType.toLowerCase()} relief.`,
    };
  }
}
