import React, { useState, useEffect, useCallback } from 'react';
import type { WorkflowRunSummary } from '@indra/contracts';
import { Header, type NavTab } from './components/layout/Header.js';
import { PersonalGovernmentHome } from './components/dashboard/PersonalGovernmentHome.js';
import { DynamicWorkspaceRenderer } from './components/workspace/DynamicWorkspaceRenderer.js';
import { GovernmentInbox } from './components/inbox/GovernmentInbox.js';
import { DocumentVault } from './components/vault/DocumentVault.js';
import { TrustPrivacy } from './components/trust/TrustPrivacy.js';
import { CitizenTransitionConsole } from './components/transition/CitizenTransitionConsole.js';
import { WorldModelInspector } from './components/world-model/WorldModelInspector.js';
import { ActionPlanViewer } from './components/action-plans/ActionPlanViewer.js';
import { ProactiveFindingsBanner } from './components/action-plans/ProactiveFindingsBanner.js';
import { CloseIcon } from './components/icons.js';
import { formatHumanLabel } from './utils/civicFormatters.js';

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
  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'world-model', 'action-plans', 'transitions', 'inbox', 'vault', 'trust'].includes(hash)) {
        return hash as NavTab;
      }
    }
    return 'home';
  });

  const handleSelectTab = (tab: NavTab) => {
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
    setActiveTab(tab);
    setActiveWorkflowRun(null);
  };
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

    // Subscribe to hash changes for deep linking
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'world-model', 'action-plans', 'transitions', 'inbox', 'vault', 'trust'].includes(hash)) {
        setActiveTab(hash as NavTab);
        setActiveWorkflowRun(null);
      }
    };
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [loadData]);

  const handleSwitchCitizen = (citizenId: string) => {
    setActiveCitizenId(citizenId);
    setActiveWorkflowRun(null);
    setIsLoading(true);
    loadData();
  };

  const [appError, setAppError] = useState<string | null>(null);

  const handleLaunchWorkflow = async (
    workflowCode: string,
    initialContext?: Record<string, unknown>
  ) => {
    try {
      setAppError(null);
      const run = await startWorkflow(workflowCode, initialContext);
      setActiveWorkflowRun(run);
    } catch (err: any) {
      setAppError(`Unable to start action '${formatHumanLabel(workflowCode)}': ${err.message}`);
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
        onSelectTab={handleSelectTab}
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
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-6 space-y-4">
        {appError && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <span className="font-bold">Notice:</span>
              <span>{appError}</span>
            </div>
            <button
              onClick={() => setAppError(null)}
              className="text-rose-700 hover:text-rose-950 font-bold p-1 rounded cursor-pointer"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
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
                onSelectTab={handleSelectTab}
              />
            )}

            {activeTab === 'world-model' && (
              <WorldModelInspector citizenId={citizen?.id} />
            )}

            {activeTab === 'action-plans' && (
              <ActionPlanViewer citizen={citizen} />
            )}

            {activeTab === 'transitions' && (
              <CitizenTransitionConsole
                citizen={citizen}
                onRefreshCitizen={loadData}
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
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-semibold text-[#64748B]">
            INDRA — Sovereign Citizen Operating Layer · Synthetic Evaluation Environment
          </div>
          <div className="text-xs text-[#94A3B8]">
            Simulated public infrastructure demonstration. No live government databases are accessed or altered.
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
