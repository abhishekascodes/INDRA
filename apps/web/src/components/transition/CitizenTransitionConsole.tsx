import React, { useState, useEffect, useCallback } from 'react';
import type { CitizenStateTransition } from '@indra/contracts';
import {
  initiateTransition,
  fetchTransition,
  fetchCitizenTransitions,
  authorizeTransition,
  executeTransition,
  resumeTransition,
  resolveTransitionContradiction,
} from '../../api.js';
import { DemoSimulationControls } from './DemoSimulationControls.js';
import {
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  RefreshIcon,
  ArrowRightIcon,
  BuildingIcon,
  LockIcon,
  FileTextIcon,
  MapPinIcon,
  AlertCircleIcon,
  IndraEmblemIcon,
} from '../icons.js';
import { formatHumanLabel } from '../../utils/civicFormatters.js';

interface CitizenTransitionConsoleProps {
  citizen: any;
  onRefreshCitizen?: () => void;
}

export function CitizenTransitionConsole({
  citizen,
  onRefreshCitizen,
}: CitizenTransitionConsoleProps) {
  const [query, setQuery] = useState('I moved to Bangalore and bought a plot in Devanahalli.');
  const [activeTransition, setActiveTransition] = useState<CitizenStateTransition | null>(null);
  const [recentTransitions, setRecentTransitions] = useState<CitizenStateTransition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTransitions = useCallback(async () => {
    try {
      const list = await fetchCitizenTransitions();
      setRecentTransitions(list);
      if (list.length > 0 && !activeTransition) {
        setActiveTransition(list[0]);
      }
    } catch (err: any) {
      console.warn('Could not load existing transitions:', err);
    }
  }, [activeTransition]);

  useEffect(() => {
    loadTransitions();
  }, [citizen?.id, loadTransitions]);

  const handleInitiate = async (textToSubmit?: string) => {
    const q = textToSubmit || query;
    if (!q.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const transition = await initiateTransition(q, {
        destinationCity: 'Bengaluru',
        destinationState: 'Karnataka',
        surveyNumber: '142/3',
        village: 'Devanahalli',
      });
      setActiveTransition(transition);
      await loadTransitions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initiate state transition');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveContradiction = async (contradictionId: string) => {
    if (!activeTransition) return;
    setIsActionRunning(true);
    setErrorMsg(null);
    try {
      const updated = await resolveTransitionContradiction(
        activeTransition.id,
        contradictionId,
        'RESOLVE'
      );
      setActiveTransition(updated);
      await loadTransitions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resolve contradiction');
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleAuthorize = async () => {
    if (!activeTransition) return;
    setIsActionRunning(true);
    setErrorMsg(null);
    try {
      const authorized = await authorizeTransition(
        activeTransition.id,
        `AUTH-LEAP-${Date.now()}`
      );
      setActiveTransition(authorized);

      // Proactively trigger execution loop
      const executed = await executeTransition(activeTransition.id);
      setActiveTransition(executed);
      await loadTransitions();
      if (onRefreshCitizen && executed.state === 'COMPLETED') {
        onRefreshCitizen();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to authorize/execute transition');
      // Refresh transition state to display accurate checkpoint
      if (activeTransition) {
        fetchTransition(activeTransition.id)
          .then((t) => setActiveTransition(t))
          .catch(() => {});
      }
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleResume = async () => {
    if (!activeTransition) return;
    setIsActionRunning(true);
    setErrorMsg(null);
    try {
      const resumed = await resumeTransition(activeTransition.id);
      setActiveTransition(resumed);
      await loadTransitions();
      if (onRefreshCitizen && resumed.state === 'COMPLETED') {
        onRefreshCitizen();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resume transition');
      if (activeTransition) {
        fetchTransition(activeTransition.id)
          .then((t) => setActiveTransition(t))
          .catch(() => {});
      }
    } finally {
      setIsActionRunning(false);
    }
  };

  const hasBlockingContradiction = Boolean(
    activeTransition?.contradictions?.some(
      (c) => c.blockingStatus === 'BLOCKING' && c.resolutionState === 'UNRESOLVED'
    )
  );

  return (
    <div className="space-y-6">
      {/* 1. SYNTHETIC INSTITUTIONAL SIMULATION & FAULT INJECTION CONTROLS */}
      <DemoSimulationControls
        onScenarioSelect={(scenarioQuery) => {
          setQuery(scenarioQuery);
          handleInitiate(scenarioQuery);
        }}
        onStatusChanged={() => {
          if (activeTransition) {
            fetchTransition(activeTransition.id)
              .then((t) => setActiveTransition(t))
              .catch(() => {});
          }
        }}
      />

      {/* 2. TOP HERO CARD: WHAT CHANGED OR WHAT DO YOU WANT? */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm">
              <RefreshIcon className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">Citizen State-Transition Engine</h2>
              <p className="text-xs text-[#64748B]">
                Transform real-world citizen events into dynamically derived, stateful transitions across sovereign public institutions.
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex px-3 py-1 bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] rounded-full text-2xs font-bold items-center space-x-1.5">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Forward-Recoverable Saga</span>
          </span>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleInitiate();
          }}
          className="space-y-3"
        >
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. I moved to Bangalore and bought a plot in Devanahalli..."
              className="w-full pl-4 pr-32 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-2 bottom-2 px-4 rounded-lg bg-[#0F172A] hover:bg-black text-white text-xs font-bold transition shadow-2xs disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
            >
              {isLoading ? (
                <span>Deriving...</span>
              ) : (
                <>
                  <span>Evaluate Transition</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-2xs font-bold text-[#64748B]">Quick Life Events:</span>
            {[
              'I moved to Bangalore and bought a plot in Devanahalli.',
              'I joined a new company in Hyderabad as Senior Engineer.',
              'I started a consulting enterprise in Mumbai.',
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(preset);
                  handleInitiate(preset);
                }}
                className="px-2.5 py-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white text-2xs font-medium text-[#475569] transition cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>
        </form>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center space-x-2">
            <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* 3. ACTIVE TRANSITION CARD */}
      {activeTransition ? (
        <div className="space-y-6">
          {/* Transition Status Banner */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
              <div>
                <div className="text-2xs font-bold text-[#64748B] uppercase tracking-wider mb-1">
                  Active Civic Transition · ID: {activeTransition.id.slice(0, 8)}...
                </div>
                <h3 className="text-lg font-bold text-[#0F172A]">
                  {activeTransition.targetOutcome || activeTransition.initiatingQuery}
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1.5 ${
                    activeTransition.state === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-900'
                      : activeTransition.state === 'SUSPENDED'
                      ? 'bg-amber-100 text-amber-900 animate-pulse'
                      : activeTransition.state === 'CONTRADICTION_BLOCKED'
                      ? 'bg-rose-100 text-rose-900'
                      : activeTransition.state === 'AUTHORIZED' || activeTransition.state === 'EXECUTING'
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <span>{formatHumanLabel(activeTransition.state)}</span>
                </span>
              </div>
            </div>

            {/* STAGE 1: INDRA UNDERSTOOD (Civic Impact Decomposition) */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-2xs font-bold text-[#64748B] uppercase mb-1">
                  Affected Public Registries
                </div>
                <div className="text-xs font-bold text-[#0F172A]">
                  {activeTransition.consequenceGraph?.affectedInstitutions?.length || 0} Authorities
                </div>
                <div className="text-2xs text-[#64748B] mt-1 line-clamp-2">
                  {activeTransition.consequenceGraph?.affectedInstitutions?.join(' · ')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-2xs font-bold text-[#64748B] uppercase mb-1">
                  Required Statutory Actions
                </div>
                <div className="text-xs font-bold text-[#0F172A]">
                  {activeTransition.proposedPlan?.steps?.length || 0} Sequenced Actions
                </div>
                <div className="text-2xs text-[#64748B] mt-1">
                  Estimated duration:{' '}
                  {activeTransition.proposedPlan?.estimatedDays || 14} working days
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div className="text-2xs font-bold text-[#64748B] uppercase mb-1">
                  Contradictions Flagged
                </div>
                <div className="text-xs font-bold text-[#0F172A]">
                  {activeTransition.contradictions?.length || 0} Public Discrepancies
                </div>
                <div className="text-2xs text-[#64748B] mt-1">
                  {hasBlockingContradiction ? (
                    <span className="text-rose-700 font-bold">Action blocked until reconciled</span>
                  ) : (
                    <span className="text-emerald-700 font-bold">All registries reconciled</span>
                  )}
                </div>
              </div>
            </div>

            {/* STAGE 2: FIRST-CLASS CONTRADICTION BANNER & ONE-CLICK RESOLUTION */}
            {activeTransition.contradictions && activeTransition.contradictions.length > 0 && (
              <div className="mt-6 space-y-3">
                {(activeTransition.contradictions || []).map((c) => (
                  <div
                    key={c.id}
                    className={`p-4 rounded-xl border ${
                      c.resolutionState === 'RESOLVED'
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-amber-50 border-amber-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5 shrink-0">
                          {c.resolutionState === 'RESOLVED' ? (
                            <CheckCircle2Icon className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <AlertTriangleIcon className="w-5 h-5 text-amber-700" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-[#0F172A]">
                              Cross-Registry Contradiction: {formatHumanLabel(c.field)}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-2xs font-bold ${
                                c.resolutionState === 'RESOLVED'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-amber-200 text-amber-950'
                              }`}
                            >
                              {c.resolutionState === 'RESOLVED' ? 'RECONCILED' : 'ACTION REQUIRED'}
                            </span>
                          </div>
                          <p className="text-xs text-[#334155] mt-1">{c.whatConflicts}</p>
                          <div className="text-2xs text-[#64748B] mt-1">
                            <span className="font-semibold">Why this matters:</span> {c.whyItMatters}
                          </div>
                        </div>
                      </div>

                      {c.resolutionState === 'UNRESOLVED' && (
                        <div className="shrink-0 flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleResolveContradiction(c.id)}
                            disabled={isActionRunning}
                            className="px-3.5 py-2 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                          >
                            <span>
                              {c.resolutionStrategy
                                ? `Authorize ${formatHumanLabel(c.resolutionStrategy)}`
                                : 'Authorize Identity Harmonization'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* STAGE 3: OUTAGE & SAFE FORWARD SUSPENSION NOTICE */}
            {activeTransition.state === 'SUSPENDED' && (
              <div className="mt-6 p-4 rounded-xl border border-amber-300 bg-amber-50 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <ClockIcon className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-amber-950">
                          External Public Registry Temporarily Unavailable (503)
                        </span>
                        <span className="px-2 py-0.5 rounded text-2xs font-bold bg-amber-200 text-amber-950">
                          DURABLY PAUSED AT CHECKPOINT
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 mt-1">
                        Bhoomi / Kaveri Land Records reported a transient 503 gateway timeout. Your transition has been safely suspended.
                      </p>
                      <p className="text-2xs text-amber-800 font-medium mt-1">
                        All prior completed steps remain securely registered. No rollback was performed. You can safely resume once the node recovers.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={handleResume}
                      disabled={isActionRunning}
                      className="px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" />
                      <span>{isActionRunning ? 'Resuming...' : 'Resume Transition'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 4: PROPOSED STATUTORY PLAN & PREREQUISITES */}
            <div className="mt-6">
              <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                Sequenced Transition Plan
              </h4>

              <div className="space-y-2.5">
                {(activeTransition.proposedPlan?.steps || []).map((step, idx) => {
                  const cp = activeTransition.executionCheckpoints?.[step.stepKey];
                  const status = cp?.state || 'PENDING';

                  return (
                    <div
                      key={step.stepKey}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                        status === 'SUCCEEDED'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : status === 'SUSPENDED'
                          ? 'bg-amber-50/70 border-amber-300'
                          : status === 'BLOCKED'
                          ? 'bg-gray-50 border-gray-200 opacity-75'
                          : 'bg-white border-[#CBD5E1]'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-2xs font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-[#0F172A]">{step.title}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-2xs font-bold ${
                                status === 'SUCCEEDED'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : status === 'SUSPENDED'
                                  ? 'bg-amber-100 text-amber-900'
                                  : status === 'BLOCKED'
                                  ? 'bg-gray-200 text-gray-700'
                                  : 'bg-blue-100 text-blue-900'
                              }`}
                            >
                              {status}
                            </span>
                          </div>
                          <div className="text-2xs text-[#64748B] mt-0.5">
                            Authority: {step.authority} · Mode: {formatHumanLabel(step.executionMode)}
                          </div>
                          {cp?.errorReason && (
                            <div className="text-2xs text-rose-700 mt-1 font-semibold">
                              Node notice: {cp.errorReason}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-2xs font-bold text-[#0F172A]">
                          {step.statutoryFeeInr > 0 ? `₹${step.statutoryFeeInr}` : 'No Fee'}
                        </div>
                        <div className="text-2xs text-[#64748B]">
                          {step.estimatedDays} {step.estimatedDays === 1 ? 'day' : 'days'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STAGE 5: STATUTORY AUTHORIZATION CARD */}
            {activeTransition.state === 'AWAITING_AUTHORIZATION' && (
              <div className="mt-6 p-5 rounded-2xl bg-[#0F172A] text-white shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-2xs font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center space-x-1.5">
                      <ShieldCheckIcon className="w-4 h-4" />
                      <span>Universal Citizen Review & Statutory Authorization</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">
                      Authorize State-Transition Execution
                    </h4>
                    <p className="text-xs text-gray-300 mt-1 max-w-xl">
                      Executing this transition will orchestrate statutory mutations with Kaveri 2.0, Bhoomi Land Records, UIDAI, and the Sovereign Credentials Exchange.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAuthorize}
                    disabled={isActionRunning || hasBlockingContradiction}
                    className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0F172A] text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 shrink-0 flex items-center space-x-2"
                  >
                    <span>{isActionRunning ? 'Authorizing...' : 'Authorize Transition'}</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 6: FINAL THREE-TIER RECONCILIATION REPORT & WORLD MODEL CONVERGENCE */}
            {activeTransition.state === 'COMPLETED' && activeTransition.reconciliationState && (
              <div className="mt-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#0F172A] shadow-2xs">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <CheckCircle2Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      Three-Tier Institutional Reconciliation Verified
                    </h4>
                    <p className="text-xs text-emerald-800">
                      Intended Citizen State == Synthetic Institutional Ledgers == Citizen World Model converged.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-white rounded-xl border border-emerald-200">
                    <div className="text-2xs font-bold text-emerald-900 uppercase">Tier 1: Intent</div>
                    <div className="text-xs font-semibold text-[#0F172A] mt-1">
                      {activeTransition.reconciliationState.summary}
                    </div>
                    <div className="text-2xs text-emerald-700 mt-1">Status: Fully Satisfied</div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-emerald-200">
                    <div className="text-2xs font-bold text-emerald-900 uppercase">Tier 2: Institutional Proofs</div>
                    <div className="text-xs font-semibold text-[#0F172A] mt-1">
                      {activeTransition.reconciliationState.entities?.length || 0} Entities Verified
                    </div>
                    <div className="text-2xs text-emerald-700 mt-1">Bhoomi · Kaveri · UIDAI</div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-emerald-200">
                    <div className="text-2xs font-bold text-emerald-900 uppercase">Tier 3: World Model</div>
                    <div className="text-xs font-semibold text-[#0F172A] mt-1">
                      {activeTransition.finalOutcome?.publicRecordUpdated ? 'Updated & Synchronized' : 'Pending'}
                    </div>
                    <div className="text-2xs text-emerald-700 mt-1">Public Record Hash Match</div>
                  </div>
                </div>
              </div>
            )}

            {/* STAGE 7: AUDITABLE CIVIC TIMELINE */}
            {activeTransition.timeline && activeTransition.timeline.length > 0 && (
              <div className="mt-8 pt-6 border-t border-[#E2E8F0]">
                <h4 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-4">
                  Civic Transition Timeline ({activeTransition.timeline.length} Events)
                </h4>

                <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E8F0]">
                  {(activeTransition.timeline || []).map((evt, idx) => (
                    <div key={evt.id || idx} className="relative">
                      <div
                        className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          evt.status === 'SUCCESS'
                            ? 'bg-emerald-500'
                            : evt.status === 'SUSPENDED'
                            ? 'bg-amber-500'
                            : evt.status === 'WARNING'
                            ? 'bg-rose-500'
                            : 'bg-[#0F172A]'
                        }`}
                      />
                      <div className="text-xs font-bold text-[#0F172A] flex items-center space-x-2">
                        <span>{evt.title}</span>
                        <span className="text-2xs text-[#94A3B8] font-normal">
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-2xs text-[#64748B] mt-0.5">{evt.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-12 text-center shadow-2xs">
          <IndraEmblemIcon className="w-12 h-12 mx-auto mb-4 opacity-75" />
          <h3 className="text-sm font-bold text-[#0F172A]">No Active State Transition</h3>
          <p className="text-xs text-[#64748B] max-w-md mx-auto mt-1">
            Enter a real-world civic life event above or select 'Load Flagship Scenario' to initiate a cross-institution transition.
          </p>
        </div>
      )}
    </div>
  );
}
