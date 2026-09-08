import React, { useEffect, useState } from 'react';
import {
  fetchProactiveFindings,
  dismissProactiveFinding,
  snoozeProactiveFinding,
  scanProactiveFindings,
  resolveProactiveFinding,
} from '../../api.js';
import type { ProactiveFinding } from '@indra/contracts';
import {
  ShieldCheckIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  CloseIcon,
  ChevronDownIcon,
  ClockIcon,
  RefreshIcon,
  InfoIcon,
  CheckIcon,
  CheckCircle2Icon,
  BuildingIcon,
  TaxDocIcon,
  SavingsBankIcon,
  LandParcelIcon,
} from '../icons.js';
import { formatHumanLabel, formatPlanTitle } from '../../utils/civicFormatters.js';

interface ProactiveFindingsBannerProps {
  applications?: any[];
  onSelectActionPlan?: (planCode: string) => void;
  onSelectWorkflow?: (workflowCode: string) => void;
  onSelectTab?: (tab: 'home' | 'world-model' | 'action-plans' | 'transitions' | 'inbox' | 'vault' | 'trust') => void;
}

export const ProactiveFindingsBanner: React.FC<ProactiveFindingsBannerProps> = ({
  applications = [],
  onSelectActionPlan,
  onSelectWorkflow,
  onSelectTab,
}) => {
  const [findings, setFindings] = useState<ProactiveFinding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const loadFindings = async () => {
    try {
      setLoading(true);
      const data = await fetchProactiveFindings();
      setFindings(data.findings || []);
    } catch (err) {
      console.error('Failed to load proactive findings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, []);

  const handleDismiss = async (id: string) => {
    try {
      await dismissProactiveFinding(id);
      setFindings((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Failed to dismiss finding:', err);
    }
  };

  const handleSnooze = async (id: string, days: number = 7) => {
    try {
      await snoozeProactiveFinding(id, days);
      setFindings((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Failed to snooze finding:', err);
    }
  };

  const handleScan = async () => {
    try {
      setLoading(true);
      await scanProactiveFindings();
      await loadFindings();
    } catch (err) {
      console.error('Failed to run proactive scan:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check if a finding's workflow or action plan has already been executed/completed
  const isFindingCompleted = (finding: ProactiveFinding): boolean => {
    const wf =
      finding.recommendedWorkflowCode ||
      (finding.actionLink?.actionType === 'LAUNCH_WORKFLOW' ? finding.actionLink.targetCode : null);

    if (wf) {
      const hasCompletedApp = applications.some(
        (a) =>
          (a.workflowCode === wf ||
            a.workflowTitle?.toUpperCase().includes(wf.replace(/_/g, ' ')) ||
            (wf === 'CHECK_ITR_STATUS' && a.title?.toUpperCase().includes('TAX')) ||
            (wf === 'RECOVER_DORMANT_PF' && a.title?.toUpperCase().includes('PROVIDENT FUND'))) &&
          a.universalStatus === 'COMPLETED'
      );
      if (hasCompletedApp) return true;
    }

    if (finding.status === 'RESOLVED') return true;
    return false;
  };

  const getNoticeAuthorityIcon = (authority: string = '', category: string = '') => {
    const combined = (authority + ' ' + category).toUpperCase();
    if (combined.includes('TAX') || combined.includes('CPC') || combined.includes('ITR') || combined.includes('CBDT')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
          <TaxDocIcon className="w-4 h-4" />
        </div>
      );
    }
    if (combined.includes('AGRICULTURE') || combined.includes('PMFBY') || combined.includes('KISAN') || combined.includes('FARM')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
          <LandParcelIcon className="w-4 h-4" />
        </div>
      );
    }
    if (combined.includes('EPFO') || combined.includes('PROVIDENT') || combined.includes('PENSION') || combined.includes('ASSET')) {
      return (
        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center justify-center shrink-0">
          <SavingsBankIcon className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
        <BuildingIcon className="w-4 h-4" />
      </div>
    );
  };

  const filteredFindings =
    activeCategory === 'ALL'
      ? findings
      : findings.filter((f) => f.category === activeCategory);

  const pendingFindings = filteredFindings.filter((f) => !isFindingCompleted(f));
  const completedFindings = filteredFindings.filter((f) => isFindingCompleted(f));

  if (findings.length === 0) return null;

  return (
    <section className="mb-8 space-y-4 animate-fadeIn">
      {/* 1. Official Header & Validation Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/80">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
            {pendingFindings.length > 0 ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping absolute opacity-75" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
              </>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xs font-black tracking-wider uppercase text-slate-800">
                Civic Action Register & Statutory Notices
              </h2>
              {pendingFindings.length > 0 ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-extrabold text-xs">
                  {pendingFindings.length} Need Action
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 font-extrabold text-xs flex items-center gap-1">
                  <CheckIcon className="w-3 h-3 text-emerald-600" />
                  All Clear
                </span>
              )}
            </div>
            <p className="text-2xs text-slate-500 mt-0.5 hidden sm:block">
              Authoritative notices synthesized from verified national and state public databases
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-auto">
          <button
            onClick={handleScan}
            disabled={loading}
            className="text-xs px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs active:scale-98"
            title="Scan official records for new updates"
          >
            <RefreshIcon className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Validating...' : 'Check for Updates'}</span>
          </button>
        </div>
      </div>

      {/* 2. Structured Executive Civic Register (Human-Crafted Ministerial Density) */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-150">
        {filteredFindings.map((finding) => {
          const isCompleted = isFindingCompleted(finding);
          const isCritical = finding.urgency === 'CRITICAL';
          const isHigh = finding.urgency === 'HIGH';
          const isExpanded = expandedId === finding.id;

          const authority =
            (finding.provenanceData?.sourceAuthority as string) ||
            (finding.policyProvenance?.sourceAuthority as string) ||
            'Government of India';

          const statutoryAct =
            (finding.policyProvenance?.statutoryDomain as string) ||
            (finding.policyProvenance?.policyDerivation as string) ||
            'Governed by Central Statutory Law';

          const workflowTarget =
            finding.recommendedWorkflowCode ||
            (finding.actionLink?.actionType === 'LAUNCH_WORKFLOW' ? finding.actionLink.targetCode : null);

          const actionPlanTarget =
            finding.recommendedActionPlanCode ||
            (finding.actionLink?.actionType === 'LAUNCH_ACTION_PLAN' ? finding.actionLink.targetCode : null);

          const deadline =
            (finding.provenanceData?.deadline as string) ||
            (finding.actionPayload?.deadline as string);

          const financialValue =
            (finding.actionPayload?.totalDormantBalance as number) ||
            (finding.actionPayload?.annualBenefitInr as number);

          return (
            <div
              key={finding.id}
              className={`p-5 sm:p-6 transition-colors ${
                isCompleted
                  ? 'bg-emerald-50/20'
                  : isCritical
                  ? 'bg-rose-50/20 hover:bg-rose-50/30'
                  : 'hover:bg-slate-50/60'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                {/* Left Column: Department Seal + Content */}
                <div className="flex items-start space-x-4 flex-1 min-w-0">
                  {getNoticeAuthorityIcon(authority, finding.category)}

                  <div className="space-y-1.5 flex-1 min-w-0">
                    {/* Department, Legal Domain, Urgency Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xs font-bold text-slate-700 uppercase tracking-wider">
                        {authority}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-2xs text-slate-500 font-medium truncate max-w-xs">
                        {statutoryAct.replace(/_/g, ' ')}
                      </span>

                      {/* Status Badges */}
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckIcon className="w-3 h-3 text-emerald-700" />
                          Obligation Clear / Verified
                        </span>
                      ) : isCritical ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                          Urgent Notice
                        </span>
                      ) : isHigh ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                          Action Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300">
                          Official Notice
                        </span>
                      )}

                      {deadline && !isCompleted && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <ClockIcon className="w-3 h-3 text-rose-600" />
                          Due: {deadline}
                        </span>
                      )}

                      {financialValue && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          ₹{financialValue.toLocaleString('en-IN')} Entitlement / Recovery
                        </span>
                      )}
                    </div>

                    {/* Notice Title */}
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                      {formatPlanTitle(finding.title)}
                    </h3>

                    {/* Ground Truth Summary */}
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-4xl">
                      {finding.explanation}
                    </p>

                    {/* Actionable Statutory Guidance */}
                    <div className="pt-1 flex items-center gap-2 text-2xs text-slate-500 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                      <span>{finding.actionableRecommendation || 'Follow guided steps to resolve.'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Dynamic Action State & Controls */}
                <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col items-end justify-between gap-3 pl-12 lg:pl-0">
                  {/* Action Execution Button */}
                  <div className="w-full sm:w-auto">
                    {isCompleted ? (
                      <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-300 shadow-2xs">
                        <CheckCircle2Icon className="w-4 h-4 text-emerald-700" />
                        <span>Resolved & Up to Date</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {actionPlanTarget && onSelectActionPlan && (
                          <button
                            onClick={() => onSelectActionPlan(actionPlanTarget)}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-black active:scale-98 text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Resolve in Action Plan</span>
                            <ArrowRightIcon className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {workflowTarget && onSelectWorkflow && !actionPlanTarget && (
                          <button
                            onClick={() => onSelectWorkflow(workflowTarget)}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Start Guided Resolution</span>
                            <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Secondary Actions: Expand Law + Snooze / Dismiss */}
                  <div className="flex items-center space-x-2 text-2xs">
                    {finding.structuredExplanation && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                        className="font-semibold text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <InfoIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>{isExpanded ? 'Hide Legal Basis' : 'Statutory Basis'}</span>
                        <ChevronDownIcon
                          className={`w-3 h-3 text-slate-400 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    )}

                    {!isCompleted && (
                      <>
                        <span className="text-slate-300">·</span>
                        <button
                          onClick={() => handleSnooze(finding.id, 7)}
                          className="text-slate-400 hover:text-slate-700 px-1.5 py-1 rounded hover:bg-slate-100 transition cursor-pointer"
                          title="Snooze reminder for 7 days"
                        >
                          Snooze 7d
                        </button>
                        <span className="text-slate-300">·</span>
                        <button
                          onClick={() => handleDismiss(finding.id)}
                          className="text-slate-400 hover:text-rose-600 px-1.5 py-1 rounded hover:bg-rose-50 transition cursor-pointer"
                          title="Dismiss notice"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Expandable Statutory Legal Basis Drawer */}
              {isExpanded && finding.structuredExplanation && (
                <div className="mt-4 pt-4 border-t border-slate-200/80 bg-slate-50/80 rounded-xl p-4 text-xs space-y-3 animate-fadeIn">
                  <div className="font-bold text-slate-800 uppercase tracking-wider text-2xs flex items-center gap-1.5 pb-1 border-b border-slate-200">
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Statutory Derivation & Legal Framework</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border-l-2 border-slate-400 pl-3">
                      <span className="font-bold uppercase tracking-wider text-2xs text-slate-500 block">
                        1. What Was Detected in Public Record
                      </span>
                      <p className="text-slate-900 text-xs mt-0.5 leading-relaxed">
                        {finding.structuredExplanation.whatChanged}
                      </p>
                    </div>

                    <div className="border-l-2 border-amber-500 pl-3">
                      <span className="font-bold uppercase tracking-wider text-2xs text-amber-800 block">
                        2. Statutory Impact & Governing Law
                      </span>
                      <p className="text-slate-900 text-xs mt-0.5 leading-relaxed">
                        {finding.structuredExplanation.whyItMatters}
                      </p>
                    </div>

                    <div className="border-l-2 border-indigo-500 pl-3">
                      <span className="font-bold uppercase tracking-wider text-2xs text-indigo-800 block">
                        3. INDRA Statutory Recommendation
                      </span>
                      <p className="text-slate-900 text-xs mt-0.5 leading-relaxed">
                        {finding.structuredExplanation.whatIndraRecommends}
                      </p>
                    </div>

                    <div className="border-l-2 border-emerald-500 pl-3">
                      <span className="font-bold uppercase tracking-wider text-2xs text-emerald-800 block">
                        4. Citizen Authorization & Outcome
                      </span>
                      <p className="text-slate-900 text-xs mt-0.5 leading-relaxed">
                        {finding.structuredExplanation.whatCitizenMustAuthorize}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};