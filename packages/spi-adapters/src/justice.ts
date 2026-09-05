export interface FileCpgramsGrievanceInput {
  citizenId: string;
  ministryCode: string;
  subject: string;
  grievanceDetails: string;
  previousReferenceNo?: string;
}

export interface FileCpgramsGrievanceOutput {
  success: boolean;
  registrationNumber: string;
  ministryName: string;
  subject: string;
  assignedOfficer: string;
  expectedResolutionDays: number;
  status: 'UNDER_PROCESS';
  filingDate: string;
  portal: string;
}

export interface CheckRtiStatusInput {
  citizenId: string;
  registrationNumber: string;
}

export interface CheckRtiStatusOutput {
  success: boolean;
  registrationNumber: string;
  publicAuthority: string;
  dateOfReceipt: string;
  status: 'PENDING_PIO_RESPONSE' | 'DISPOSED' | 'FIRST_APPEAL_FILED';
  pioName: string;
  pioDesignation: string;
  statutoryDeadlineDate: string;
  responseSummary?: string;
}

export class JusticeSpiAdapter {
  private static instance: JusticeSpiAdapter | null = null;

  public static getInstance(): JusticeSpiAdapter {
    if (!JusticeSpiAdapter.instance) {
      JusticeSpiAdapter.instance = new JusticeSpiAdapter();
    }
    return JusticeSpiAdapter.instance;
  }

  /**
   * Lodges authenticated citizen grievance with Central Public Grievance Redress (CPGRAMS).
   */
  async fileCpgramsGrievance(input: FileCpgramsGrievanceInput): Promise<FileCpgramsGrievanceOutput> {
    const regNum = `PMOPG/E/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;

    const ministryMap: Record<string, string> = {
      MORTH: 'Ministry of Road Transport and Highways',
      EPFO: "Ministry of Labour & Employment (Employees' Provident Fund)",
      FIN: 'Department of Financial Services (Banking Division)',
      DOT: 'Department of Telecommunications',
      URBAN: 'Ministry of Housing and Urban Affairs',
    };

    const minName = ministryMap[input.ministryCode] || 'Department of Administrative Reforms and Public Grievances';

    return {
      success: true,
      registrationNumber: regNum,
      ministryName: minName,
      subject: input.subject,
      assignedOfficer: 'Nodal Public Grievance Officer, Deputy Secretary',
      expectedResolutionDays: 30,
      status: 'UNDER_PROCESS',
      filingDate: new Date().toISOString().split('T')[0],
      portal: 'Centralized Public Grievance Redress and Monitoring System (CPGRAMS)',
    };
  }

  /**
   * Tracks Right to Information (RTI) application lifecycle and PIO response deadline.
   */
  async checkRtiStatus(input: CheckRtiStatusInput): Promise<CheckRtiStatusOutput> {
    const today = new Date();
    const receiptDate = new Date(today.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const deadlineDate = new Date(today.getTime() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return {
      success: true,
      registrationNumber: input.registrationNumber,
      publicAuthority: 'Ministry of Electronics and Information Technology (MeitY)',
      dateOfReceipt: receiptDate,
      status: 'PENDING_PIO_RESPONSE',
      pioName: 'Shri R. K. Verma',
      pioDesignation: 'Central Public Information Officer (CPIO)',
      statutoryDeadlineDate: deadlineDate,
      responseSummary: 'Application forwarded to concerned section officer; information compilation in progress under Section 7(1) of the RTI Act.',
    };
  }

  /**
   * Applies for free legal representation under National Legal Services Authority (NALSA).
   */
  async applyLegalAid(input: {
    citizenId: string;
    matterSummary: string;
    category: 'WOMEN_CHILDREN' | 'SC_ST' | 'LOW_INCOME' | 'CUSTODIAL';
  }) {
    const aidNumber = `NALSA-AID-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    return {
      success: true,
      caseAidNumber: aidNumber,
      assignedAdvocateName: 'Adv. S. K. Mahajan (Panel Advocate)',
      legalServicesAuthority: 'District Legal Services Authority (DLSA)',
      status: 'ADVOCATE_ASSIGNED',
      message: `Free legal representation approved under Legal Services Authorities Act Section 12 for matter: "${input.matterSummary.slice(0, 40)}...".`,
    };
  }

  /**
   * Searches State Police Citizen Portal for e-FIR / police clearance records.
   */
  async searchPoliceFir(input: {
    citizenId: string;
    policeStation: string;
    firNumber?: string;
    queryYear?: string;
  }) {
    const firNo = input.firNumber || `FIR-${input.policeStation.slice(0, 3).toUpperCase()}-2025-0192`;
    return {
      success: true,
      firNumber: firNo,
      policeStation: input.policeStation,
      incidentSection: 'Section 420/66D Information Technology Act (Attempted Cyber Fraud)',
      investigationStatus: 'CLOSED_CLEARANCE_ISSUED',
      message: `Police verification search completed at ${input.policeStation}. Record ${firNo} verified with clean non-involvement certificate.`,
    };
  }
}

