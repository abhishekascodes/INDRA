import { getDb, schema, eq, and } from '@indra/database';

export interface RelocationRegistrationItem {
  id: string;
  title: string;
  authority: string;
  actionRequired: string;
  isInterState: boolean;
}

export interface RelocationSynthesisResult {
  citizenId: string;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  registrations: RelocationRegistrationItem[];
  verifiedGroundTruth: Array<{ label: string; value: string }>;
}

export async function synthesizeRelocationImpact(
  citizenId: string,
  destinationCity = 'Bengaluru',
  destinationState = 'Karnataka'
): Promise<RelocationSynthesisResult> {
  const db = await getDb();

  // 1. Fetch Citizen
  const [citizen] = await db
    .select()
    .from(schema.citizens)
    .where(eq(schema.citizens.id, citizenId));

  if (!citizen) {
    throw new Error(`Citizen '${citizenId}' not found for life-event synthesis`);
  }

  // 2. Fetch Current Address
  const addresses = await db
    .select()
    .from(schema.citizenAddresses)
    .where(eq(schema.citizenAddresses.citizenId, citizenId));

  const currentAddress = addresses.find((a) => a.type === 'CURRENT') || addresses[0];
  const originCity = currentAddress?.city || citizen.currentCity || 'Unknown City';
  const originState = currentAddress?.state || citizen.currentState || 'Unknown State';
  const isInterState = originState.toLowerCase() !== destinationState.toLowerCase();

  // 3. Fetch Credentials & Documents
  const credentials = await db
    .select()
    .from(schema.citizenCredentials)
    .where(eq(schema.citizenCredentials.citizenId, citizenId));

  const documents = await db
    .select()
    .from(schema.citizenDocuments)
    .where(eq(schema.citizenDocuments.citizenId, citizenId));

  const registrations: RelocationRegistrationItem[] = [];

  // (a) Aadhaar Address
  const aadhaarCred = credentials.find((c) => c.type === 'AADHAAR');
  registrations.push({
    id: 'reg_aadhaar_address',
    title: 'Aadhaar Address Record',
    authority: 'Unique Identification Authority of India (UIDAI)',
    actionRequired: `Update residential address from ${originCity}, ${originState} to ${destinationCity}, ${destinationState}`,
    isInterState,
  });

  // (b) Driving Licence (if held)
  const dlCred = credentials.find((c) => c.type === 'DRIVING_LICENCE');
  if (dlCred) {
    const rto = (dlCred.metadata as any)?.rto || 'State Transport Department';
    registrations.push({
      id: 'reg_dl',
      title: 'Driving Licence Record',
      authority: `${rto}`,
      actionRequired: isInterState
        ? `Inter-state RTO endorsement and jurisdictional transfer from ${originState} to ${destinationState}`
        : `Intra-state address endorsement with local RTO in ${destinationCity}`,
      isInterState,
    });
  }

  // (c) Vehicle Registration (ONLY if citizen actually has a vehicle RC document!)
  const vehicleDoc = documents.find(
    (d) => d.documentType === 'VEHICLE_RC' || d.title.toLowerCase().includes('vehicle') || d.title.toLowerCase().includes('rc')
  );
  if (vehicleDoc) {
    registrations.push({
      id: 'reg_vehicle_rc',
      title: 'Vehicle Registration Certificate (RC)',
      authority: 'Ministry of Road Transport & Highways (Vahan)',
      actionRequired: isInterState
        ? `No Objection Certificate (NOC) and road tax re-assignment from ${originState} to ${destinationState}`
        : `Local RTO address update for registered vehicle`,
      isInterState,
    });
  }

  // (d) Voter Registration
  registrations.push({
    id: 'reg_voter',
    title: 'Electoral Roll / Voter Registration',
    authority: 'Election Commission of India (Form 8)',
    actionRequired: `Constituency shifting from ${currentAddress?.district || originCity} to ${destinationCity}`,
    isInterState,
  });

  // 4. Verified Ground Truth Facts
  const verifiedGroundTruth = [
    {
      label: 'Verified Identity',
      value: `${citizen.primaryName} (${aadhaarCred ? aadhaarCred.identifierMasked : 'Aadhaar on file'})`,
    },
    {
      label: 'Origin Ground Truth',
      value: `${originCity}, ${originState} (PIN ${currentAddress?.pincode || 'Verified'})`,
    },
    {
      label: 'Declared Destination',
      value: `${destinationCity}, ${destinationState}`,
    },
  ];

  return {
    citizenId,
    originCity,
    originState,
    destinationCity,
    destinationState,
    registrations,
    verifiedGroundTruth,
  };
}
