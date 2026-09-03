import React, { useState, useEffect, useCallback } from 'react';
import type { WorkflowRunSummary } from '@indra/contracts';
import { Header, type NavTab } from './components/layout/Header.js';
import { PersonalGovernmentHome } from './components/dashboard/PersonalGovernmentHome.js';
import { DynamicWorkspaceRenderer } from './components/workspace/DynamicWorkspaceRenderer.js';
import { GovernmentInbox } from './components/inbox/GovernmentInbox.js';
import { DocumentVault } from './components/vault/DocumentVault.js';
import { TrustPrivacy } from './components/trust/TrustPrivacy.js';
import {
  fetchCitizenProfile,
  fetchInbox,
  fetchVault,
  fetchApplications,
  fetchAuditLogs,
  fetchConsents,
  startWorkflow,
  subscribeEvents,
} from './api.js';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [citizen, setCitizen] = useState<any>(null);
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [vaultDocs, setVaultDocs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [activeWorkflowRun, setActiveWorkflowRun] = useState<WorkflowRunSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [prof, inb, vlt, apps, logs, cs] = await Promise.all([
        fetchCitizenProfile().catch(() => ({ citizen: null })),
        fetchInbox().catch(() => ({ items: [] })),
        fetchVault().catch(() => ({ documents: [] })),
        fetchApplications().catch(() => ({ applications: [] })),
        fetchAuditLogs().catch(() => ({ logs: [] })),
        fetchConsents().catch(() => ({ consents: [] })),
      ]);

      if (prof.citizen) setCitizen(prof.citizen);
      setInboxItems(inb.items || []);
      setVaultDocs(vlt.documents || []);
      setApplications(apps.applications || []);
      setAuditLogs(logs.logs || []);
      setConsents(cs.consents || []);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to SSE Event Stream for live system updates
    const unsubscribe = subscribeEvents((event) => {
      // Refresh applications and audit logs on any workflow state change
      if (
        event.type?.startsWith('WORKFLOW_') ||
        event.type?.startsWith('APPLICATION_') ||
        event.type?.startsWith('CAPABILITY_')
      ) {
        loadData();
      }
    });

    return () => unsubscribe();
  }, [loadData]);

  const handleLaunchWorkflow = async (
    workflowCode: string,
    initialContext?: Record<string, unknown>
  ) => {
    try {
      setIsLoading(true);
      const run = await startWorkflow(workflowCode, initialContext);
      setActiveWorkflowRun(run);
    } catch (err: any) {
      alert(`Failed to launch workflow: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWorkflowUpdated = (updated: WorkflowRunSummary) => {
    setActiveWorkflowRun(updated);
    loadData();
  };

  const handleExitWorkspace = () => {
    setActiveWorkflowRun(null);
    loadData();
  };

  const unreadCount = inboxItems.filter((i) => i.status === 'UNREAD').length;

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col selection:bg-[#0F172A] selection:text-white">
      {/* HEADER */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setActiveWorkflowRun(null);
        }}
        inboxUnreadCount={unreadCount}
        citizenName={citizen?.primaryName || 'Priya Sharma'}
        citizenLocation={`${citizen?.currentCity || 'Bengaluru'}, ${citizen?.currentState || 'KA'}`}
      />

      {/* MAIN CONTENT CANVAS */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-8 pb-16">
        {activeWorkflowRun ? (
          <DynamicWorkspaceRenderer
            workflowRun={activeWorkflowRun}
            citizen={citizen}
            onWorkflowUpdated={handleWorkflowUpdated}
            onExitWorkspace={handleExitWorkspace}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <PersonalGovernmentHome
                citizen={citizen}
                applications={applications}
                onLaunchWorkflow={handleLaunchWorkflow}
                onSelectTab={setActiveTab}
              />
            )}

            {activeTab === 'inbox' && (
              <GovernmentInbox
                inboxItems={inboxItems}
                onLaunchWorkflow={handleLaunchWorkflow}
              />
            )}

            {activeTab === 'vault' && (
              <DocumentVault
                documents={vaultDocs}
                onLaunchWorkflow={handleLaunchWorkflow}
              />
            )}

            {activeTab === 'trust' && (
              <TrustPrivacy
                auditLogs={auditLogs}
                consents={consents}
              />
            )}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#E2E8F0] bg-white py-6 text-center text-xs text-[#94A3B8]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>INDRA — Sovereign Citizen Operating Layer of India</div>
          <div>All transactions cryptographically verified and audited under statutory law.</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
