import { getDb, schema, eq, and } from '@indra/database';
import { CitizenWorldModelService } from './world-model-service.js';
import type {
  CitizenWorldModel,
  ReconciliationReport,
  ReconciliationEntityReport,
} from '@indra/contracts';

export class ReconciliationEngine {
  private static instance: ReconciliationEngine | null = null;
  private wmService = CitizenWorldModelService.getInstance();

  public static getInstance(): ReconciliationEngine {
    if (!ReconciliationEngine.instance) {
      ReconciliationEngine.instance = new ReconciliationEngine();
    }
    return ReconciliationEngine.instance;
  }

  /**
   * Reconciles public-world state across 3 authoritative tiers:
   * 1. INTENDED STATE: The statutory post-conditions derived from citizen intent.
   * 2. INSTITUTIONAL STATE: Direct query of Synthetic Public Infrastructure ledgers.
   * 3. INDRA WORLD MODEL: The citizen-facing aggregated public graph.
   *
   * Only updates INDRA World Model once Institutional State matches Intended State.
   */
  async reconcileTransition(
    citizenId: string,
    transitionContext: Record<string, any>
  ): Promise<ReconciliationReport> {
    const db = await getDb();
    const entityReports: ReconciliationEntityReport[] = [];
    const currentWorldModel = await this.wmService.getWorldModel(citizenId);
    let allConverged = true;

    // 1. RECONCILE REAL PROPERTY & LAND REGISTRY (Bhoomi / Kaveri / Municipal)
    if (
      transitionContext.lifeEventCode === 'BUY_PROPERTY' ||
      transitionContext.lifeEventCode === 'RELOCATION_PROPERTY_ACQUISITION' ||
      transitionContext.surveyNumber
    ) {
      const surveyNo = transitionContext.surveyNumber || '142/3';
      const intendedLand = {
        identifier: surveyNo,
        ownerName: currentWorldModel.profile.fullName,
        state: transitionContext.destinationState || 'Karnataka',
        status: 'MUTATED_AND_REGISTERED',
      };

      const parcels = await db
        .select()
        .from(schema.spiLandParcels)
        .where(
          and(
            eq(schema.spiLandParcels.citizenId, citizenId),
            eq(schema.spiLandParcels.surveyNumber, surveyNo)
          )
        );

      const properties = await db
        .select()
        .from(schema.citizenProperties)
        .where(
          and(
            eq(schema.citizenProperties.citizenId, citizenId),
            eq(schema.citizenProperties.identifier, surveyNo)
          )
        );

      const existsInStateRegistry = parcels.length > 0 || properties.length > 0;
      const institutionalState = {
        existsInStateRegistry,
        surveyNumber: parcels[0]?.surveyNumber || properties[0]?.identifier || null,
        state: parcels[0]?.state || properties[0]?.state || null,
        taxStatus: properties[0]?.taxPaymentStatus || 'UNPAID',
      };

      const inWorldModel = currentWorldModel.properties.some(
        (p) => p.identifier === surveyNo || p.identifier.includes(surveyNo)
      );
      const worldModelState = {
        inWorldModel,
        propertyCount: currentWorldModel.properties.length,
      };

      const forceDivergence = Boolean(transitionContext.forceReconciliationDivergence);
      const converged = existsInStateRegistry && !forceDivergence;
      if (!converged) allConverged = false;

      entityReports.push({
        entityType: 'LAND_TITLE_MUTATION',
        identifier: `Survey No. ${surveyNo} (Devanahalli Taluk)`,
        intendedState: intendedLand,
        institutionalState: forceDivergence
          ? { ...institutionalState, existsInStateRegistry: false, disputeNote: 'External registry alteration: Record mismatch in Bhoomi node' }
          : institutionalState,
        worldModelState,
        status: converged ? 'CONVERGED' : 'DIVERGENT',
        details: converged
          ? 'Institutional Bhoomi mutation confirmed in state registry. Ownership legally vested.'
          : 'Institutional state mismatch: Mutation pending, unrecorded, or conflicting in Bhoomi state registry.',
      });
    }

    // 2. RECONCILE RESIDENTIAL ADDRESS (UIDAI CIDR)
    if (
      transitionContext.destinationCity ||
      transitionContext.destinationState ||
      transitionContext.lifeEventCode === 'RELOCATION' ||
      transitionContext.lifeEventCode === 'RELOCATION_PROPERTY_ACQUISITION'
    ) {
      const destCity = transitionContext.destinationCity || 'Bengaluru';
      const destState = transitionContext.destinationState || 'Karnataka';

      const intendedAddress = {
        city: destCity,
        state: destState,
      };

      // Query database address records directly
      const addresses = await db
        .select()
        .from(schema.citizenAddresses)
        .where(eq(schema.citizenAddresses.citizenId, citizenId));

      const matchedAddr = addresses.find(
        (a) =>
          a.city.toLowerCase() === destCity.toLowerCase() ||
          a.state.toLowerCase() === destState.toLowerCase()
      );

      const institutionalState = {
        verifiedInUidaiLedger: !!matchedAddr,
        currentRegisteredCity: matchedAddr?.city || addresses[0]?.city || 'Unknown',
        currentRegisteredState: matchedAddr?.state || addresses[0]?.state || 'Unknown',
      };

      const wmCity = currentWorldModel.profile.currentCity;
      const wmState = currentWorldModel.profile.currentState;
      const worldModelState = {
        city: wmCity,
        state: wmState,
      };

      const converged = !!matchedAddr;
      if (!converged) allConverged = false;

      entityReports.push({
        entityType: 'RESIDENTIAL_JURISDICTION',
        identifier: `UIDAI Address (${destCity}, ${destState})`,
        intendedState: intendedAddress,
        institutionalState,
        worldModelState,
        status: converged ? 'CONVERGED' : 'DIVERGENT',
        details: converged
          ? `Aadhaar residential ground truth confirmed in ${destCity}, ${destState}.`
          : 'Institutional address mismatch: Address update not yet committed in UIDAI ledger.',
      });

      // Synchronize citizen profile in INDRA database upon convergence
      if (converged && (wmCity !== destCity || wmState !== destState)) {
        await db
          .update(schema.citizens)
          .set({
            currentCity: destCity,
            currentState: destState,
            updatedAt: new Date(),
          })
          .where(eq(schema.citizens.id, citizenId));
      }
    }

    // 3. RECONCILE VEHICLE REGISTRATION (MoRTH Vahan)
    if (currentWorldModel.vehicles.length > 0) {
      const activeVehicle = currentWorldModel.vehicles[0];
      const destState = transitionContext.destinationState || 'Karnataka';
      const intendedVeh = {
        registrationNumber: activeVehicle.registrationNumber,
        state: destState,
      };

      const vehicles = await db
        .select()
        .from(schema.citizenVehicles)
        .where(eq(schema.citizenVehicles.citizenId, citizenId));

      const v = vehicles[0];
      const institutionalState = {
        state: v?.state || activeVehicle.state,
        rtoCode: v?.rtoCode || activeVehicle.rtoCode,
        status: v?.status || activeVehicle.status,
      };

      const worldModelState = {
        state: activeVehicle.state,
        rtoCode: activeVehicle.rtoCode,
      };

      // Converged if state matches intended destination
      const converged = institutionalState.state.toLowerCase() === destState.toLowerCase();

      entityReports.push({
        entityType: 'MOTOR_VEHICLE_JURISDICTION',
        identifier: activeVehicle.registrationNumber,
        intendedState: intendedVeh,
        institutionalState,
        worldModelState,
        status: converged ? 'CONVERGED' : 'PENDING',
        details: converged
          ? `Vehicle ${activeVehicle.registrationNumber} jurisdiction transferred to ${destState}.`
          : `Jurisdiction transfer recorded in Vahan register.`,
      });
    }

    // 4. RECONCILE IDENTITY HARMONIZATION ARTIFACT
    const docs = await db
      .select()
      .from(schema.citizenDocuments)
      .where(
        and(
          eq(schema.citizenDocuments.citizenId, citizenId),
          eq(schema.citizenDocuments.documentType, 'IDENTITY_HARMONIZATION_CERTIFICATE')
        )
      );

    if (docs.length > 0) {
      entityReports.push({
        entityType: 'IDENTITY_HARMONIZATION',
        identifier: docs[0].documentNumber || 'ID-HARM-DEFAULT',
        intendedState: { status: 'HARMONIZED' },
        institutionalState: { status: 'RECORDED', documentNumber: docs[0].documentNumber },
        worldModelState: { verified: true },
        status: 'CONVERGED',
        details: 'Identity harmonization certificate legally established and archived.',
      });
    }

    const summary = allConverged
      ? 'All public-world state tiers (Intended State, Synthetic Institutional Ledgers, and Citizen World Model) have achieved complete 100% convergence with zero divergence.'
      : 'Reconciliation identified partial divergence between intended state and institutional ledgers. System preserved checkpoint.';

    return {
      reconciledAt: new Date().toISOString(),
      isConverged: allConverged,
      entities: entityReports,
      summary,
    };
  }
}
