import { getDb, schema, eq } from '@indra/database';

export interface ApplyUdidCardInput {
  citizenId: string;
  disabilityType: string;
  disabilityPercentage: number;
  medicalHospitalName: string;
}

export interface ApplyUdidCardOutput {
  success: boolean;
  udidEnrollmentNo: string;
  medicalBoardSlot: string;
  status: string;
  message: string;
}

export class AccessibilitySpiAdapter {
  private static instance: AccessibilitySpiAdapter | null = null;

  public static getInstance(): AccessibilitySpiAdapter {
    if (!AccessibilitySpiAdapter.instance) {
      AccessibilitySpiAdapter.instance = new AccessibilitySpiAdapter();
    }
    return AccessibilitySpiAdapter.instance;
  }

  async applyUdidCard(input: ApplyUdidCardInput): Promise<ApplyUdidCardOutput> {
    const db = await getDb();
    const enrollmentNo = `UDID-SWAV-${Date.now().toString().slice(-8)}`;
    const slot = 'District Hospital Medical Board - Next Tuesday 10:30 AM';

    await db.insert(schema.spiDisabilities).values({
      citizenId: input.citizenId,
      udidEnrollmentNo: enrollmentNo,
      disabilityType: input.disabilityType,
      disabilityPercentage: input.disabilityPercentage,
      medicalHospitalName: input.medicalHospitalName,
      medicalBoardSlot: slot,
      status: 'MEDICAL_SCHEDULED',
    });

    return {
      success: true,
      udidEnrollmentNo: enrollmentNo,
      medicalBoardSlot: slot,
      status: 'ENROLLED_ASSESSMENT_SCHEDULED',
      message: `UDID Swavlamban application ${enrollmentNo} registered. Medical board assessment scheduled at ${input.medicalHospitalName}.`,
    };
  }
}
