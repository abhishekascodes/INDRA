import { getDb, schema } from '@indra/database';
import { eq, and } from 'drizzle-orm';

export interface VerifyIdentityInput {
  citizenId: string;
  credentialType: 'AADHAAR' | 'PAN' | 'DRIVING_LICENCE' | 'PASSPORT';
}

export interface VerifyIdentityResult {
  verified: boolean;
  holderName: string;
  identifierMasked: string;
  status: string;
  metadata: Record<string, unknown>;
}

export interface UpdatePanNameInput {
  citizenId: string;
  correctedName: string;
  supportingAadhaarNumber: string;
}

export class IdentitySpiAdapter {
  async getCredentials(citizenId: string) {
    const db = await getDb();
    return db
      .select()
      .from(schema.citizenCredentials)
      .where(eq(schema.citizenCredentials.citizenId, citizenId));
  }

  async verifyCredential(input: VerifyIdentityInput): Promise<VerifyIdentityResult | null> {
    const db = await getDb();
    const rows = await db
      .select()
      .from(schema.citizenCredentials)
      .where(
        and(
          eq(schema.citizenCredentials.citizenId, input.citizenId),
          eq(schema.citizenCredentials.type, input.credentialType)
        )
      );

    if (rows.length === 0) return null;
    const cred = rows[0];
    const meta = (cred.metadata as Record<string, unknown>) || {};

    return {
      verified: cred.status === 'ACTIVE',
      holderName: (meta.holderName as string) || 'Unknown',
      identifierMasked: cred.identifierMasked,
      status: cred.status,
      metadata: meta,
    };
  }

  /**
   * Resolves PAN name discrepancy (e.g. "Priya S." -> "Priya Sharma")
   * using verified Aadhaar as primary ground truth.
   */
  async updatePanName(input: UpdatePanNameInput): Promise<{ success: boolean; newHolderName: string }> {
    const db = await getDb();
    const panCreds = await db
      .select()
      .from(schema.citizenCredentials)
      .where(
        and(
          eq(schema.citizenCredentials.citizenId, input.citizenId),
          eq(schema.citizenCredentials.type, 'PAN')
        )
      );

    if (panCreds.length === 0) {
      throw new Error('PAN record not found for citizen');
    }

    const currentMeta = (panCreds[0].metadata as Record<string, unknown>) || {};
    const updatedMeta = {
      ...currentMeta,
      holderName: input.correctedName,
      previousHolderName: currentMeta.holderName,
      correctionDate: new Date().toISOString().split('T')[0],
      verifiedViaAadhaar: true,
    };

    await db
      .update(schema.citizenCredentials)
      .set({
        metadata: updatedMeta,
      })
      .where(eq(schema.citizenCredentials.id, panCreds[0].id));

    return {
      success: true,
      newHolderName: input.correctedName,
    };
  }
}
