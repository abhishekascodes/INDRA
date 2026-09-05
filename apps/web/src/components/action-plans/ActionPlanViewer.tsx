import React, { useEffect, useState } from 'react';
import {
  fetchActionPlans,
  generateActionPlan,
  executePlanStep,
} from '../../api.js';
import type { ActionPlan, ActionPlanStep, LifeEventCode } from '@indra/contracts';
import {
  MapPinIcon,
  BriefcaseIcon,
  BuildingIcon,
  LockIcon,
  CheckIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from '../icons.js';

interface ActionPlanViewerProps {
  citizen?: any;
}

export const ActionPlanViewer: React.FC<ActionPlanViewerProps> = ({ citizen }) => {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [executingStepKey, setExecutingStepKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const loadPlans = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await fetchActionPlans();
      const loadedPlans = data.plans || [];
      setPlans(loadedPlans);
      if (loadedPlans.length > 0) {
        setSelectedPlanId(loadedPlans[0].id);
      } else {
        setSelectedPlanId(null);
      }
      return loadedPlans;
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load action plans');
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans().then(async (loaded) => {
      if (loaded && loaded.length === 0) {
        await handleGenerate('RELOCATION');
      }
    });
  }, [citizen?.id]);

  const handleGenerate = async (code: LifeEventCode) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      let context: Record<string, any> = {};

      if (code === 'RELOCATION') {
        const originCity = citizen?.currentCity || 'Bengaluru';
        const isPune = originCity.toLowerCase().includes('pune');
        const destCity = isPune ? 'Bengaluru' : 'Pune';
        const destState = isPune ? 'Karnataka' : 'Maharashtra';
        const destRto = isPune ? 'KA-01' : 'MH-12';
        const destAddress = isPune
          ? 'Flat 402, Shanti Heights, 12th Main, HAL 2nd Stage, Indiranagar, Bengaluru - 560038'
          : 'Flat 102, Shanti Vihar, Koregaon Park, Pune - 411001';

        context = {
          destinationCity: destCity,
          destinationState: destState,
          destinationRto: destRto,
          destinationAddress: destAddress,
        };
      } else if (code === 'START_BUSINESS') {
        context = {
          companyName: 'AeroDynamics AI Solutions Private Limited',
          entityType: 'PRIVATE_LIMITED',
        };
      } else if (code === 'NEW_EMPLOYMENT') {
        context = {
          employerName: 'TechSolutions India Corp',
        };
      }

      const res = await generateActionPlan(code, context);
      if (res.plan) {
        await loadPlans();
        setSelectedPlanId(res.plan.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteStep = async (planId: string, stepKey: string) => {
    try {
      setExecutingStepKey(stepKey);
      setErrorMsg(null);
      setSuccessMsg(null);
      setStepErrors((prev) => {
        const next = { ...prev };
        delete next[stepKey];
        return next;
      });

      const res = await executePlanStep(planId, stepKey, true);
      if (res.success && res.actionPlan) {
        setPlans((prev) =>
          prev.map((p) => (p.id === res.actionPlan.id ? res.actionPlan : p))
        );
        const title = res.executedStep?.title || 'Action step';
        setSuccessMsg(`Successfully authorized and registered: ${title}`);
      } else {
        await loadPlans();
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to execute step';
      setErrorMsg(msg);
      setStepErrors((prev) => ({ ...prev, [stepKey]: msg }));
      await loadPlans();
    } finally {
      setExecutingStepKey(null);
    }
  };

  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  // Group steps by Phase Index
  const phases = activePlan
    ? Array.from(new Set(activePlan.steps.map((s) => s.phaseIndex))).sort((a, b) => a - b)
    : [];

  return (
    <div className="w-full space-y-8 animate-fadeIn pb-16 pt-2">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
              Guided Action Plan
            </span>
            <span className="text-sm font-semibold text-[#64748B]">Clear Step-by-Step Sequence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            Guided Action Plans
          </h1>
          <p className="text-sm sm:text-base text-[#475569] mt-1.5 leading-relaxed max-w-3xl">
            When life changes happen — moving to another city, starting a company, or switching jobs — INDRA organizes all necessary government filings in the proper order so nothing is missed.
          </p>
        </div>

        {/* Generate Plan Buttons (Clean light civic styling, SVGs only, NO emojis) */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleGenerate('RELOCATION')}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-semibold bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] hover:border-[#94A3B8] rounded-xl transition shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <MapPinIcon className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Moving to Another City</span>
          </button>
          <button
            onClick={() => handleGenerate('NEW_EMPLOYMENT')}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-semibold bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] hover:border-[#94A3B8] rounded-xl transition shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <BriefcaseIcon className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Starting a New Job</span>
          </button>
          <button
            onClick={() => handleGenerate('START_BUSINESS')}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-semibold bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] hover:border-[#94A3B8] rounded-xl transition shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <BuildingIcon className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Starting a Business</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 text-sm rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-700 hover:text-rose-950 text-xs font-bold px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-2 py-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Plan Selector Bar (Pure Light Civic Theme) */}
      {plans.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {plans.map((p) => {
            const isSelected = p.id === activePlan?.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlanId(p.id)}
                className={`px-5 py-3 text-sm font-medium rounded-2xl border transition-all shrink-0 text-left cursor-pointer ${
                  isSelected
                    ? 'bg-white border-2 border-indigo-600 shadow-sm ring-2 ring-indigo-50'
                    : 'bg-white border-[#CBD5E1] hover:bg-[#F8FAFC] hover:border-[#94A3B8] shadow-2xs'
                }`}
              >
                <div className={`font-bold text-base ${isSelected ? 'text-indigo-950' : 'text-[#0F172A]'}`}>
                  {p.title}
                </div>
                <div className="text-xs mt-1 flex items-center gap-2 text-[#64748B]">
                  <span className="capitalize font-semibold">{p.state.toLowerCase().replace(/_/g, ' ')}</span>
                  <span>·</span>
                  <span className="font-semibold text-[#0F172A]">
                    {p.completedTasks}/{p.totalTasks} Tasks Completed
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Active Plan Detail View */}
      {activePlan ? (
        <div className="space-y-8">
          {/* Master Summary Card */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                      activePlan.state === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : activePlan.state === 'IN_PROGRESS'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {activePlan.state.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm font-semibold text-[#475569]">
                    Estimated Duration: {activePlan.estimatedDaysToComplete} Days
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-sm font-semibold text-[#475569]">
                    Statutory Fees: ₹{activePlan.estimatedStatutoryFeesInr.toLocaleString('en-IN')}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                  {activePlan.title}
                </h2>
                <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-4xl">
                  {activePlan.summary}
                </p>
              </div>

              {/* Progress Metric */}
              <div className="text-right shrink-0 bg-[#F8FAFC] border border-[#E2E8F0] px-6 py-4 rounded-2xl">
                <div className="text-3xl font-black text-[#0F172A]">
                  {Math.round((activePlan.completedTasks / Math.max(1, activePlan.totalTasks)) * 100)}%
                </div>
                <div className="text-sm font-semibold text-[#64748B] mt-0.5">
                  {activePlan.completedTasks} of {activePlan.totalTasks} Done
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-[#E2E8F0] rounded-full h-3 overflow-hidden">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${(activePlan.completedTasks / Math.max(1, activePlan.totalTasks)) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Phases & Consequence Graph */}
          <div className="space-y-8">
            {phases.map((phaseIndex) => {
              const phaseSteps = activePlan.steps.filter((s) => s.phaseIndex === phaseIndex);

              return (
                <div key={phaseIndex} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-[#F1F5F9] text-[#0F172A] text-sm font-black flex items-center justify-center border border-[#CBD5E1]">
                      {phaseIndex}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-[#334155]">
                      {phaseIndex === 1
                        ? 'Phase 1 · First Steps & Address Update'
                        : phaseIndex === 2
                        ? 'Phase 2 · Vehicle & Transport Transfers'
                        : 'Phase 3 · Banking & Official Records'}
                    </h3>
                  </div>

                  {/* Balanced Grid: 1 step spans full or comfortable width; multiple steps use 2 columns */}
                  <div
                    className={
                      phaseSteps.length === 1
                        ? 'grid grid-cols-1 gap-4'
                        : 'grid grid-cols-1 lg:grid-cols-2 gap-5'
                    }
                  >
                    {phaseSteps.map((step) => {
                      const isCompleted = step.state === 'COMPLETED';
                      const isReady = step.state === 'READY';
                      const isFailed = step.state === 'FAILED';
                      const isBlocked = step.state === 'BLOCKED';
                      const isExecuting = executingStepKey === step.stepKey;
                      const stepError = stepErrors[step.stepKey];

                      return (
                        <div
                          key={step.id}
                          className={`rounded-2xl p-6 border transition-all flex flex-col justify-between space-y-4 ${
                            isCompleted
                              ? 'bg-[#F0FDF4] border-[#BBF7D0] shadow-2xs'
                              : isFailed
                              ? 'bg-[#FFF1F2] border-[#FECDD3] shadow-xs'
                              : isReady
                              ? 'bg-white border-2 border-indigo-600 shadow-xs'
                              : 'bg-[#F8FAFC] border-[#E2E8F0]'
                          }`}
                        >
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                                    isCompleted
                                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                      : isFailed
                                      ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                      : isReady
                                      ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                      : 'bg-slate-200 text-slate-700 border border-slate-300'
                                  }`}
                                >
                                  {step.state}
                                </span>
                                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100">
                                  {step.authority}
                                </span>
                              </div>

                              {/* State Badge / Execution Trigger */}
                              <div>
                                {isCompleted ? (
                                  <span className="inline-flex items-center text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-300 shadow-2xs">
                                    <CheckIcon className="w-4 h-4 mr-1 text-emerald-700" />
                                    <span>Verified & Registered</span>
                                  </span>
                                ) : isFailed ? (
                                  <button
                                    onClick={() => handleExecuteStep(activePlan.id, step.stepKey)}
                                    disabled={isExecuting}
                                    className="px-5 py-2.5 text-sm font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors shrink-0 shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                                  >
                                    <span>{isExecuting ? 'Retrying...' : 'Retry Action'}</span>
                                    <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5" />
                                  </button>
                                ) : isReady ? (
                                  <button
                                    onClick={() => handleExecuteStep(activePlan.id, step.stepKey)}
                                    disabled={isExecuting}
                                    className="px-5 py-2.5 text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0 shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                                  >
                                    <span>{isExecuting ? 'Executing...' : 'Authorize & Run'}</span>
                                    <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5" />
                                  </button>
                                ) : (
                                  <span className="text-[#64748B] text-xs px-3 py-1.5 bg-white rounded-xl border border-[#CBD5E1] flex items-center font-semibold shadow-2xs">
                                    <LockIcon className="w-3.5 h-3.5 mr-1.5 text-[#94A3B8]" />
                                    <span>Prerequisite Locked</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <h4 className="font-bold text-lg text-[#0F172A] leading-snug">{step.title}</h4>
                            {stepError && (
                              <div className="mt-2 p-3 bg-white/90 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start space-x-2">
                                <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <span>{stepError}</span>
                              </div>
                            )}
                          </div>

                          {/* Dependencies & Notes Footer */}
                          <div>
                            {step.dependencies.length > 0 && (
                              <div className="text-xs text-[#64748B] pt-3 border-t border-[#E2E8F0] flex flex-wrap items-center gap-2">
                                <span className="font-bold text-[#475569]">Prerequisites Required:</span>
                                {step.dependencies.map((dep) => (
                                  <span
                                    key={dep}
                                    className="font-mono text-xs px-2 py-0.5 rounded bg-white border border-[#CBD5E1] text-[#0F172A] font-semibold"
                                  >
                                    {dep}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-[#CBD5E1] rounded-2xl shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3 text-[#64748B]">
            <MapPinIcon className="w-6 h-6" />
          </div>
          <p className="text-base font-bold text-[#0F172A]">No active action plans generated yet</p>
          <p className="text-sm text-[#64748B] mt-1 max-w-md mx-auto">
            Select a life event above to automatically map and complete all connected government requirements.
          </p>
        </div>
      )}
    </div>
  );
};
