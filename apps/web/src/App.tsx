import React, { useState, useEffect, useCallback } from 'react';
import type { WorkflowRunSummary } from '@indra/contracts';
import { Header, type NavTab } from './components/layout/Header.js';
import { PersonalGovernmentHome } from './components/dashboard/PersonalGovernmentHome.js';
import { DynamicWorkspaceRenderer } from './components/workspace/DynamicWorkspaceRenderer.js';
import { GovernmentInbox } from './components/inbox/GovernmentInbox.js';
import { DocumentVault } from './components/vault/DocumentVault.js';
import { TrustPrivacy } from './components/trust/TrustPrivacy.js';
import { CitizenActivityView } from './components/activity/CitizenActivityView.js';
import { WorldModelInspector } from './components/world-model/WorldModelInspector.js';
import { ActionPlanViewer } from './components/action-plans/ActionPlanViewer.js';
import { ProactiveFindingsBanner } from './components/action-plans/ProactiveFindingsBanner.js';
import { IndraAuthPortal } from './components/auth/IndraAuthPortal.js';
import { CloseIcon, IndraEmblemIcon } from './components/icons.js';
import { formatHumanLabel } from './utils/civicFormatters.js';

import {
  fetchCitizenProfile,
  fetchInbox,
  fetchVault,
  fetchApplications,
  fetchAuditLogs,
  fetchConsents,
  startWorkflow,
  subscribeEvents,
  fetchAuthMe,
  logout,
} from './api.js';

export function App() {
  const [authState, setAuthState] = useState<{
    isLoading: boolean;
    authenticated: boolean;
    user: any;
    citizen: any;
  }>({
    isLoading: true,
    authenticated: false,
    user: null,
    citizen: null,
  });

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
  const [inboxItems, setInboxItems] = useState<any[]>([]);
  const [vaultDocs, setVaultDocs] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [consents, setConsents] = useState<any[]>([]);
  const [activeWorkflowRun, setActiveWorkflowRun] = useState<WorkflowRunSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [prof, inb, vlt, apps, logs, cs] = await Promise.all([
        fetchCitizenProfile().catch(() => ({ citizen: null })),
        fetchInbox().catch(() => ({ items: [] })),
        fetchVault().catch(() => ({ documents: [] })),
        fetchApplications().catch(() => ({ applications: [] })),
        fetchAuditLogs().catch(() => ({ logs: [] })),
        fetchConsents().catch(() => ({ consents: [] })),
      ]);

      const citizenData = prof.citizen || prof.profile;
      if (citizenData) setCitizen(citizenData);
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

  // Initial Auth Check
  useEffect(() => {
    let isMounted = true;
    fetchAuthMe()
      .then((res) => {
        if (!isMounted) return;
        if (res.authenticated && res.citizen) {
          setAuthState({
            isLoading: false,
            authenticated: true,
            user: res.user,
            citizen: res.citizen,
          });
          setCitizen(res.citizen);
          loadData();
        } else {
          setAuthState({
            isLoading: false,
            authenticated: false,
            user: null,
            citizen: null,
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthState({
            isLoading: false,
            authenticated: false,
            user: null,
            citizen: null,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loadData]);

  const handleAuthenticated = (user: any, authCitizen: any) => {
    setAuthState({
      isLoading: false,
      authenticated: true,
      user,
      citizen: authCitizen,
    });
    setCitizen(authCitizen);
    loadData();
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    setAuthState({
      isLoading: false,
      authenticated: false,
      user: null,
      citizen: null,
    });
    setCitizen(null);
    setActiveWorkflowRun(null);
    setInboxItems([]);
    setVaultDocs([]);
    setApplications([]);
    setAuditLogs([]);
    setConsents([]);
    setAppError(null);
    window.location.hash = 'home';
  };

  useEffect(() => {
    if (!authState.authenticated) return;

    // Subscribe to SSE Event Stream for live system updates
    const unsubscribe = subscribeEvents((event) => {
      if (event.aggregateType === 'WORKFLOW') {
        fetchApplications().then((a) => setApplications(a.applications || [])).catch(() => {});
        fetchAuditLogs().then((l) => setAuditLogs(l.logs || [])).catch(() => {});
        fetchConsents().then((c) => setConsents(c.consents || [])).catch(() => {});
      }
    });

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
  }, [authState.authenticated]);

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
    fetchApplications().then((a) => setApplications(a.applications || [])).catch(() => {});
    fetchAuditLogs().then((l) => setAuditLogs(l.logs || [])).catch(() => {});
    fetchConsents().then((c) => setConsents(c.consents || [])).catch(() => {});
  };

  const handleCloseWorkspace = () => {
    setActiveWorkflowRun(null);
    loadData();
  };

  const unreadCount = inboxItems.filter((i) => !i.isRead).length;

  // 1. Loading Gateway Splash
  if (authState.isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-[#0F172A] flex items-center justify-center p-2.5 text-white shadow-sm animate-pulse">
          <IndraEmblemIcon className="w-7 h-7 text-white" />
        </div>
        <div className="mt-4 text-xs font-bold uppercase tracking-widest text-[#0F172A]">
          Verifying Sovereign Citizen Session...
        </div>
        <div className="mt-1 text-[11px] text-[#64748B]">
          Universal Public Operating Layer
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Citizen Gateway
  if (!authState.authenticated) {
    return <IndraAuthPortal onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0F172A] font-sans">
      {/* 1. CIVIC HEADER WITH AUTHENTICATED PROFILE & LOGOUT */}
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
        onLogout={handleLogout}
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
              <CitizenActivityView
                citizen={citizen}
                onRefreshCitizen={loadData}
                onNavigateToRecords={() => handleSelectTab('world-model')}
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

      {/* 3. CIVIC FOOTER */}
      <footer className="border-t border-[#E2E8F0] bg-white py-6 text-center text-xs text-slate-500">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-bold text-slate-700 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>INDRA PROTOTYPE · SYNTHETIC PUBLIC INFRASTRUCTURE</span>
          </div>
          <div className="text-xs text-slate-400">
            Operating against simulated public registries for research, architectural certification & demonstration.
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
