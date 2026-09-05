import type { UniversalCivicStatus } from '@indra/contracts';

/**
 * Universal Civic Status Service
 * Maps disparate departmental / statutory status strings into INDRA's 15 canonical civic states.
 */
export class UniversalStatusService {
  private static readonly STATUS_MAPPINGS: Record<string, UniversalCivicStatus> = {
    // 1. DRAFT
    DRAFT: 'DRAFT',
    INITIALIZED: 'DRAFT',
    PREPARING: 'DRAFT',

    // 2. ACTION_REQUIRED
    PENDING_INPUT: 'ACTION_REQUIRED',
    ACTION_REQUIRED: 'ACTION_REQUIRED',
    DISCREPANCY_DETECTED: 'ACTION_REQUIRED',
    INCOMPLETE_DOCUMENTS: 'ACTION_REQUIRED',

    // 3. READY_TO_SUBMIT
    READY: 'READY_TO_SUBMIT',
    READY_TO_SUBMIT: 'READY_TO_SUBMIT',
    ELIGIBLE: 'READY_TO_SUBMIT',
    VALIDATED: 'READY_TO_SUBMIT',

    // 4. AWAITING_AUTHORIZATION
    AWAITING_AUTHORIZATION: 'AWAITING_AUTHORIZATION',
    AWAITING_CONSENT: 'AWAITING_AUTHORIZATION',
    CONSENT_PENDING: 'AWAITING_AUTHORIZATION',

    // 5. SUBMITTED
    SUBMITTED: 'SUBMITTED',
    FILED: 'SUBMITTED',
    ACKNOWLEDGED: 'SUBMITTED',
    RECEIVED: 'SUBMITTED',

    // 6. UNDER_REVIEW
    UNDER_REVIEW: 'UNDER_REVIEW',
    PROCESSING: 'UNDER_REVIEW',
    IN_PROGRESS: 'UNDER_REVIEW',
    PENDING_RTO: 'UNDER_REVIEW',
    PENDING_EPFO: 'UNDER_REVIEW',
    SCRUTINY: 'UNDER_REVIEW',

    // 7. VERIFICATION
    VERIFICATION: 'VERIFICATION',
    POLICE_VERIFICATION_PENDING: 'VERIFICATION',
    BIOMETRIC_PENDING: 'VERIFICATION',
    FIELD_INSPECTION: 'VERIFICATION',

    // 8. APPOINTMENT_REQUIRED
    APPOINTMENT_REQUIRED: 'APPOINTMENT_REQUIRED',
    SLOT_BOOKING_REQUIRED: 'APPOINTMENT_REQUIRED',
    VISIT_MANDATORY: 'APPOINTMENT_REQUIRED',

    // 9. PAYMENT_REQUIRED
    PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
    CHALLAN_PENDING: 'PAYMENT_REQUIRED',
    FEE_PENDING: 'PAYMENT_REQUIRED',
    STAMP_DUTY_DUE: 'PAYMENT_REQUIRED',

    // 10. APPROVED
    APPROVED: 'APPROVED',
    SANCTIONED: 'APPROVED',
    CLEARANCE_ISSUED: 'APPROVED',
    DISPOSED_CLEARANCE_ISSUED: 'APPROVED',
    PASSED: 'APPROVED',

    // 11. COMPLETED
    COMPLETED: 'COMPLETED',
    SETTLED: 'COMPLETED',
    RESOLVED: 'COMPLETED',
    TRANSFERRED: 'COMPLETED',
    SATISFIED: 'COMPLETED',
    ACTIVE: 'COMPLETED',

    // 12. REJECTED
    REJECTED: 'REJECTED',
    CANCELLED: 'REJECTED',
    DISMISSED: 'REJECTED',
    REVOKED: 'REJECTED',

    // 13. EXPIRED
    EXPIRED: 'EXPIRED',
    DORMANT: 'EXPIRED',
    LAPSED: 'EXPIRED',
    INVALIDATED: 'EXPIRED',

    // 14. BLOCKED
    BLOCKED: 'BLOCKED',
    DEPENDENCY_BLOCKED: 'BLOCKED',
    WAITING_PREREQUISITE: 'BLOCKED',

    // 15. FAILED
    FAILED: 'FAILED',
    ERROR: 'FAILED',
    ROLLED_BACK: 'FAILED',
    SYSTEM_FAULT: 'FAILED',
  };

  /**
   * Checks if an upstream status string is directly recognized in our taxonomy.
   */
  public static isRecognizedStatus(rawStatus: string | null | undefined): boolean {
    if (!rawStatus) return false;
    const key = rawStatus.trim().toUpperCase();
    return Boolean(this.STATUS_MAPPINGS[key]);
  }

  /**
   * Normalizes any departmental or raw state to a canonical UniversalCivicStatus.
   * Unknown or malformed inputs deterministically default to 'UNDER_REVIEW'.
   */
  public static normalizeStatus(rawStatus: string | null | undefined): UniversalCivicStatus {
    if (!rawStatus) return 'DRAFT';
    const normalizedKey = rawStatus.trim().toUpperCase();
    return this.STATUS_MAPPINGS[normalizedKey] || 'UNDER_REVIEW';
  }

  /**
   * Returns human-readable editorial description of a canonical status.
   */
  public static getStatusDescription(status: UniversalCivicStatus): string {
    switch (status) {
      case 'DRAFT':
        return 'Information collected, draft ready for citizen review.';
      case 'ACTION_REQUIRED':
        return 'Action required by citizen or department to proceed.';
      case 'READY_TO_SUBMIT':
        return 'All prerequisites satisfied. Ready for sovereign submission.';
      case 'AWAITING_AUTHORIZATION':
        return 'Pending explicit human authorization / electronic consent.';
      case 'SUBMITTED':
        return 'Application submitted to sovereign authority. Acknowledgment generated.';
      case 'UNDER_REVIEW':
        return 'Department processing application under statutory timelines.';
      case 'VERIFICATION':
        return 'Undergoing physical, demographic, or document verification.';
      case 'APPOINTMENT_REQUIRED':
        return 'In-person center visit or biometric appointment scheduled.';
      case 'PAYMENT_REQUIRED':
        return 'Statutory challan or processing fee required.';
      case 'APPROVED':
        return 'Approved by competent authority. Issuance in progress.';
      case 'REJECTED':
        return 'Application rejected or revoked by applicant.';
      case 'COMPLETED':
        return 'Transaction fully completed. Records updated.';
      case 'EXPIRED':
        return 'Document or validity window has expired. Renewal needed.';
      case 'BLOCKED':
        return 'Waiting on upstream prerequisite completion.';
      case 'FAILED':
        return 'Processing failed. Rollback or intervention required.';
    }
  }
}
