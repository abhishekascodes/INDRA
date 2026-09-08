import React, { useEffect, useState } from 'react';
import {
  fetchProactiveFindings,
  dismissProactiveFinding,
  snoozeProactiveFinding,
  scanProactiveFindings,
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
} from '../icons.js';
import { formatHumanLabel, formatPlanTitle } from '../../utils/civicFormatters.js';


interface ProactiveFindingsBannerProps {
  onSelectActionPlan?: (planCode: string) => void;
  onSelectWorkflow?: (workflowCode: string) => void;
}

export const ProactiveFindingsBanner: React.FC<ProactiveFindingsBannerProps> = ({
  onSelectActionPlan,
  onSelectWorkflow,
}) => {
  const [findings, setFindings] = useState<ProactiveFinding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [activeRationaleFinding, setActiveRationaleFinding] = useState<ProactiveFinding | null>(null);

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
      if (activeRationaleFinding?.id === id) {
        setActiveRationaleFinding(null);
      }
    } catch (err) {
      console.error('Failed to dismiss finding:', err);
    }
  };

  const handleSnooze = async (id: string, days: number = 7) => {
    try {
      await snoozeProactiveFinding(id, days);
      setFindings((prev) => prev.filter((f) => f.id !== id));
      if (activeRationaleFinding?.id === id) {
        setActiveRationaleFinding(null);
      }
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

  const filteredFindings =
    activeCategory === 'ALL'
      ? findings
      : findings.filter((f) => f.category === activeCategory);

  // If there are no active findings, do not render any clutter
  if (findings.length === 0) return null;

  return (
    <section className="mb-8 space-y-4">
      {/* 1. Section Header & Scan Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute opacity-75"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
          </div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-sm font-bold tracking-wider uppercase text-slate-700">
              Active Civic Notices & Alerts
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-xs">
              {findings.length} Need Attention
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400 font-medium hidden md:inline">
            Continuously validated across official registries
          </span>
          <button
            onClick={handleScan}
            disabled={loading}
            className="text-xs px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs active:scale-98"
            title="Scan official records for new updates"
          >
            <RefreshIcon className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Checking Records...' : 'Check for Updates'}</span>
          </button>
        </div>
      </div>

      {/* 2. Category Filter Chips */}
      {findings.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
          {['ALL', 'ANOMALY_CONTRADICTION', 'CREDENTIAL_LIFECYCLE', 'OBLIGATION_DEADLINE', 'DORMANT_ASSET', 'ELIGIBILITY_OPPORTUNITY'].map(
            (cat) => {
              const label = cat === 'ALL' ? 'All Notices' : formatHumanLabel(cat);
              const count =
                cat === 'ALL'
                  ? findings.length
                  : findings.filter((f) => f.category === cat).length;
              if (cat !== 'ALL' && count === 0) return null;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all font-semibold text-xs cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-[#0F172A] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {label}{' '}
                  <span className={`ml-1 text-[11px] ${activeCategory === cat ? 'text-slate-300' : 'text-slate-400'}`}>
                    ({count})
                  </span>
                </button>
              );
            }
          )}
        </div>
      )}

      {/* 3. Cards Grid - Clean, spacious 2-column or 3-column executive layout */}
      <div
        className={`grid items-stretch gap-5 ${
          filteredFindings.length === 1
            ? 'grid-cols-1'
            : filteredFindings.length === 3
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2'
        }`}
      >
        {filteredFindings.map((finding) => {
          const isCritical = finding.urgency === 'CRITICAL';
          const isHigh = finding.urgency === 'HIGH';
          const isExpanded = expandedId === finding.id;

          const workflowTarget =
            finding.recommendedWorkflowCode ||
            (finding.actionLink?.actionType === 'LAUNCH_WORKFLOW' ? finding.actionLink.targetCode : null);

          const actionPlanTarget =
            finding.recommendedActionPlanCode ||
            (finding.actionLink?.actionType === 'LAUNCH_ACTION_PLAN' ? finding.actionLink.targetCode : null);

          return (
            <div
              key={finding.id}
              className={`group rounded-2xl bg-white border transition-all duration-200 shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden relative ${
                isCritical
                  ? 'border-slate-200 hover:border-rose-300'
                  : isHigh
                  ? 'border-slate-200 hover:border-amber-300'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Urgency Accent Bar */}
              <div
                className={`h-1 w-full ${
                  isCritical
                    ? 'bg-rose-500'
                    : isHigh
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
              />

              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                <div>
                  {/* Card Header: Urgency Badge + Category + Quick Actions */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center flex-wrap gap-2">
                      {isCritical ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                          Urgent Notice
                        </span>
                      ) : isHigh ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Action Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Notice
                        </span>
                      )}

                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60">
                        {formatHumanLabel(finding.category)}
                      </span>
                    </div>

                    {/* Subtle Quick Actions (Snooze + Dismiss) */}
                    <div className="flex items-center space-x-1 opacity-75 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleSnooze(finding.id, 7)}
                        className="text-[11px] font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Snooze reminder for 7 days"
                      >
                        Snooze 7d
                      </button>
                      <button
                        onClick={() => handleDismiss(finding.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1 rounded-lg transition-colors cursor-pointer"
                        title="Dismiss notice"
                      >
                        <CloseIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Finding Title */}
                  <h3 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight leading-snug mb-2">
                    {formatPlanTitle(finding.title)}
                  </h3>

                  {/* Finding Body Explanation */}
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {finding.explanation}
                  </p>

                  {/* Statutory Deadline if provided */}
                  {((finding.provenanceData?.deadline as string) || (finding.actionPayload?.deadline as string)) && (
                    <div className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 font-semibold">
                      <ClockIcon className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>
                        Statutory Deadline:{' '}
                        <strong className="font-bold text-amber-950">
                          {(finding.provenanceData?.deadline as string) || (finding.actionPayload?.deadline as string)}
                        </strong>
                      </span>
                    </div>
                  )}

                  {/* Statutory Assessment Accordion Trigger */}
                  {finding.structuredExplanation && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs pt-1">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                          className="inline-flex items-center gap-1.5 font-semibold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer group/exp"
                        >
                          <InfoIcon className="w-3.5 h-3.5 text-slate-500 group-hover/exp:text-slate-800" />
                          <span>{isExpanded ? 'Hide Statutory Assessment' : 'Why did INDRA flag this?'}</span>
                          <ChevronDownIcon
                            className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        <button
                          onClick={() => setActiveRationaleFinding(finding)}
                          className="font-medium text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>Legal Basis</span>
                          <span className="text-[10px]">↗</span>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-3 animate-fadeIn">
                          <div className="border-l-2 border-slate-300 pl-3">
                            <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 block">
                              1. What Was Detected
                            </span>
                            <p className="text-slate-900 text-xs mt-0.5 leading-relaxed">
                              {finding.structuredExplanation.whatChanged}
                            </p>
                          </div>
                          <div className="border-l-2 border-amber-400 pl-3">
                            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800 block">
                              2. Statutory Impact & Law
                            </span>
                            <p className="text-slate-900 text-xs mt-0.5 leading-relaxed">
                              {finding.structuredExplanation.whyItMatters}
                            </p>
                          </div>
                          <div className="border-l-2 border-indigo-400 pl-3">
                            <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-800 block">
                              3. INDRA Recommendation
                            </span>
                            <p className="text-slate-900 text-xs mt-0.5 leading-relaxed">
                              {finding.structuredExplanation.whatIndraRecommends}
                            </p>
                          </div>
                          <div className="border-l-2 border-emerald-400 pl-3">
                            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-800 block">
                              4. What You Authorize
                            </span>
                            <p className="text-slate-900 text-xs mt-0.5 leading-relaxed">
                              {finding.structuredExplanation.whatCitizenMustAuthorize}
                            </p>
                          </div>
                          <div className="border-l-2 border-cyan-400 pl-3">
                            <span className="font-bold uppercase tracking-wider text-[10px] text-cyan-800 block">
                              5. Post-Resolution Outcome
                            </span>
                            <p className="text-slate-900 text-xs mt-0.5 leading-relaxed">
                              {finding.structuredExplanation.whatHappensNext}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Footer: Next Step Prompt + Action Button */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                  <div className="text-xs text-slate-500 flex items-center gap-2 min-w-0 pr-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0" />
                    <span className="truncate">
                      {finding.actionableRecommendation || 'Follow guided steps to resolve'}
                    </span>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    {actionPlanTarget && onSelectActionPlan && (
                      <button
                        onClick={() => onSelectActionPlan(actionPlanTarget)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-slate-800 active:bg-black text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Resolve in Action Plan</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {workflowTarget && onSelectWorkflow && !actionPlanTarget && (
                      <button
                        onClick={() => onSelectWorkflow(workflowTarget)}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-slate-800 active:bg-black text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>Start Guided Resolution</span>
                        <ArrowRightIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. STATUTORY RATIONALE & POLICY PROVENANCE MODAL */}
      {activeRationaleFinding && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-fadeIn max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {formatHumanLabel(activeRationaleFinding.category)}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    {formatHumanLabel(activeRationaleFinding.ruleCode)}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {activeRationaleFinding.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveRationaleFinding(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors"
                title="Close"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Statutory Ground Truth & Explanation */}
            <div className="space-y-4 text-sm text-slate-600">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-500 uppercase text-xs block mb-1">
                  Continuous Ground Truth Observation:
                </span>
                <p className="text-slate-900 leading-relaxed">{activeRationaleFinding.explanation}</p>
              </div>

              {activeRationaleFinding.structuredExplanation && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-white border border-slate-200">
                    <span className="font-bold text-slate-500 uppercase text-xs block">1. What Changed</span>
                    <p className="text-slate-900 mt-1 leading-relaxed">
                      {activeRationaleFinding.structuredExplanation.whatChanged}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200">
                    <span className="font-bold text-amber-800 uppercase text-xs block">
                      2. Why It Matters (Statutory Impact)
                    </span>
                    <p className="text-slate-900 mt-1 leading-relaxed">
                      {activeRationaleFinding.structuredExplanation.whyItMatters}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200">
                    <span className="font-bold text-indigo-800 uppercase text-xs block">
                      3. What INDRA Recommends
                    </span>
                    <p className="text-slate-900 mt-1 leading-relaxed">
                      {activeRationaleFinding.structuredExplanation.whatIndraRecommends}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200">
                    <span className="font-bold text-emerald-800 uppercase text-xs block">
                      4. What You Must Authorize
                    </span>
                    <p className="text-slate-900 mt-1 leading-relaxed">
                      {activeRationaleFinding.structuredExplanation.whatCitizenMustAuthorize}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-cyan-50/50 border border-cyan-200">
                    <span className="font-bold text-cyan-800 uppercase text-xs block">
                      5. What Happens Next
                    </span>
                    <p className="text-slate-900 mt-1 leading-relaxed">
                      {activeRationaleFinding.structuredExplanation.whatHappensNext}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setActiveRationaleFinding(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2.5">
                {activeRationaleFinding.recommendedActionPlanCode && onSelectActionPlan && (
                  <button
                    onClick={() => {
                      const code = activeRationaleFinding.recommendedActionPlanCode!;
                      setActiveRationaleFinding(null);
                      onSelectActionPlan(code);
                    }}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#0F172A] hover:bg-slate-800 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Resolve in Action Plan</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                )}

                {activeRationaleFinding.recommendedWorkflowCode && onSelectWorkflow && !activeRationaleFinding.recommendedActionPlanCode && (
                  <button
                    onClick={() => {
                      const code = activeRationaleFinding.recommendedWorkflowCode!;
                      setActiveRationaleFinding(null);
                      onSelectWorkflow(code);
                    }}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-[#0F172A] hover:bg-slate-800 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Start Guided Resolution</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};