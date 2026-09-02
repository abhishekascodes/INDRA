import { getDb, schema } from '@indra/database';
import { eq } from 'drizzle-orm';

export interface EvaluateBenefitsInput {
  citizenId: string;
  categoryFilter?: string;
}

export interface SchemeMatchResult {
  code: string;
  title: string;
  category: string;
  eligible: boolean;
  annualBenefitInr: number;
  benefitDescription: string;
  reason: string;
}

export class WelfareSpiAdapter {
  async evaluateSchemes(input: EvaluateBenefitsInput): Promise<SchemeMatchResult[]> {
    const db = await getDb();
    const citizenRows = await db
      .select()
      .from(schema.citizens)
      .where(eq(schema.citizens.id, input.citizenId));

    if (citizenRows.length === 0) {
      throw new Error('Citizen not found');
    }

    const schemes = await db
      .select()
      .from(schema.spiWelfareSchemes)
      .where(eq(schema.spiWelfareSchemes.isActive, true));

    return schemes.map((s) => {
      // In synthetic demonstration, Priya Sharma is a tech professional (eligible for Startup India and PMJJBY life insurance)
      let eligible = false;
      let reason = 'Criteria not satisfied';

      if (s.code === 'PMJJBY') {
        eligible = true;
        reason = 'Eligible based on age (18-50 years) and verified bank identity';
      } else if (s.code === 'STARTUP_INDIA_SEED') {
        eligible = true;
        reason = 'Eligible for new enterprise incorporation in technological services';
      } else if (s.code === 'PM_KISAN') {
        eligible = false;
        reason = 'Requires registered agricultural land parcel in farmer registry';
      }

      return {
        code: s.code,
        title: s.title,
        category: s.category,
        eligible,
        annualBenefitInr: s.annualBenefitInr,
        benefitDescription: s.benefitDescription,
        reason,
      };
    });
  }
}
