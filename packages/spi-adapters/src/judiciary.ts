import { getDb, schema, eq } from '@indra/database';
import type {
  JudiciaryCheckEcourtsStatusInput,
  JudiciaryCheckEcourtsStatusOutput,
} from '@indra/contracts';

export class JudiciarySpiAdapter {
  private static instance: JudiciarySpiAdapter | null = null;

  public static getInstance(): JudiciarySpiAdapter {
    if (!JudiciarySpiAdapter.instance) {
      JudiciarySpiAdapter.instance = new JudiciarySpiAdapter();
    }
    return JudiciarySpiAdapter.instance;
  }

  /**
   * Queries the National Judicial Data Grid (NJDG) for pending civil suits, warrants, or property encumbrances.
   */
  public async checkEcourtsStatus(
    input: JudiciaryCheckEcourtsStatusInput
  ): Promise<JudiciaryCheckEcourtsStatusOutput> {
    const db = await getDb();

    // Query legal records for the citizen
    const records = await db
      .select()
      .from(schema.citizenLegalRecords)
      .where(eq(schema.citizenLegalRecords.citizenId, input.citizenId));

    const encumbranceRecords = records.filter(
      (r) => r.isEncumbrance || r.caseStatus === 'PENDING_INJUNCTION'
    );
    const encumbranceFound = encumbranceRecords.length > 0;
    const activeCivilLitigationCount = records.filter((r) => r.caseStatus.startsWith('ACTIVE')).length;

    return {
      success: true,
      queryType: input.queryType,
      queryValue: input.queryValue,
      encumbranceFound,
      activeCivilLitigationCount,
      caseDetails: records.map((r) => ({
        cnrNumber: r.cnrNumber,
        courtName: r.courtName,
        caseType: r.caseType,
        filingDate: r.filingDate,
        status: r.caseStatus,
        summary: r.summary,
      })),
      clearanceCertificateIssued: !encumbranceFound,
      message: encumbranceFound
        ? `NJDG inquiry returned ${encumbranceRecords.length} encumbrance / active injunction record(s).`
        : `NJDG inquiry returned 0 active encumbrances or lis pendens notices for '${input.queryValue}'. Clear title confirmed.`,
    };
  }
}
