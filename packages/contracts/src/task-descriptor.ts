export interface CivicTaskGroundTruthRecord {
  label: string;
  value: string;
  sourceAuthority: string;
  isVerified: boolean;
  sensitive?: boolean;
}

export interface CivicTaskField {
  fieldId: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'TEXTAREA';
  defaultValue?: any;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  helperText?: string;
  required?: boolean;
}

export interface CivicTaskPrerequisite {
  title: string;
  authority: string;
  status: 'VERIFIED' | 'PENDING' | 'ACTION_REQUIRED';
  details?: string;
}

export interface CivicTaskDiscrepancy {
  detected: boolean;
  field: string;
  expectedValue: string;
  actualValue: string;
  authority: string;
  resolutionGuidance: string;
}

export interface CivicTaskDeclaration {
  id: string;
  text: string;
  required: boolean;
  statutoryReference?: string;
}

export interface CivicTaskDataDisclosure {
  recipient: string;
  purpose: string;
  retention: string;
}

export interface CivicTaskConsequences {
  isIrreversible: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  warning: string;
  downstreamUpdates: string[];
}

export interface CivicTaskOutcomeReceipt {
  receiptTitle: string;
  referenceCode: string;
  confirmationNotice: string;
  authority: string;
  timestamp: string;
  verifiedUpdates: Array<{ registry: string; status: string; detail: string }>;
}

export interface CivicTaskDescriptor {
  capabilityId: string;
  title: string;
  subtitle: string;
  authority: string;
  statutoryAct: string;
  groundTruth: CivicTaskGroundTruthRecord[];
  fields: CivicTaskField[];
  prerequisites: CivicTaskPrerequisite[];
  discrepancy?: CivicTaskDiscrepancy;
  consequences: CivicTaskConsequences;
  declarations: CivicTaskDeclaration[];
  disclosures: CivicTaskDataDisclosure[];
  statutoryFeesInr: number;
  actionVerb: string;
  requiresAuthorization: boolean;
  generateOutcome: (formData: Record<string, any>, executionOutput: any) => CivicTaskOutcomeReceipt;
}
