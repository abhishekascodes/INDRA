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
  fetchFaultSimulationStatus,
  setFaultSimulation,
} from '../../api.js';
import {
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ClockIcon,
  RefreshIcon,
  ArrowRightIcon,
  BuildingIcon,
  FileTextIcon,
  MapPinIcon,
  AlertCircleIcon,
  IndraEmblemIcon,
  CheckIcon,
} from '../icons.js';
import { formatHumanLabel } from '../../utils/civicFormatters.js';

interface CitizenTransitionConsoleProps {
  citizen: any;
  onRefreshCitizen?: () => void;
  onNavigateToRecords?: () => void;
}

export function CitizenTransitionConsole({
  citizen,
  onRefreshCitizen,
  onNavigateToRecords,
}: CitizenTransitionConsoleProps) {
  const [query, setQuery] = useState('I moved to Bangalore and bought a plot in Devanahalli.');
  const [activeTransition, setActiveTransition] = useState<CitizenStateTransition | null>(null);
  const [recentTransitions, setRecentTransitions] = useState<CitizenStateTransition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionRunning, setIsActionRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fault simulation status for Bhoomi 503 outage testing
  const [isSimulatingOutage, setIsSimulatingOutage] = useState(false);

  const checkSimulationStatus = useCallback(async () => {
    try {
      const status = await fetchFaultSimulationStatus();
      setIsSimulatingOutage(Boolean(status.simulatePropertyOutage));
    } catch {
      // ignore simulation status check failure
    }
  }, []);

  const toggleBhoomiOutage = async () => {
    try {
      const next = !isSimulatingOutage;
      await setFaultSimulation({ simulatePropertyOutage: next });
      setIsSimulatingOutage(next);
    } catch (err: any) {
      setErrorMsg(`Failed to toggle simulation: ${err.message}`);
    }
  };

  const loadTransitions = useCallback(async () => {
    try {
      setIsLoading(true);
      const list = await fetchCitizenTransitions();
      setRecentTransitions(list);
      if (list.length > 0) {
        setActiveTransition(list[0]);
      } else {
        // Auto-initiate flagship transition
        const transition = await initiateTransition(query, {
          destinationCity: 'Bengaluru',
          destinationState: 'Karnataka',
          surveyNumber: '142/3',
          village: 'Devanahalli',
        });
        setRecentTransitions([transition]);
        setActiveTransition(transition);
      }
    } catch (err: any) {
      console.warn('Could not load existing transitions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    setActiveTransition(null);
    loadTransitions();
    checkSimulationStatus();
  }, [citizen?.id, checkSimulationStatus, loadTransitions]);

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
      setErrorMsg(err.message || 'Failed to evaluate civic transition');
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
      setErrorMsg(err.message || 'Failed to resolve discrepancy');
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

      // Trigger execution loop
      const executed = await executeTransition(activeTransition.id);
      setActiveTransition(executed);
      await loadTransitions();
      if (onRefreshCitizen && executed.state === 'COMPLETED') {
        onRefreshCitizen();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Execution encountered an unexpected issue');
      if (activeTransition) {
        fetchTransition(activeTransition.id)
          .then((t) => setActiveTransition(t))
          .catch(() => {});
      }
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleResume = async (disableOutageFirst = false) => {
    if (!activeTransition) return;
    setIsActionRunning(true);
    setErrorMsg(null);
    try {
      if (disableOutageFirst && isSimulatingOutage) {
        await setFaultSimulation({ simulatePropertyOutage: false });
        setIsSimulatingOutage(false);
      }
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. HERO EVALUATION CARD */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">State-Transition Engine</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Coordinate multi-authority filings, land registrations, and address changes across government departments automatically.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-2xs text-[#475569]">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-semibold">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Statutory Multi-Authority Engine</span>
            </span>
          </div>
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
              placeholder="Describe a life event (e.g., I moved to Bangalore and bought a plot in Devanahalli...)"
              className="w-full pl-4 pr-36 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/20 focus:border-[#0F172A] transition shadow-xs"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-2 bottom-2 px-4 rounded-lg bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5 shadow-xs"
            >
              {isLoading ? (
                <span>Evaluating...</span>
              ) : (
                <>
                  <span>Evaluate</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Preset Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-2xs font-bold text-[#64748B] uppercase tracking-wider">Scenarios:</span>
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
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                  query === preset
                    ? 'border-[#0F172A] bg-[#0F172A] text-white shadow-xs'
                    : 'border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] text-[#334155]'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </form>

        {/* Quiet Outage Simulation Helper */}
        <div className="pt-3 border-t border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-2xs text-[#64748B]">
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isSimulatingOutage ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            <span>
              Public Authority Simulator: Bhoomi Land Records (
              {isSimulatingOutage ? 'Simulated 503 Outage Active' : 'Online'})
            </span>
          </div>
          <button
            type="button"
            onClick={toggleBhoomiOutage}
            className="text-2xs font-medium text-[#0F172A] underline hover:text-black cursor-pointer"
          >
            {isSimulatingOutage ? 'Turn Off Outage Simulation' : 'Simulate Bhoomi 503 Outage'}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium flex items-center space-x-2">
            <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* 2. ACTIVE TRANSITION VIEW */}
      {activeTransition ? (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-2xs space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E2E8F0]">
            <div>
              <div className="text-2xs font-semibold text-[#64748B] uppercase tracking-wider mb-0.5">
                Transition Plan #{activeTransition.id.slice(0, 8).toUpperCase()}
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">
                {activeTransition.targetOutcome || activeTransition.initiatingQuery}
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 ${
                  activeTransition.state === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-900'
                    : activeTransition.state === 'SUSPENDED'
                    ? 'bg-amber-100 text-amber-900'
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

          {/* Scope Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-2xs font-semibold text-[#64748B] uppercase">Authorities</div>
              <div className="text-xs font-bold text-[#0F172A] mt-0.5">
                {activeTransition.consequenceGraph?.affectedInstitutions?.length || 4} Departments
              </div>
              <div className="text-2xs text-[#64748B] mt-0.5 truncate">
                Bhoomi · Kaveri 2.0 · UIDAI · MoRTH
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-2xs font-semibold text-[#64748B] uppercase">Filings</div>
              <div className="text-xs font-bold text-[#0F172A] mt-0.5">
                {activeTransition.proposedPlan?.steps?.length || 4} Sequenced Filings
              </div>
              <div className="text-2xs text-[#64748B] mt-0.5">
                Est. Turnaround: {activeTransition.proposedPlan?.estimatedDays || 14} working days
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="text-2xs font-semibold text-[#64748B] uppercase">Record Validation</div>
              <div className="text-xs font-bold text-[#0F172A] mt-0.5">
                {hasBlockingContradiction ? (
                  <span className="text-amber-800">1 Record Discrepancy</span>
                ) : (
                  <span className="text-emerald-700">Cross-Verified</span>
                )}
              </div>
              <div className="text-2xs text-[#64748B] mt-0.5">
                {hasBlockingContradiction ? 'Citizen confirmation needed' : 'All identifiers match'}
              </div>
            </div>
          </div>

          {/* Discovered Records Strip */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Verified Public Records Identified
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                <div className="flex items-center space-x-1.5 text-2xs text-[#64748B] font-semibold mb-1">
                  <MapPinIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Land Parcel</span>
                </div>
                <div className="font-bold text-[#0F172A]">Survey No. 142/3</div>
                <div className="text-2xs text-[#64748B]">Devanahalli Kasaba</div>
                <div className="text-2xs text-emerald-700 font-medium mt-1">✓ Bhoomi Verified</div>
              </div>

              <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                <div className="flex items-center space-x-1.5 text-2xs text-[#64748B] font-semibold mb-1">
                  <FileTextIcon className="w-3.5 h-3.5 text-amber-600" />
                  <span>Registered Deed</span>
                </div>
                <div className="font-bold text-[#0F172A]">Doc #KA-BLR-DEV-2026-00481</div>
                <div className="text-2xs text-[#64748B]">
                  Transferee: {String(activeTransition.contradictions?.[0]?.observedValues?.registeredSaleDeedTransferee || (citizen?.primaryName ? `${citizen.primaryName.split(' ')[0]} Kumar Patel` : 'Transferee'))}
                </div>
                <div className="text-2xs text-emerald-700 font-medium mt-1">✓ Kaveri 2.0 Registered</div>
              </div>

              <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                <div className="flex items-center space-x-1.5 text-2xs text-[#64748B] font-semibold mb-1">
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>National Identity</span>
                </div>
                <div className="font-bold text-[#0F172A]">Aadhaar Master Record</div>
                <div className="text-2xs text-[#64748B]">
                  Holder: {citizen?.primaryName || 'Verified Citizen'}
                </div>
                <div className="text-2xs text-emerald-700 font-medium mt-1">✓ UIDAI Verified</div>
              </div>

              <div className="p-3 rounded-xl border border-[#E2E8F0] bg-white">
                <div className="flex items-center space-x-1.5 text-2xs text-[#64748B] font-semibold mb-1">
                  <BuildingIcon className="w-3.5 h-3.5 text-sky-600" />
                  <span>Title Clearance</span>
                </div>
                <div className="font-bold text-[#0F172A]">Form 15 Non-Encumbrance</div>
                <div className="text-2xs text-[#64748B]">15-Year Sub-Registrar Search</div>
                <div className="text-2xs text-emerald-700 font-medium mt-1">✓ Clean Title Verified</div>
              </div>
            </div>
          </div>

          {/* Record Discrepancy & Citizen Decision Block */}
          {activeTransition.contradictions && activeTransition.contradictions.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Record Discrepancy
              </div>

              {activeTransition.contradictions.map((c) => (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border ${
                    c.resolutionState === 'RESOLVED'
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-amber-50/80 border-amber-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3">
                      {c.resolutionState === 'RESOLVED' ? (
                        <CheckCircle2Icon className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangleIcon className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-[#0F172A]">
                            Name Variation Detected: {formatHumanLabel(c.field)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-2xs font-semibold ${
                              c.resolutionState === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-amber-200 text-amber-950'
                            }`}
                          >
                            {c.resolutionState === 'RESOLVED' ? 'CONFIRMED' : 'ACTION REQUIRED'}
                          </span>
                        </div>
                        <p className="text-xs text-[#334155] mt-1">{c.whatConflicts}</p>
                        <p className="text-2xs text-[#64748B] mt-0.5">
                          <span className="font-semibold">Requirement:</span> {c.whyItMatters}
                        </p>
                      </div>
                    </div>

                    {c.resolutionState === 'UNRESOLVED' && (
                      <button
                        type="button"
                        onClick={() => handleResolveContradiction(c.id)}
                        disabled={isActionRunning}
                        className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50 shrink-0 flex items-center space-x-1.5"
                      >
                        <CheckIcon className="w-3.5 h-3.5" />
                        <span>Confirm Name Match via Aadhaar Biometrics</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step-by-step Sequenced Government Filings */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Filing Sequence
            </div>

            <div className="space-y-2">
              {(activeTransition.proposedPlan?.steps || []).map((step, idx) => {
                const cp = activeTransition.executionCheckpoints?.[step.stepKey];
                const status = cp?.state || 'PENDING';

                return (
                  <div
                    key={step.stepKey}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                      status === 'SUCCEEDED'
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : status === 'SUSPENDED'
                        ? 'bg-amber-50/70 border-amber-300'
                        : status === 'BLOCKED'
                        ? 'bg-gray-50 border-gray-200 text-[#64748B]'
                        : 'bg-white border-[#E2E8F0]'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-2xs font-semibold shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-[#0F172A]">{step.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-2xs font-medium ${
                              status === 'SUCCEEDED'
                                ? 'bg-emerald-100 text-emerald-900'
                                : status === 'SUSPENDED'
                                ? 'bg-amber-100 text-amber-900'
                                : status === 'BLOCKED'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-blue-50 text-blue-800'
                            }`}
                          >
                            {status === 'SUCCEEDED'
                              ? 'Completed'
                              : status === 'SUSPENDED'
                              ? 'Paused at Authority'
                              : status === 'BLOCKED'
                              ? 'Waiting'
                              : 'Ready'}
                          </span>
                        </div>
                        <div className="text-2xs text-[#64748B] mt-0.5">
                          {step.authority} · Mode: {formatHumanLabel(step.executionMode)}
                        </div>
                        {cp?.errorReason && (
                          <div className="text-2xs text-amber-900 font-medium mt-0.5">
                            Notice: {cp.errorReason}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 text-2xs text-[#64748B]">
                      <span className="font-bold text-[#0F172A]">
                        {step.statutoryFeeInr > 0 ? `₹${step.statutoryFeeInr}` : 'Statutory Fee: Free'}
                      </span>
                      <span className="mx-1.5">·</span>
                      <span>{step.estimatedDays} {step.estimatedDays === 1 ? 'day' : 'days'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5A. AUTHORIZATION CARD (Awaiting Citizen Sign-off) */}
          {activeTransition.state === 'AWAITING_AUTHORIZATION' && (
            <div className="p-5 rounded-2xl bg-[#0F172A] text-white space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-1.5 text-amber-400 text-2xs font-bold uppercase tracking-wider">
                    <ShieldCheckIcon className="w-4 h-4" />
                    <span>Citizen Authorization Required</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">
                    Authorize Multi-Department Filings
                  </h4>
                  <p className="text-xs text-gray-300 mt-0.5 max-w-xl">
                    Authorizing allows INDRA to submit certified digital filings to UIDAI, Kaveri 2.0, and Bhoomi on your behalf.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAuthorize}
                  disabled={isActionRunning || hasBlockingContradiction}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0F172A] text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0 flex items-center space-x-1.5"
                >
                  <span>{isActionRunning ? 'Submitting Filings...' : 'Authorize Filings'}</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 5B. PUBLIC SERVICE OUTAGE NOTICE (Safe Durable Pause) */}
          {activeTransition.state === 'SUSPENDED' && (
            <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <ClockIcon className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-amber-950">
                        Karnataka Land Records (Bhoomi) Temporarily Unavailable (HTTP 503)
                      </span>
                      <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-amber-200 text-amber-950">
                        SAFELY PAUSED · DURABLE CHECKPOINT
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 mt-1">
                      The state land registry service is temporarily busy. Your filing is safely paused.
                    </p>
                    <p className="text-2xs text-amber-800 font-medium mt-0.5">
                      Prior completed steps (UIDAI Aadhaar and Kaveri 2.0) are durably preserved. Click below to resume when ready.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {isSimulatingOutage && (
                    <button
                      type="button"
                      onClick={() => handleResume(true)}
                      disabled={isActionRunning}
                      className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" />
                      <span>End Outage & Resume</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleResume(false)}
                    disabled={isActionRunning}
                    className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <RefreshIcon className="w-3.5 h-3.5" />
                    <span>{isActionRunning ? 'Resuming...' : 'Retry Resume'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5C. CONVERGED OUTCOME & CROSS-REGISTRY RECONCILIATION */}
          {activeTransition.state === 'COMPLETED' && (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#0F172A] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950">
                      All Public Records Verified & Updated
                    </h4>
                    <p className="text-xs text-emerald-800">
                      Filing completed across all 4 departments. Final cross-registry reconciliation verified.
                    </p>
                  </div>
                </div>

                {onNavigateToRecords && (
                  <button
                    type="button"
                    onClick={onNavigateToRecords}
                    className="px-4 py-2 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-semibold transition shadow-2xs cursor-pointer shrink-0 flex items-center space-x-1.5"
                  >
                    <span>View in My Records</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Generated Confirmation Receipts */}
              {activeTransition.finalOutcome?.certificatesGenerated && (
                <div className="pt-3 border-t border-emerald-200 space-y-2">
                  <div className="text-2xs font-bold text-emerald-900 uppercase tracking-wider">
                    Confirmation Receipts & Certificates
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {activeTransition.finalOutcome.certificatesGenerated.map((cert, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-white rounded-lg border border-emerald-200 flex items-center space-x-2 text-2xs text-[#0F172A]"
                      >
                        <CheckCircle2Icon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-medium">{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. AUDIT TRAIL / TIMELINE */}
          {activeTransition.timeline && activeTransition.timeline.length > 0 && (
            <div className="pt-4 border-t border-[#E2E8F0]">
              <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                Filing History ({activeTransition.timeline.length} Events)
              </div>

              <div className="relative pl-5 space-y-3 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E8F0]">
                {activeTransition.timeline.map((evt, idx) => (
                  <div key={evt.id || idx} className="relative text-xs">
                    <div
                      className={`absolute -left-5 top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        evt.status === 'SUCCESS'
                          ? 'bg-emerald-500'
                          : evt.status === 'SUSPENDED'
                          ? 'bg-amber-500'
                          : evt.status === 'WARNING'
                          ? 'bg-rose-500'
                          : 'bg-[#0F172A]'
                      }`}
                    />
                    <div className="font-semibold text-[#0F172A] flex items-center space-x-2">
                      <span>{evt.title}</span>
                      <span className="text-2xs text-[#94A3B8] font-normal">
                        {new Date(evt.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-2xs text-[#64748B]">{evt.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : isLoading ? (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-10 text-center shadow-xs space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 animate-pulse">
            <IndraEmblemIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#0F172A]">
              Synthesizing Multi-Authority Transition Cascade
            </h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto">
              Evaluating statutory dependencies across Kaveri 2.0 Sub-Registrar, Bhoomi Land Records, UIDAI CIDR, and MoRTH Vahan...
            </p>
          </div>
          <div className="flex items-center justify-center space-x-2 pt-2">
            <div className="w-2 h-2 rounded-full bg-[#0F172A] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#0F172A] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-[#0F172A] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#CBD5E1] rounded-2xl p-8 text-center shadow-xs space-y-3">
          <IndraEmblemIcon className="w-8 h-8 mx-auto opacity-50 text-[#0F172A]" />
          <div>
            <h3 className="text-sm font-bold text-[#0F172A]">Flagship Bangalore Relocation Scenario</h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto mt-0.5">
              Click below to evaluate cross-department filings and coordinate updates automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleInitiate(query)}
            className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-xs inline-flex items-center space-x-1.5"
          >
            <span>Evaluate Flagship Bangalore Scenario</span>
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
