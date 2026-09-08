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
  ArrowLeftIcon,
  ShieldCheckIcon,
  CloseIcon,
  PlusIcon,
} from '../icons.js';
import {
  formatHumanLabel,
  formatStateLabel,
  resolveStepTitle,
  formatPlanTitle,
  formatPlanSummary,
  formatPhaseTitle,
  formatStepTitle,
  formatStepExplanation,
} from '../../utils/civicFormatters.js';
import { CivicTaskRenderer } from '../task/CivicTaskRenderer.js';
import { getCivicTaskDescriptor } from '../../utils/civicTaskDescriptor.js';

interface ActionPlanViewerProps {
  citizen?: any;
}

type PlanFilter = 'ALL' | 'ACTIVE' | 'COMPLETED';

export const ActionPlanViewer: React.FC<ActionPlanViewerProps> = ({ citizen }) => {
  const [plans, setPlans] = useState<ActionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activeTaskStep, setActiveTaskStep] = useState<ActionPlanStep | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [executingStepKey, setExecutingStepKey] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<PlanFilter>('ALL');

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

  const handleGenerate = async (code: LifeEventCode, forceRecreate = false) => {
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
        setIsModalOpen(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate plan');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLifeEvent = (code: LifeEventCode) => {
    const existing = plans.find(
      (p) => p.lifeEventCode === code && p.state !== 'CANCELLED'
    );

    if (existing) {
      setSelectedPlanId(existing.id);
      setIsModalOpen(false);
      if (existing.state === 'COMPLETED' && filterTab === 'ACTIVE') {
        setFilterTab('ALL');
      } else if (existing.state !== 'COMPLETED' && filterTab === 'COMPLETED') {
        setFilterTab('ALL');
      }
    } else {
      handleGenerate(code);
    }
  };

  const handleExecuteStep = async (
    planId: string,
    stepKey: string,
    overrideInput?: Record<string, unknown>
  ) => {
    try {
      setExecutingStepKey(stepKey);
      setErrorMsg(null);
      setSuccessMsg(null);
      setStepErrors((prev) => {
        const next = { ...prev };
        delete next[stepKey];
        return next;
      });

      const res = await executePlanStep(planId, stepKey, true, overrideInput);
      if (res.success && res.actionPlan) {
        setPlans((prev) =>
          prev.map((p) => (p.id === res.actionPlan.id ? res.actionPlan : p))
        );
        const title = res.executedStep?.title || 'Action step';
        setSuccessMsg(`Successfully authorized and registered: ${title}`);
        return res.executedStep?.outputPayload || res.capabilityOutput || res;
      } else {
        await loadPlans();
        return res;
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to execute step';
      setErrorMsg(msg);
      setStepErrors((prev) => ({ ...prev, [stepKey]: msg }));
      await loadPlans();
      throw err;
    } finally {
      setExecutingStepKey(null);
    }
  };

  const getStepActionLabel = (step: ActionPlanStep) => {
    const desc = getCivicTaskDescriptor(step.capabilityId, activePlan?.contextData, citizen, step);
    return desc.actionVerb || 'Review & Authorize Action';
  };

  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  // Group steps by Phase Index
  const phases = activePlan
    ? Array.from(new Set(activePlan.steps.map((s) => s.phaseIndex))).sort((a, b) => a - b)
    : [];

  const activePlansCount = plans.filter((p) => p.state !== 'COMPLETED' && p.state !== 'CANCELLED').length;
  const completedPlansCount = plans.filter((p) => p.state === 'COMPLETED').length;

  const filteredPlans = plans.filter((p) => {
    if (p.state === 'CANCELLED') return false;
    if (filterTab === 'ACTIVE') return p.state !== 'COMPLETED';
    if (filterTab === 'COMPLETED') return p.state === 'COMPLETED';
    return true;
  });

  const getPlanIcon = (code?: string) => {
    switch (code) {
      case 'RELOCATION':
        return <MapPinIcon className="w-5 h-5 text-indigo-600 shrink-0" />;
      case 'NEW_EMPLOYMENT':
        return <BriefcaseIcon className="w-5 h-5 text-blue-600 shrink-0" />;
      case 'START_BUSINESS':
        return <BuildingIcon className="w-5 h-5 text-amber-600 shrink-0" />;
      default:
        return <ShieldCheckIcon className="w-5 h-5 text-slate-600 shrink-0" />;
    }
  };

  return (
    <div className="w-full space-y-8 animate-fadeIn pb-16 pt-2">
      {/* 1. HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-2xs font-bold tracking-wider uppercase px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
              Civic Action Plans
            </span>
            <span className="text-xs font-semibold text-[#64748B]">Personalized Life Transitions</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Guided Action Plans
          </h1>
          <p className="text-sm text-[#475569] mt-1 leading-relaxed max-w-2xl">
            When life changes happen — moving to another city, changing jobs, or starting a company — INDRA organizes all required filings across official public registries.
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer select-none"
          >
            <PlusIcon className="w-4 h-4 text-white" />
            <span>Start New Action Plan</span>
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

      {/* 3. PLAN FILTER TABS & RESPONSIVE PLAN DECK (Zero ugly horizontal scrollbars) */}
      {plans.length > 0 && !activeTaskStep && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Filter Tabs */}
            <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-xl text-xs font-bold text-[#64748B]">
              <button
                onClick={() => setFilterTab('ALL')}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === 'ALL'
                    ? 'bg-white text-[#0F172A] shadow-2xs font-extrabold'
                    : 'hover:text-[#0F172A]'
                }`}
              >
                All Plans ({plans.length})
              </button>
              <button
                onClick={() => setFilterTab('ACTIVE')}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === 'ACTIVE'
                    ? 'bg-white text-[#0F172A] shadow-2xs font-extrabold'
                    : 'hover:text-[#0F172A]'
                }`}
              >
                In Progress ({activePlansCount})
              </button>
              <button
                onClick={() => setFilterTab('COMPLETED')}
                className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
                  filterTab === 'COMPLETED'
                    ? 'bg-white text-[#0F172A] shadow-2xs font-extrabold'
                    : 'hover:text-[#0F172A]'
                }`}
              >
                Completed ({completedPlansCount})
              </button>
            </div>

            <div className="text-xs text-[#64748B] font-medium hidden sm:block">
              Showing {filteredPlans.length} of {plans.length} total filings
            </div>
          </div>

          {/* Clean Responsive Plan Deck */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredPlans.map((p) => {
              const isSelected = p.id === activePlan?.id;
              const isDone = p.state === 'COMPLETED';
              const progress = Math.round((p.completedTasks / Math.max(1, p.totalTasks)) * 100);

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'bg-white border-2 border-indigo-600 ring-2 ring-indigo-50 shadow-sm'
                      : 'bg-white border-[#CBD5E1] hover:border-[#94A3B8] hover:bg-[#F8FAFC] shadow-2xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-xl bg-slate-100 border border-slate-200">
                          {getPlanIcon(p.lifeEventCode)}
                        </div>
                        <span
                          className={`text-2xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            isDone
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {formatStateLabel(p.state)}
                        </span>
                      </div>

                      {isSelected && (
                        <span className="text-2xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          Active View
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className={`font-bold text-base leading-snug ${isSelected ? 'text-indigo-950' : 'text-[#0F172A]'}`}>
                        {formatPlanTitle(p.title)}
                      </h3>
                      <p className="text-xs text-[#64748B] mt-1 line-clamp-1">
                        {formatPlanSummary(p.summary, p.title)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">Progress</span>
                      <span className="font-bold text-[#0F172A]">
                        {p.completedTasks}/{p.totalTasks} Tasks ({progress}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          isDone ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Plan Detail View */}
      {activePlan ? (
        <div className="space-y-6">
          {/* INTERACTIVE CIVIC TASK RENDERER (Contract-Driven Deep Task View) */}
          {activeTaskStep ? (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <button
                  onClick={() => setActiveTaskStep(null)}
                  className="text-xs sm:text-sm font-semibold text-[#475569] hover:text-[#0F172A] flex items-center space-x-1.5 cursor-pointer transition"
                >
                  <ArrowLeftIcon className="w-4 h-4 text-indigo-600" />
                  <span>Back to Action Plan: {formatPlanTitle(activePlan.title)}</span>
                </button>
                <span className="text-xs text-[#64748B] font-medium hidden sm:inline">
                  Step: <strong className="text-[#0F172A]">{formatStepTitle(activeTaskStep.title, activeTaskStep.stepKey)}</strong>
                </span>
              </div>

              <CivicTaskRenderer
                descriptor={getCivicTaskDescriptor(
                  activeTaskStep.capabilityId,
                  activePlan.contextData,
                  citizen,
                  activeTaskStep
                )}
                citizen={citizen}
                initialOutcomeData={activeTaskStep.state === 'COMPLETED' ? activeTaskStep.outputPayload : undefined}
                isBlocked={activeTaskStep.state === 'BLOCKED'}
                blockedReason={
                  activeTaskStep.dependencies.length > 0
                    ? `Requires prior clearance of prerequisite step: ${activeTaskStep.dependencies
                        .map((d) => resolveStepTitle(d, activePlan.steps))
                        .join(', ')}`
                    : undefined
                }
                onExecute={async (formData) => {
                  return handleExecuteStep(activePlan.id, activeTaskStep.stepKey, formData);
                }}
                onClose={() => setActiveTaskStep(null)}
              />
            </div>
          ) : (
            <>
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
                    {formatStateLabel(activePlan.state)}
                  </span>
                  <span className="text-sm font-semibold text-[#475569]">
                    Estimated Time: {activePlan.estimatedDaysToComplete} Days
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-sm font-semibold text-[#475569]">
                    Official Fees: ₹{activePlan.estimatedStatutoryFeesInr.toLocaleString('en-IN')}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
                  {formatPlanTitle(activePlan.title)}
                </h2>
                <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-4xl">
                  {formatPlanSummary(activePlan.summary, activePlan.title)}
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
                      {formatPhaseTitle(activePlan.title, phaseIndex)}
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
                                  {formatStateLabel(step.state)}
                                </span>
                                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100">
                                  {step.authority}
                                </span>
                              </div>

                              {/* State Badge / Execution Trigger */}
                              <div>
                                {isCompleted ? (
                                  <button
                                    onClick={() => setActiveTaskStep(step)}
                                    className="inline-flex items-center text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-300 shadow-2xs transition cursor-pointer"
                                  >
                                    <CheckIcon className="w-4 h-4 mr-1 text-emerald-700" />
                                    <span>Completed · View Details</span>
                                  </button>
                                ) : isFailed ? (
                                  <button
                                    onClick={() => setActiveTaskStep(step)}
                                    disabled={isExecuting}
                                    className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors shrink-0 shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                                  >
                                    <span>Review & Fix Issue</span>
                                    <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5" />
                                  </button>
                                ) : isReady ? (
                                  <button
                                    onClick={() => setActiveTaskStep(step)}
                                    disabled={isExecuting}
                                    className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0 shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                                  >
                                    <span>{getStepActionLabel(step)}</span>
                                    <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setActiveTaskStep(step)}
                                    className="text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 text-xs px-3 py-1.5 bg-white rounded-xl border border-[#CBD5E1] flex items-center font-semibold shadow-2xs transition cursor-pointer"
                                  >
                                    <LockIcon className="w-3.5 h-3.5 mr-1.5 text-[#94A3B8]" />
                                    <span>Waiting on Previous Step · View Details</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <h4 className="font-bold text-lg text-[#0F172A] leading-snug">
                              {formatStepTitle(step.title, step.stepKey)}
                            </h4>
                            <p className="text-xs text-[#64748B] mt-1.5 leading-relaxed">
                              {formatStepExplanation(step.stepKey, step.title)}
                            </p>
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
                                <span className="font-bold text-[#475569]">Steps required before this:</span>
                                {step.dependencies.map((dep) => {
                                  const depTitle = resolveStepTitle(dep, activePlan.steps);
                                  return (
                                    <span
                                      key={dep}
                                      className="inline-flex items-center text-xs px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-medium"
                                    >
                                      {depTitle}
                                    </span>
                                  );
                                })}
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
        </>
      )}
    </div>
  ) : (
    <div className="text-center py-20 bg-white border border-[#CBD5E1] rounded-2xl shadow-xs">
      <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3 text-[#64748B]">
        <MapPinIcon className="w-6 h-6" />
      </div>
      <p className="text-base font-bold text-[#0F172A]">Nothing is in progress</p>
      <p className="text-sm text-[#64748B] mt-1 max-w-md mx-auto mb-4">
        Start by telling INDRA what you need to get done, or choose a life event to coordinate required filings across official registries.
      </p>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition shadow-xs inline-flex items-center gap-2 cursor-pointer"
      >
        <PlusIcon className="w-4 h-4 text-white" />
        <span>Start an Action Plan</span>
      </button>
    </div>
  )}

      {/* 5. START NEW ACTION PLAN MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#CBD5E1] shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 animate-scaleIn">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
              <div>
                <span className="text-2xs font-bold tracking-wider uppercase px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                  Life Event Orchestrator
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-2 tracking-tight">
                  Start an Action Plan
                </h2>
                <p className="text-xs sm:text-sm text-[#64748B] mt-1">
                  Select a major life transition. INDRA will coordinate every required filing in proper sequence.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 transition cursor-pointer"
                title="Close"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Life Event Selection Cards */}
            <div className="space-y-3">
              {/* Relocation Card */}
              <div
                onClick={() => handleSelectLifeEvent('RELOCATION')}
                className="p-4 sm:p-5 rounded-2xl border border-[#CBD5E1] hover:border-indigo-600 hover:bg-[#F8FAFC] transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition shrink-0">
                    <MapPinIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#0F172A] text-base group-hover:text-indigo-950">
                        Moving to Another City
                      </h3>
                      {plans.some((p) => p.lifeEventCode === 'RELOCATION' && p.state !== 'CANCELLED') && (
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Plan Exists
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                      Update address across Aadhaar & Voter ID, transfer vehicle registration (RTO), and update utility connections.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                  <span>Open →</span>
                </div>
              </div>

              {/* Employment Card */}
              <div
                onClick={() => handleSelectLifeEvent('NEW_EMPLOYMENT')}
                className="p-4 sm:p-5 rounded-2xl border border-[#CBD5E1] hover:border-indigo-600 hover:bg-[#F8FAFC] transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition shrink-0">
                    <BriefcaseIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#0F172A] text-base group-hover:text-indigo-950">
                        Starting a New Job / Switching Jobs
                      </h3>
                      {plans.some((p) => p.lifeEventCode === 'NEW_EMPLOYMENT' && p.state !== 'CANCELLED') && (
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Plan Exists
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                      Find past EPFO member accounts, transfer Provident Fund balance to new employer, and link PAN to avoid high tax deduction.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                  <span>Open →</span>
                </div>
              </div>

              {/* Business Incorporation Card */}
              <div
                onClick={() => handleSelectLifeEvent('START_BUSINESS')}
                className="p-4 sm:p-5 rounded-2xl border border-[#CBD5E1] hover:border-indigo-600 hover:bg-[#F8FAFC] transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition shrink-0">
                    <BuildingIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#0F172A] text-base group-hover:text-indigo-950">
                        Starting a Business
                      </h3>
                      {plans.some((p) => p.lifeEventCode === 'START_BUSINESS' && p.state !== 'CANCELLED') && (
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Plan Exists
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                      Reserve company name with MCA, complete SPICe+ incorporation, obtain PAN/TAN, and register for GST & MSME benefits.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                  <span>Open →</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
