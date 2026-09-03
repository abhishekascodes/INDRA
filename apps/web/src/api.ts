import type {
  WorkflowRunSummary,
  StructuredIntent,
} from '@indra/contracts';

const API_BASE = '/api';

export async function fetchCitizenProfile() {
  const res = await fetch(`${API_BASE}/citizen/me`);
  if (!res.ok) throw new Error('Failed to load citizen profile');
  return res.json();
}

export async function fetchInbox() {
  const res = await fetch(`${API_BASE}/citizen/inbox`);
  if (!res.ok) throw new Error('Failed to load inbox items');
  return res.json();
}

export async function fetchVault() {
  const res = await fetch(`${API_BASE}/citizen/vault`);
  if (!res.ok) throw new Error('Failed to load vault documents');
  return res.json();
}

export async function fetchApplications() {
  const res = await fetch(`${API_BASE}/applications`);
  if (!res.ok) throw new Error('Failed to load applications');
  return res.json();
}

export async function fetchAuditLogs() {
  const res = await fetch(`${API_BASE}/trust/audit-logs`);
  if (!res.ok) throw new Error('Failed to load audit logs');
  return res.json();
}

export async function fetchConsents() {
  const res = await fetch(`${API_BASE}/trust/consents`);
  if (!res.ok) throw new Error('Failed to load consents');
  return res.json();
}

export async function resolveIntent(query: string): Promise<StructuredIntent> {
  const res = await fetch(`${API_BASE}/intent/resolve`, {
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
  const res = await fetch(`${API_BASE}/workflows/start`, {
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
  const res = await fetch(`${API_BASE}/workflows/${runId}/resume`, {
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
