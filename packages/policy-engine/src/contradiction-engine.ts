import { getDb, schema, eq } from '@indra/database';
import type { CitizenWorldModel, ContradictionRecord } from '@indra/contracts';

export class ContradictionEngine {
  private static instance: ContradictionEngine | null = null;

  public static getInstance(): ContradictionEngine {
    if (!ContradictionEngine.instance) {
      ContradictionEngine.instance = new ContradictionEngine();
    }
    return ContradictionEngine.instance;
  }

  /**
   * Inspects public-world state across synthetic registries for contradictions.
   * Enforces that contradictions are not generic errors, but detected conflicts
   * between pieces of public-world state that block unsafe downstream mutations.
   */
  async detectContradictions(
    citizenId: string,
    worldModel: CitizenWorldModel,
    targetContext: Record<string, any> = {}
  ): Promise<ContradictionRecord[]> {
    const db = await getDb();
    const contradictions: ContradictionRecord[] = [];

    // 1. Check Global Simulation Outage / Contradiction Config
    let injectDeedContradiction = true;
    try {
      const configs = await db
        .select()
        .from(schema.syntheticOutageConfig)
        .where(eq(schema.syntheticOutageConfig.id, 'GLOBAL_SIMULATION_CONFIG'));
      if (configs.length > 0) {
        injectDeedContradiction = configs[0].injectDeedContradiction;
      }
    } catch {
      // Default to true for deterministic flagship scenario
      injectDeedContradiction = true;
    }

    // Explicit override in targetContext if provided
    if (targetContext.overrideDeedContradiction !== undefined) {
      injectDeedContradiction = Boolean(targetContext.overrideDeedContradiction);
    }

    const citizenName = worldModel.profile.fullName || 'Citizen';

    // 2. FLAGSHIP CONTRADICTION: Legal Identity vs. Property Deed / Sale Agreement Transferee Name
    // When buying property in Bangalore / Karnataka, if deed contains "Aarav Kumar Patel" while
    // Aadhaar is "Aarav Patel", a critical cross-institution conflict exists.
    if (
      injectDeedContradiction &&
      (targetContext.lifeEventCode === 'BUY_PROPERTY' ||
        targetContext.lifeEventCode === 'RELOCATION_PROPERTY_ACQUISITION' ||
        targetContext.surveyNumber ||
        targetContext.destinationCity?.toLowerCase().includes('bangalore') ||
        targetContext.destinationCity?.toLowerCase().includes('bengaluru') ||
        targetContext.rawQuery?.toLowerCase().includes('property') ||
        targetContext.rawQuery?.toLowerCase().includes('plot'))
    ) {
      const deedTransfereeName = targetContext.deedTransfereeName || `${citizenName.split(' ')[0]} Kumar Patel`;

      contradictions.push({
        id: `CONTRADICTION_DEED_NAME_${citizenId.slice(0, 8)}`,
        sourceInstitution: 'Department of Stamps and Registration (Kaveri 2.0 / Sub-Registrar)',
        entity: 'PROPERTY_ACQUISITION_DEED',
        field: 'transfereeLegalName',
        observedValues: {
          authoritativeDemographicGroundTruth: citizenName,
          registeredSaleDeedTransferee: deedTransfereeName,
          registryContext: 'Kaveri 2.0 Devanahalli Sub-Registrar Office (Doc #KA-BLR-DEV-2026-00481)',
        },
        evidenceOrProvenance: {
          sourceA: 'UIDAI CIDR Aadhaar Master Record (Synthetic Prototype Simulation)',
          sourceB: 'Kaveri 2.0 Registered Sale Deed Ledger',
          detectedAt: new Date().toISOString(),
          confidence: 100,
        },
        candidateAuthoritativeSource: 'Unique Identification Authority of India (UIDAI - Synthetic)',
        severity: 'CRITICAL',
        blockingStatus: 'BLOCKING',
        blockedStepKeys: ['apply_mutation'],
        whatConflicts: `Legal name in property purchase documentation ('${deedTransfereeName}') does not match verified national identity record ('${citizenName}').`,
        whyItMatters:
          'Under Section 128 of the Karnataka Land Revenue Act, municipal revenue authorities automatically reject title mutation requests when transferee name strings differ from biometric Aadhaar verification.',
        whatEvidenceNeeded:
          'Authoritative identity harmonization declaration reconciling personal names with verified Aadhaar ground truth.',
        resolutionStrategy: 'SYNCHRONIZE_IDENTITY_ASSERTION',
        resolutionActions: [
          'Execute identity harmonization declaration to record legal name alias across municipal revenue registries before initiating mutation',
        ],
        resolutionState: 'UNRESOLVED',
      });
    }

    // 3. SECONDARY CONTRADICTION: PAN vs Aadhaar Name Mismatch
    const aadhaarCred = worldModel.credentials.find((c: any) => c.type === 'AADHAAR');
    const panCred = worldModel.credentials.find((c: any) => c.type === 'PAN');
    if (aadhaarCred && panCred) {
      const aName = (aadhaarCred.metadata as any)?.holderName || '';
      const pName = (panCred.metadata as any)?.holderName || '';
      if (aName && pName && aName.toLowerCase() !== pName.toLowerCase()) {
        contradictions.push({
          id: `CONTRADICTION_PAN_AADHAAR_${citizenId.slice(0, 8)}`,
          sourceInstitution: 'Income Tax Department (ITD / TRACES)',
          entity: 'SOVEREIGN_TAX_CREDENTIAL',
          field: 'taxpayerName',
          observedValues: {
            aadhaarName: aName,
            panName: pName,
          },
          evidenceOrProvenance: {
            sourceA: 'UIDAI CIDR Record',
            sourceB: 'Income Tax Master PAN Directory',
            detectedAt: new Date().toISOString(),
          },
          candidateAuthoritativeSource: 'Unique Identification Authority of India (UIDAI)',
          severity: 'HIGH',
          blockingStatus: 'BLOCKING',
          blockedStepKeys: ['reconcile_tax_credits', 'update_epfo_pan'],
          whatConflicts: `Aadhaar identity states '${aName}', whereas Income Tax PAN directory records '${pName}'.`,
          whyItMatters:
            'Financial transactions and PF transfers above statutory thresholds require strict deterministic PAN-Aadhaar linkage under Section 139AA of the Income Tax Act.',
          whatEvidenceNeeded: 'PAN demographic update request backed by Aadhaar OTP e-KYC.',
          resolutionStrategy: 'HARMONIZE_PAN_WITH_AADHAAR',
          resolutionActions: ['Submit Form 49A correction application to Income Tax Department'],
          resolutionState: 'UNRESOLVED',
        });
      }
    }

    // 4. JURISDICTIONAL CONTRADICTION: Inter-state relocation with un-transferred motor vehicle
    if (
      targetContext.destinationState &&
      worldModel.profile.currentState &&
      targetContext.destinationState.toLowerCase() !== worldModel.profile.currentState.toLowerCase() &&
      worldModel.vehicles.length > 0
    ) {
      const activeVehicle = worldModel.vehicles[0];
      if (activeVehicle.state && activeVehicle.state.toLowerCase() !== targetContext.destinationState.toLowerCase()) {
        contradictions.push({
          id: `CONTRADICTION_VEHICLE_JURISDICTION_${activeVehicle.registrationNumber}`,
          sourceInstitution: 'Ministry of Road Transport and Highways (MoRTH Vahan)',
          entity: 'MOTOR_VEHICLE_REGISTRATION',
          field: 'stateJurisdiction',
          observedValues: {
            currentVehicleState: activeVehicle.state,
            proposedResidenceState: targetContext.destinationState,
            vehicleRegNo: activeVehicle.registrationNumber,
          },
          evidenceOrProvenance: {
            sourceA: 'MoRTH Vahan National Register',
            sourceB: 'Citizen Relocation Declaration',
            detectedAt: new Date().toISOString(),
          },
          candidateAuthoritativeSource: 'Citizen Relocation Declaration',
          severity: 'MEDIUM',
          blockingStatus: 'NON_BLOCKING',
          blockedStepKeys: [],
          whatConflicts: `Motor vehicle ${activeVehicle.registrationNumber} is registered in ${activeVehicle.state}, while primary residence is relocating to ${targetContext.destinationState}.`,
          whyItMatters:
            'Under Section 47 of the Motor Vehicles Act 1988, keeping a vehicle in another state beyond 12 months without jurisdictional re-registration incurs statutory penalties.',
          whatEvidenceNeeded: 'Form 28 No Objection Certificate (NOC) and state road tax endorsement.',
          resolutionStrategy: 'TRANSFER_VEHICLE_REGISTRATION',
          resolutionActions: ['Apply for Inter-State Vehicle Registration Transfer under MoRTH Vahan'],
          resolutionState: 'UNRESOLVED',
        });
      }
    }

    return contradictions;
  }
}
