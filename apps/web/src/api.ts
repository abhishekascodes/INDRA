import type {
  WorkflowRunSummary,
  StructuredIntent,
  ReviewSessionContract,
} from '@indra/contracts';

const API_BASE = '/api';

let activeCitizenId: string | null = localStorage.getItem('indra_active_citizen_id');

export function setActiveCitizenId(id: string) {
  activeCitizenId = id;
  localStorage.setItem('indra_active_citizen_id', id);
}

export function getActiveCitizenId(): string | null {
  return activeCitizenId;
}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  if (activeCitizenId) {
    headers['x-citizen-id'] = activeCitizenId;
  }
  return headers;
}

export async function fetchSyntheticCitizensList() {
  const res = await fetch(`${API_BASE}/citizens/synthetic-list`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load synthetic citizens list');
  return res.json();
}

export async function fetchCitizenProfile() {
  const res = await fetch(`${API_BASE}/citizen/me`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load citizen profile');
  return res.json();
}

export async function fetchWorldModel() {
  const res = await fetch(`${API_BASE}/citizen/world-model`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load citizen world model');
  return res.json();
}

export async function fetchInbox() {
  const res = await fetch(`${API_BASE}/citizen/inbox`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load inbox items');
  return res.json();
}

export async function fetchVault() {
  const res = await fetch(`${API_BASE}/citizen/vault`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load vault documents');
  return res.json();
}

export async function fetchApplications() {
  const res = await fetch(`${API_BASE}/applications`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load applications');
  return res.json();
}

export async function fetchAuditLogs() {
  const res = await fetch(`${API_BASE}/trust/audit-logs`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load audit logs');
  return res.json();
}

export async function fetchConsents() {
  const res = await fetch(`${API_BASE}/trust/consents`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load consents');
  return res.json();
}

export async function fetchRelocationImpact(
  destinationCity = 'Bengaluru',
  destinationState = 'Karnataka'
) {
  const res = await fetch(`${API_BASE}/citizen/life-events/relocation-impact`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ destinationCity, destinationState }),
  });
  if (!res.ok) throw new Error('Failed to synthesize relocation impact');
  return res.json();
}

export async function resolveIntent(query: string): Promise<StructuredIntent> {
  const res = await fetch(`${API_BASE}/intent/resolve`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('Failed to resolve intent');
  return res.json();
}

export async function startWorkflow(
  workflowCode: string,
  initialContext?: Record<string, unknown>
): Promise<WorkflowRunSummary> {
  const res = await fetch(`${API_BASE}/workflows/start`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ workflowCode, citizenId: activeCitizenId || undefined, initialContext }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to start workflow');
  }
  return res.json();
}

export async function resumeWorkflow(
  runId: string,
  input?: Record<string, unknown>,
  authorize?: boolean
): Promise<WorkflowRunSummary> {
  const res = await fetch(`${API_BASE}/workflows/${runId}/resume`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ input, authorize }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to resume workflow');
  }
  return res.json();
}

export function subscribeEvents(onMessage: (event: any) => void): () => void {
  const eventSource = new EventSource(`${API_BASE}/events/stream`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onMessage(data);
    } catch {
      // Ignore heartbeat or non-json
    }
  };

  return () => {
    eventSource.close();
  };
}

export async function fetchActionPlans() {
  const res = await fetch(`${API_BASE}/citizen/action-plans`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load action plans');
  return res.json();
}

export async function fetchActionPlan(planId: string) {
  const res = await fetch(`${API_BASE}/citizen/action-plans/${planId}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load action plan');
  return res.json();
}

export async function generateActionPlan(
  lifeEventCode: string,
  context?: Record<string, unknown>
) {
  const res = await fetch(`${API_BASE}/citizen/action-plans/generate`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ lifeEventCode, context }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate action plan');
  }
  return res.json();
}

export async function executePlanStep(
  planId: string,
  stepKey: string,
  authorize?: boolean,
  overrideInput?: Record<string, unknown>
) {
  const res = await fetch(`${API_BASE}/citizen/action-plans/${planId}/execute-step`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ stepKey, authorize, overrideInput }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to execute plan step');
  }
  return res.json();
}

export async function fetchProactiveFindings() {
  const res = await fetch(`${API_BASE}/citizen/proactive-findings`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load proactive findings');
  return res.json();
}

export async function dismissProactiveFinding(findingId: string, reason?: string) {
  const res = await fetch(`${API_BASE}/citizen/proactive-findings/${findingId}/dismiss`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Failed to dismiss finding');
  return res.json();
}

export async function snoozeProactiveFinding(findingId: string, days: number = 7) {
  const res = await fetch(`${API_BASE}/citizen/proactive-findings/${findingId}/snooze`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ days }),
  });
  if (!res.ok) throw new Error('Failed to snooze finding');
  return res.json();
}

export async function scanProactiveFindings() {
  const res = await fetch(`${API_BASE}/citizen/proactive-findings/scan`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to run proactive scan');
  return res.json();
}

export async function launchProactiveFindingAction(findingId: string) {
  const res = await fetch(`${API_BASE}/citizen/proactive-findings/${findingId}/launch`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to launch finding action');
  return res.json();
}

export async function fetchActionCenterFeed() {
  const res = await fetch(`${API_BASE}/citizen/action-center`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load action center feed');
  return res.json();
}

export async function fetchConsentArtifacts() {
  const res = await fetch(`${API_BASE}/citizen/consent-artifacts`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to load consent artifacts');
  return res.json();
}

export async function revokeConsentArtifact(id: string) {
  const res = await fetch(`${API_BASE}/citizen/consent-artifacts/${id}/revoke`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to revoke consent artifact');
  return res.json();
}

// ==========================================
// UNIVERSAL CITIZEN REVIEW & AUTHORIZATION
// ==========================================

export async function fetchReviewSession(workflowRunId: string): Promise<ReviewSessionContract> {
  const res = await fetch(`${API_BASE}/workflows/${workflowRunId}/review`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch review session' }));
    throw new Error(err.error || 'Failed to fetch review session');
  }
  return res.json();
}

export async function editReviewField(
  workflowRunId: string,
  reviewSessionId: string,
  fieldKey: string,
  newValue: any
): Promise<ReviewSessionContract> {
  const res = await fetch(`${API_BASE}/workflows/${workflowRunId}/review/edit`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reviewSessionId, fieldKey, newValue }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update review field' }));
    throw new Error(err.error || 'Failed to update review field');
  }
  return res.json();
}

export async function authorizeReviewSession(
  workflowRunId: string,
  reviewSessionId: string,
  payloadHash: string,
  acceptedDeclarationIds: string[]
): Promise<{ authorized: boolean; authorizationToken: string; reviewSession: ReviewSessionContract }> {
  const res = await fetch(`${API_BASE}/workflows/${workflowRunId}/authorize`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reviewSessionId, payloadHash, acceptedDeclarationIds }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Authorization failed' }));
    throw new Error(err.error || 'Authorization failed');
  }
  return res.json();
}

export async function executeAuthorizedStep(
  workflowRunId: string,
  authorizationToken: string
): Promise<WorkflowRunSummary> {
  const res = await fetch(`${API_BASE}/workflows/${workflowRunId}/execute`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ authorizationToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Execution failed' }));
    throw new Error(err.error || 'Execution failed');
  }
  return res.json();
}



