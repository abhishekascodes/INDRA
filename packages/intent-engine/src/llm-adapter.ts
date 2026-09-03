import { z } from '@indra/contracts';

/**
 * Strict schema for structured LLM intent resolution.
 * Enforces validated JSON output with confidence, domain, reasoning, and entity extraction.
 */
export const LlmIntentResolutionSchema = z.object({
  intentId: z.string(),
  domain: z.string(),
  suggestedWorkflowCode: z.string().optional(),
  extractedEntities: z.record(z.unknown()).default({}),
  confidence: z.number().min(0).max(1),
  reasoningSummary: z.string(),
  clarificationRequired: z.boolean().default(false),
  clarificationQuestion: z.string().optional(),
});

export type LlmIntentResolution = z.infer<typeof LlmIntentResolutionSchema>;

export interface IntentCatalogItem {
  intentId: string;
  category: string;
  workflowCode?: string;
  actionTitle: string;
  actionDescription: string;
}

export interface StructuredLlmIntentAdapter {
  /**
   * Translates natural language queries into a validated structured intent.
   *
   * SAFETY GUARDRAIL:
   * The LLM adapter is strictly a deterministic/semantic text-to-schema translation layer.
   * It has ZERO access to the database, CANNOT invoke capabilities, CANNOT grant authorization,
   * and CANNOT mutate system state.
   */
  resolveWithLlm(
    query: string,
    availableIntents: IntentCatalogItem[]
  ): Promise<LlmIntentResolution>;
}

export class DefaultStructuredLlmIntentAdapter implements StructuredLlmIntentAdapter {
  async resolveWithLlm(
    query: string,
    availableIntents: IntentCatalogItem[]
  ): Promise<LlmIntentResolution> {
    const cleanQuery = query.trim().toLowerCase();

    // If an external structured LLM endpoint is provided, call it with strict schema validation
    if (process.env.LLM_API_URL && process.env.LLM_API_KEY) {
      try {
        const response = await fetch(process.env.LLM_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.LLM_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.LLM_MODEL || 'indra-structured-v1',
            temperature: 0.1,
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `You are the INDRA Natural Language Intent Parser.
Your role is strictly to map the citizen's query into one of the known intents from the catalog:
${JSON.stringify(availableIntents, null, 2)}

You MUST output ONLY valid JSON conforming to this schema:
{
  "intentId": "string from catalog or GENERAL_INQUIRY",
  "domain": "string matching catalog category or CIVIC",
  "suggestedWorkflowCode": "string matching catalog workflowCode or undefined",
  "extractedEntities": {},
  "confidence": 0.0 to 1.0,
  "reasoningSummary": "one sentence explanation",
  "clarificationRequired": boolean,
  "clarificationQuestion": "optional string if ambiguous"
}`,
              },
              { role: 'user', content: query },
            ],
          }),
        });

        if (response.ok) {
          const raw: any = await response.json();
          const content = raw.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            const validated = LlmIntentResolutionSchema.safeParse(parsed);
            if (validated.success) {
              return validated.data;
            }
          }
        }
      } catch (err) {
        console.warn('[StructuredLlmIntentAdapter] External LLM call failed, falling back to local semantic parser:', err);
      }
    }

    // Built-in Semantic & Conversational Parser (Robust local zero-dependency fallback)
    return this.resolveLocally(cleanQuery, availableIntents);
  }

  private resolveLocally(
    query: string,
    availableIntents: IntentCatalogItem[]
  ): LlmIntentResolution {
    // 1. Business Incorporation Semantic Cluster
    if (
      query.includes('company') ||
      query.includes('business') ||
      query.includes('startup') ||
      query.includes('firm') ||
      query.includes('incorporat') ||
      query.includes('pvt ltd') ||
      query.includes('llp') ||
      query.includes('proprietorship') ||
      query.includes('venture')
    ) {
      const nameMatch = query.match(/(?:called|named|name is)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:in|as|pvt|private|limited|with)|\.|$)/i);
      const proposedName = nameMatch ? nameMatch[1].trim() : undefined;

      return {
        intentId: 'START_BUSINESS',
        domain: 'BUSINESS',
        suggestedWorkflowCode: 'START_BUSINESS',
        extractedEntities: proposedName ? { proposedName } : {},
        confidence: 0.94,
        reasoningSummary: 'Citizen expressed intent to establish, register, or incorporate a business enterprise.',
        clarificationRequired: false,
      };
    }

    // 2a. Active Job Change PF Transfer
    if (
      (query.includes('pf') || query.includes('epf')) &&
      (query.includes('new employer') || query.includes('new company') || query.includes('new job') || query.includes('form 13') || query.includes('switch'))
    ) {
      return {
        intentId: 'TRANSFER_ACTIVE_PF',
        domain: 'EMPLOYMENT',
        suggestedWorkflowCode: 'RECOVER_DORMANT_PF',
        extractedEntities: {},
        confidence: 0.94,
        reasoningSummary: 'Citizen requested transfer of PF balance from previous employment to active new job.',
        clarificationRequired: false,
      };
    }

    // 2b. EPFO / Dormant or Inactive Provident Fund Recovery Cluster
    if (
      query.includes('pf') ||
      query.includes('provident') ||
      query.includes('epfo') ||
      query.includes('pension') ||
      query.includes('epf') ||
      query.includes('uan') ||
      query.includes('past job') ||
      query.includes('previous employer')
    ) {
      return {
        intentId: 'RECOVER_DORMANT_PF',
        domain: 'EMPLOYMENT',
        suggestedWorkflowCode: 'RECOVER_DORMANT_PF',
        extractedEntities: {},
        confidence: 0.93,
        reasoningSummary: 'Citizen inquired about identifying, recovering, or consolidating dormant or unlinked provident fund accounts.',
        clarificationRequired: false,
      };
    }

    // 3. Stolen / Lost Handset & CEIR Telecom Security Cluster
    if (
      query.includes('lost') ||
      query.includes('stolen') ||
      query.includes('theft') ||
      query.includes('snatch') ||
      query.includes('misplaced') ||
      query.includes('ceir') ||
      query.includes('imei') ||
      (query.includes('block') && (query.includes('phone') || query.includes('sim') || query.includes('mobile')))
    ) {
      const locMatch = query.match(/(?:in|at|near|around)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:station|metro|airport|market|road|bus)|\.|$)/i);
      const incidentLocation = locMatch ? locMatch[1].trim() : undefined;

      return {
        intentId: 'LOST_PHONE_SECURITY',
        domain: 'SECURITY',
        suggestedWorkflowCode: 'LOST_DEVICE_PROTECTION',
        extractedEntities: incidentLocation ? { incidentLocation } : {},
        confidence: 0.95,
        reasoningSummary: 'Citizen reported a lost or stolen mobile device requiring CEIR blacklisting and SIM deactivation.',
        clarificationRequired: false,
      };
    }

    // 4. Identity & Name Harmonization Cluster
    if (
      query.includes('mismatch') ||
      query.includes('spelling') ||
      query.includes('discrepancy') ||
      query.includes('differen') ||
      query.includes('harmoniz') ||
      (query.includes('pan') && query.includes('aadhaar')) ||
      (query.includes('name') && (query.includes('wrong') || query.includes('change') || query.includes('correct')))
    ) {
      return {
        intentId: 'RESOLVE_NAME_MISMATCH',
        domain: 'IDENTITY',
        suggestedWorkflowCode: 'RESOLVE_NAME_MISMATCH',
        extractedEntities: {},
        confidence: 0.92,
        reasoningSummary: 'Citizen requested harmonization or correction of conflicting identity records across government registries.',
        clarificationRequired: false,
      };
    }

    // 5. Passport Renewal Cluster
    if (query.includes('passport')) {
      return {
        intentId: 'RENEW_PASSPORT',
        domain: 'TRAVEL',
        suggestedWorkflowCode: undefined,
        extractedEntities: {},
        confidence: 0.91,
        reasoningSummary: 'Citizen asked regarding passport re-issue, expiration, or scheduling appointments.',
        clarificationRequired: false,
      };
    }

    // 6. Benefits & Welfare Schemes Cluster
    if (
      query.includes('benefit') ||
      query.includes('scheme') ||
      query.includes('welfare') ||
      query.includes('subsidy') ||
      query.includes('scholarship') ||
      query.includes('grant')
    ) {
      return {
        intentId: 'EVALUATE_BENEFITS',
        domain: 'BENEFITS',
        suggestedWorkflowCode: undefined,
        extractedEntities: {},
        confidence: 0.92,
        reasoningSummary: 'Citizen requested evaluation of eligibility across central and state welfare programmes.',
        clarificationRequired: false,
      };
    }

    // 7. Life Event / Relocation Cluster
    if (
      query.includes('moved to') ||
      query.includes('relocat') ||
      query.includes('shifted to') ||
      query.includes('new address') ||
      query.includes('change address')
    ) {
      const cityMatch = query.match(/(?:to|in)\s+([a-zA-Z\s]+?)(?:\s+(?:last|next|for|recently)|\.|$)/i);
      const targetCity = cityMatch ? cityMatch[1].trim() : undefined;

      return {
        intentId: 'LIFE_EVENT_MOVING',
        domain: 'LIFE_EVENT',
        suggestedWorkflowCode: undefined,
        extractedEntities: targetCity ? { targetCity } : {},
        confidence: 0.90,
        reasoningSummary: 'Citizen reported geographic relocation requiring multi-registry address synchronization.',
        clarificationRequired: false,
      };
    }

    // 8. Post-Marriage Life Event Cluster
    if (query.includes('marri') || query.includes('wedding') || query.includes('got married')) {
      return {
        intentId: 'LIFE_EVENT_MARRIAGE',
        domain: 'LIFE_EVENT',
        suggestedWorkflowCode: undefined,
        extractedEntities: {},
        confidence: 0.92,
        reasoningSummary: 'Citizen reported marriage event requiring multi-registry status and surname harmonization.',
        clarificationRequired: false,
      };
    }

    // Fallback: Underspecified or General Inquiry
    return {
      intentId: 'GENERAL_INQUIRY',
      domain: 'CIVIC',
      extractedEntities: {},
      confidence: 0.5,
      reasoningSummary: 'Query was underspecified or did not clearly map to an existing statutory workflow.',
      clarificationRequired: true,
      clarificationQuestion:
        'Could you tell me what specific matter you would like to handle? (e.g. Incorporate a company, consolidate inactive PF savings, report a lost phone, or harmonize your PAN name).',
    };
  }
}
