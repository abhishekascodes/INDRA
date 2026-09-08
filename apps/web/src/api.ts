import type {
  WorkflowRunSummary,
  StructuredIntent,
  ReviewSessionContract,
  CitizenStateTransition,
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

import { handleStandaloneApi } from './standalone-engine.js';

async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  try {
    const headers = getHeaders((init.headers as Record<string, string>) || {});
    const res = await fetch(input, {
      ...init,
      headers,
      credentials: 'include',
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.status !== 404 && res.status !== 502 && res.status !== 503 && contentType.includes('application/json')) {
      return res;
    }
  } catch {
    // Backend offline: fall through to autonomous in-browser engine
  }

  return handleStandaloneApi(input, init);
}

export interface AuthMeResponse {
  authenticated: boolean;
  user: { id: string; email: string; role: string } | null;
  citizen: { id: string; primaryName: string; currentCity: string; currentState: string } | null;
  session?: { id: string; expiresAt: string; createdAt: string };
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  const res = await apiFetch(`${API_BASE}/auth/me`);
  if (!res.ok) return { authenticated: false, user: null, citizen: null };
  return res.json();
}

export async function login(credentials: { email: string; password: string }) {
  const res = await apiFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to sign in');
  }
  return data;
}

export async function signup(payload: {
  email: string;
  password: string;
  fullName: string;
  city?: string;
  state?: string;
  syntheticChallenge: string;
}) {
  const res = await apiFetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to create citizen account');
  }
  return data;
}

export async function logout() {
  const res = await apiFetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
  });
  return res.json();
}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  if (activeCitizenId) {
    headers['x-citizen-id'] = activeCitizenId;
  }
  return headers;
}

export async function fetchSyntheticCitizensList() {
  const res = await apiFetch(`${API_BASE}/citizens/synthetic-list`);
  if (!res.ok) throw new Error('Failed to load synthetic citizens list');
  return res.json();
}

export async function fetchCitizenProfile() {
  const res = await apiFetch(`${API_BASE}/citizen/me`);
  if (!res.ok) throw new Error('Failed to load citizen profile');
  return res.json();
}

export async function fetchWorldModel() {
  const res = await apiFetch(`${API_BASE}/citizen/world-model`);
  if (!res.ok) throw new Error('Failed to load citizen world model');
  return res.json();
}

export async function fetchInbox() {
  const res = await apiFetch(`${API_BASE}/citizen/inbox`);
  if (!res.ok) throw new Error('Failed to load inbox items');
  return res.json();
}

export async function fetchVault() {
  const res = await apiFetch(`${API_BASE}/citizen/vault`);
  if (!res.ok) throw new Error('Failed to load vault documents');
  return res.json();
}

export async function fetchApplications() {
  const res = await apiFetch(`${API_BASE}/applications`);
  if (!res.ok) throw new Error('Failed to load applications');
  return res.json();
}

export async function fetchAuditLogs() {
  const res = await apiFetch(`${API_BASE}/trust/audit-logs`);
  if (!res.ok) throw new Error('Failed to load audit logs');
  return res.json();
}

export async function fetchConsents() {
  const res = await apiFetch(`${API_BASE}/trust/consents`);
  if (!res.ok) throw new Error('Failed to load consents');
  return res.json();
}

export async function fetchRelocationImpact(
  destinationCity = 'Bengaluru',
  destinationState = 'Karnataka'
) {
  const res = await apiFetch(`${API_BASE}/citizen/life-events/relocation-impact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destinationCity, destinationState }),
  });
  if (!res.ok) throw new Error('Failed to synthesize relocation impact');
  return res.json();
}

export async function resolveIntent(query: string): Promise<StructuredIntent> {
  const res = await apiFetch(`${API_BASE}/intent/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error('Failed to resolve intent');
  return res.json();
}

export async function startWorkflow(
  workflowCode: string,
  initialContext?: Record<string, unknown>
): Promise<WorkflowRunSummary> {
  const res = await apiFetch(`${API_BASE}/workflows/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflowCode, initialContext }),
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
  const res = await apiFetch(`${API_BASE}/workflows/${runId}/resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await apiFetch(`${API_BASE}/citizen/action-plans`);
  if (!res.ok) throw new Error('Failed to load action plans');
  return res.json();
}

export async function fetchActionPlan(planId: string) {
  const res = await apiFetch(`${API_BASE}/citizen/action-plans/${planId}`);
  if (!res.ok) throw new Error('Failed to load action plan');
  return res.json();
}

export async function generateActionPlan(
  lifeEventCode: string,
  context?: Record<string, unknown>
) {
  const res = await apiFetch(`${API_BASE}/citizen/action-plans/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await apiFetch(`${API_BASE}/citizen/action-plans/${planId}/execute-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stepKey, authorize, overrideInput }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to execute plan step');
  }
  return res.json();
}

export async function fetchProactiveFindings() {
  const res = await apiFetch(`${API_BASE}/citizen/proactive-findings`);
  if (!res.ok) throw new Error('Failed to load proactive findings');
  return res.json();
}

export async function dismissProactiveFinding(findingId: string, reason?: string) {
  const res = await apiFetch(`${API_BASE}/citizen/proactive-findings/${findingId}/dismiss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error('Failed to dismiss finding');
  return res.json();
}

export async function snoozeProactiveFinding(findingId: string, days: number = 7) {
  const res = await apiFetch(`${API_BASE}/citizen/proactive-findings/${findingId}/snooze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days }),
  });
  if (!res.ok) throw new Error('Failed to snooze finding');
  return res.json();
}

export async function scanProactiveFindings() {
  const res = await apiFetch(`${API_BASE}/citizen/proactive-findings/scan`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to run proactive scan');
  return res.json();
}

export async function launchProactiveFindingAction(findingId: string) {
  const res = await apiFetch(`${API_BASE}/citizen/proactive-findings/${findingId}/launch`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to launch finding action');
  return res.json();
}

export async function fetchActionCenterFeed() {
  const res = await apiFetch(`${API_BASE}/citizen/action-center`);
  if (!res.ok) throw new Error('Failed to load action center feed');
  return res.json();
}

export async function fetchConsentArtifacts() {
  const res = await apiFetch(`${API_BASE}/citizen/consent-artifacts`);
  if (!res.ok) throw new Error('Failed to load consent artifacts');
  return res.json();
}

export async function revokeConsentArtifact(id: string) {
  const res = await apiFetch(`${API_BASE}/citizen/consent-artifacts/${id}/revoke`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to revoke consent artifact');
  return res.json();
}

// ==========================================
// UNIVERSAL CITIZEN REVIEW & AUTHORIZATION
// ==========================================

export async function fetchReviewSession(workflowRunId: string): Promise<ReviewSessionContract> {
  const res = await apiFetch(`${API_BASE}/workflows/${workflowRunId}/review`);
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
  const res = await apiFetch(`${API_BASE}/workflows/${workflowRunId}/review/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await apiFetch(`${API_BASE}/workflows/${workflowRunId}/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await apiFetch(`${API_BASE}/workflows/${workflowRunId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorizationToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Execution failed' }));
    throw new Error(err.error || 'Execution failed');
  }
  return res.json();
}

// ==========================================
// CITIZEN STATE-TRANSITION ENGINE
// ==========================================

export async function initiateTransition(
  query: string,
  context?: Record<string, unknown>
): Promise<CitizenStateTransition> {
  const res = await apiFetch(`${API_BASE}/transitions/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, context }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to initiate transition' }));
    throw new Error(err.error || 'Failed to initiate transition');
  }
  const data = await res.json();
  return data.transition || data;
}

export async function fetchTransition(transitionId: string): Promise<CitizenStateTransition> {
  const res = await apiFetch(`${API_BASE}/transitions/${transitionId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to load transition' }));
    throw new Error(err.error || 'Failed to load transition');
  }
  const data = await res.json();
  return data.transition || data;
}

export async function fetchCitizenTransitions(): Promise<CitizenStateTransition[]> {
  const res = await apiFetch(`${API_BASE}/citizen/transitions`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to load transitions' }));
    throw new Error(err.error || 'Failed to load transitions');
  }
  const data = await res.json();
  return data.transitions || [];
}

export async function authorizeTransition(
  transitionId: string,
  authorizationToken?: string
): Promise<CitizenStateTransition> {
  const res = await apiFetch(`${API_BASE}/transitions/${transitionId}/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorizationToken: authorizationToken || `AUTH-TOKEN-${Date.now()}` }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to authorize transition' }));
    throw new Error(err.error || 'Failed to authorize transition');
  }
  const data = await res.json();
  return data.transition || data;
}

export async function executeTransition(transitionId: string): Promise<CitizenStateTransition> {
  const res = await apiFetch(`${API_BASE}/transitions/${transitionId}/execute`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to execute transition' }));
    throw new Error(err.error || 'Failed to execute transition');
  }
  const data = await res.json();
  return data.transition || data;
}

export async function resumeTransition(transitionId: string): Promise<CitizenStateTransition> {
  const res = await apiFetch(`${API_BASE}/transitions/${transitionId}/resume`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to resume transition' }));
    throw new Error(err.error || 'Failed to resume transition');
  }
  const data = await res.json();
  return data.transition || data;
}

export async function resolveTransitionContradiction(
  transitionId: string,
  contradictionId: string,
  action: 'RESOLVE' | 'DISMISS' = 'RESOLVE'
): Promise<CitizenStateTransition> {
  const res = await apiFetch(`${API_BASE}/transitions/${transitionId}/resolve-contradiction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contradictionId, action }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to resolve contradiction' }));
    throw new Error(err.error || 'Failed to resolve contradiction');
  }
  const data = await res.json();
  return data.transition || data;
}

export async function setFaultSimulation(options: {
  failNextPropertyRequest?: boolean;
  simulatePropertyOutage?: boolean;
  injectDeedContradiction?: boolean;
}): Promise<{ success: boolean; simulationStatus: any }> {
  const res = await apiFetch(`${API_BASE}/simulation/fault-injection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to set fault simulation' }));
    throw new Error(err.error || 'Failed to set fault simulation');
  }
  return res.json();
}

export async function fetchFaultSimulationStatus(): Promise<{
  simulatePropertyOutage: boolean;
  failNextPropertyRequest: boolean;
  injectDeedContradiction: boolean;
}> {
  const res = await apiFetch(`${API_BASE}/simulation/status`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch simulation status' }));
    throw new Error(err.error || 'Failed to fetch simulation status');
  }
  return res.json();
}

export async function executeCapability(
  capabilityId: string,
  input: Record<string, unknown> = {},
  authorize: boolean = false
) {
  const res = await apiFetch(`${API_BASE}/capabilities/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ capabilityId, input, authorize }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to execute capability');
  }
  return res.json();
}

export async function fetchCapabilitiesList() {
  const res = await apiFetch(`${API_BASE}/capabilities`);
  if (!res.ok) throw new Error('Failed to load capabilities list');
  return res.json();
}

export async function resetSyntheticWorkspace(): Promise<{
  success: boolean;
  message: string;
  citizenId: string;
  baseline: any;
}> {
  const res = await apiFetch(`${API_BASE}/citizen/reset-workspace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reset synthetic workspace');
  }
  return data;
}

