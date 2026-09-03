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
  fetchSyntheticCitizensList,
  startWorkflow,
  subscribeEvents,
  setActiveCitizenId,
  getActiveCitizenId,
} from './api.js';

export function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [citizen, setCitizen] = useState<any>(null);
  const [availableCitizens, setAvailableCitizens] = useState<any[]>([]);
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [vaultDocs, setVaultDocs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [activeWorkflowRun, setActiveWorkflowRun] = useState<WorkflowRunSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [prof, inb, vlt, apps, logs, cs, citizenList] = await Promise.all([
        fetchCitizenProfile().catch(() => ({ citizen: null })),
        fetchInbox().catch(() => ({ items: [] })),
        fetchVault().catch(() => ({ documents: [] })),
        fetchApplications().catch(() => ({ applications: [] })),
        fetchAuditLogs().catch(() => ({ logs: [] })),
        fetchConsents().catch(() => ({ consents: [] })),
        fetchSyntheticCitizensList().catch(() => ({ citizens: [] })),
      ]);

      const citizenData = prof.citizen || prof.profile;
      if (citizenData) setCitizen(citizenData);
      setInboxItems(inb.items || []);
      setVaultDocs(vlt.documents || []);
      setApplications(apps.applications || []);
      setAuditLogs(logs.logs || []);
      setConsents(cs.consents || []);
      if (citizenList.citizens && citizenList.citizens.length > 0) {
        setAvailableCitizens(citizenList.citizens);
      }
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
      if (event.aggregateType === 'WORKFLOW') {
        fetchApplications().then((a) => setApplications(a.applications || [])).catch(() => {});
        fetchAuditLogs().then((l) => setAuditLogs(l.logs || [])).catch(() => {});
        fetchConsents().then((c) => setConsents(c.consents || [])).catch(() => {});
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const handleSwitchCitizen = (citizenId: string) => {
    setActiveCitizenId(citizenId);
    setActiveWorkflowRun(null);
    setIsLoading(true);
    loadData();
  };

  const handleLaunchWorkflow = async (
    workflowCode: string,
    initialContext?: Record<string, unknown>
  ) => {
    try {
      const run = await startWorkflow(workflowCode, initialContext);
      setActiveWorkflowRun(run);
    } catch (err: any) {
      alert(`Failed to start action: ${err.message}`);
    }
  };

  const handleWorkflowUpdated = (updatedRun: WorkflowRunSummary) => {
    setActiveWorkflowRun(updatedRun);
    // Refresh background state
    fetchApplications().then((a) => setApplications(a.applications || [])).catch(() => {});
    fetchAuditLogs().then((l) => setAuditLogs(l.logs || [])).catch(() => {});
    fetchConsents().then((c) => setConsents(c.consents || [])).catch(() => {});
  };

  const handleCloseWorkspace = () => {
    setActiveWorkflowRun(null);
    loadData();
  };

  const unreadCount = inboxItems.filter((i) => !i.isRead).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0F172A] font-sans">
      {/* 1. CIVIC HEADER WITH SYNTHETIC DISCLOSURE & CITIZEN SWITCHER */}
      <Header
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setActiveWorkflowRun(null);
        }}
        inboxUnreadCount={unreadCount}
        citizenName={citizen?.primaryName}
        citizenLocation={
          citizen?.currentCity && citizen?.currentState
            ? `${citizen.currentCity}, ${citizen.currentState}`
            : undefined
        }
        availableCitizens={availableCitizens}
        activeCitizenId={getActiveCitizenId() || citizen?.id}
        onSwitchCitizen={handleSwitchCitizen}
      />

      {/* 2. MAIN APPLICATION CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-[#64748B]">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-[#0F172A] border-t-transparent rounded-full mb-3"></div>
            <div>Synchronizing verified public records...</div>
          </div>
        ) : activeWorkflowRun ? (
          /* ACTIVE TASK WORKSPACE */
          <DynamicWorkspaceRenderer
            workflowRun={activeWorkflowRun}
            citizen={citizen}
            onWorkflowUpdated={handleWorkflowUpdated}
            onExitWorkspace={handleCloseWorkspace}
          />
        ) : (
          /* REGULAR PORTAL SCREENS */
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

      {/* 3. CIVIC FOOTER WITH SYNTHETIC ENVIRONMENT NOTICE */}
      <footer className="border-t border-[#E2E8F0] bg-white py-6 text-center text-xs text-[#94A3B8]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-semibold text-[#64748B]">
            INDRA — Sovereign Citizen Operating Layer · Synthetic Evaluation Environment
          </div>
          <div className="text-[11px] text-[#94A3B8]">
            Simulated public infrastructure demonstration. No live government databases are accessed or altered.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
