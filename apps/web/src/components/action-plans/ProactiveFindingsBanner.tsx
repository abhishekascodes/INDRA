import React, { useEffect, useState } from 'react';
import {
  fetchProactiveFindings,
  dismissProactiveFinding,
  snoozeProactiveFinding,
  scanProactiveFindings,
} from '../../api.js';
import type { ProactiveFinding } from '@indra/contracts';
import { ShieldCheckIcon, AlertCircleIcon, ArrowRightIcon, CloseIcon } from '../icons.js';
import { formatHumanLabel } from '../../utils/civicFormatters.js';


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
    <div className="mb-6 space-y-3 bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 shadow-xs">
      {/* Header with Scan Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#0F172A]">
            Proactive Institutional Intelligence
          </h3>
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-200">
            {findings.length} Actionable
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#334155] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Scan current public world model"
          >
            <span>↻</span>
            <span>{loading ? 'Scanning...' : 'Scan World State'}</span>
          </button>
          <span className="text-xs text-[#94A3B8] hidden md:inline">
            Non-mutating continuous statutory observation
          </span>
        </div>
      </div>

      {/* Category Tabs */}
      {findings.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {['ALL', 'OBLIGATION_DEADLINE', 'CREDENTIAL_LIFECYCLE', 'DORMANT_ASSET', 'ANOMALY_CONTRADICTION', 'ELIGIBILITY_OPPORTUNITY'].map(
            (cat) => {
              const label = cat === 'ALL' ? 'All Alerts' : formatHumanLabel(cat);
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
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] border border-[#CBD5E1]'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            }
          )}
        </div>
      )}

      {/* Finding Cards Grid - items-start ensures cards don't stretch adjacent cards vertically */}
      <div className={`grid items-start grid-cols-1 md:grid-cols-2 ${filteredFindings.length >= 4 ? 'xl:grid-cols-4' : filteredFindings.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-2'} gap-4`}>
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
              className={`rounded-2xl p-5 border transition-all shadow-xs relative flex flex-col justify-between ${
                isCritical
                  ? 'bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]'
                  : isHigh
                  ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
                  : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#1E293B]'
              }`}
            >
              <div>
                {/* Card top badges */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider ${
                        isCritical
                          ? 'bg-rose-600 text-white'
                          : isHigh
                          ? 'bg-amber-500 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {finding.urgency}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded bg-white text-[#64748B] border border-[#CBD5E1] font-semibold">
                      Priority: {finding.priorityScore || 50}/100
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSnooze(finding.id, 7)}
                      className="text-[#64748B] hover:text-[#0F172A] text-xs px-2 py-0.5 rounded bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] transition-colors cursor-pointer"
                      title="Snooze for 7 days"
                    >
                      Snooze 7d
                    </button>
                    <button
                      onClick={() => handleDismiss(finding.id)}
                      className="text-[#64748B] hover:text-rose-600 text-xs px-2 py-0.5 rounded bg-white hover:bg-[#F1F5F9] border border-[#E2E8F0] transition-colors cursor-pointer"
                      title="Dismiss notification"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <h4 className="font-bold text-base text-[#0F172A] mb-1.5">{finding.title}</h4>
                <p className="text-sm text-[#475569] mb-3 leading-relaxed">{finding.explanation}</p>

                {/* 5-Part Explanation Section */}
                {finding.structuredExplanation && (
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : finding.id)}
                        className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? '▾ Hide Statutory Breakdown' : '▸ View Statutory Rationale'}</span>
                      </button>

                      <button
                        onClick={() => setActiveRationaleFinding(finding)}
                        className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] hover:underline transition-colors cursor-pointer"
                      >
                        Inspect Details ↗
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="p-3.5 rounded-xl bg-white border border-[#CBD5E1] text-xs space-y-2.5 text-[#334155] animate-fadeIn">
                        <div>
                          <span className="font-bold text-[#64748B] uppercase text-xs block">1. What Changed:</span>
                          <p className="text-sm text-[#0F172A] mt-0.5">{finding.structuredExplanation.whatChanged}</p>
                        </div>
                        <div>
                          <span className="font-bold text-amber-700 uppercase text-xs block">2. Why It Matters:</span>
                          <p className="text-sm text-[#0F172A] mt-0.5">{finding.structuredExplanation.whyItMatters}</p>
                        </div>
                        <div>
                          <span className="font-bold text-indigo-700 uppercase text-xs block">3. What INDRA Recommends:</span>
                          <p className="text-sm text-[#0F172A] mt-0.5">{finding.structuredExplanation.whatIndraRecommends}</p>
                        </div>
                        <div>
                          <span className="font-bold text-emerald-700 uppercase text-xs block">4. What You Must Authorize:</span>
                          <p className="text-sm text-[#0F172A] mt-0.5">{finding.structuredExplanation.whatCitizenMustAuthorize}</p>
                        </div>
                        <div>
                          <span className="font-bold text-cyan-700 uppercase text-xs block">5. What Happens Next:</span>
                          <p className="text-sm text-[#0F172A] mt-0.5">{finding.structuredExplanation.whatHappensNext}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Link Footer */}
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[#64748B] truncate max-w-[55%]">
                  {finding.actionableRecommendation}
                </span>

                <div className="flex items-center gap-2">
                  {actionPlanTarget && onSelectActionPlan && (
                    <button
                      onClick={() => onSelectActionPlan(actionPlanTarget)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Action Plan</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {workflowTarget && onSelectWorkflow && !actionPlanTarget && (
                    <button
                      onClick={() => onSelectWorkflow(workflowTarget)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>Start Action</span>
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* STATUTORY RATIONALE & POLICY PROVENANCE MODAL */}
      {activeRationaleFinding && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-fadeIn max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {formatHumanLabel(activeRationaleFinding.category)}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                    {formatHumanLabel(activeRationaleFinding.ruleCode)}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-[#0F172A]">
                  {activeRationaleFinding.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveRationaleFinding(null)}
                className="text-[#64748B] hover:text-[#0F172A] p-2 rounded-xl hover:bg-[#F1F5F9] cursor-pointer"
                title="Close"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Statutory Ground Truth & Explanation */}
            <div className="space-y-4 text-sm text-[#334155]">
              <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#CBD5E1]">
                <span className="font-bold text-[#64748B] uppercase text-xs block mb-1">Continuous Ground Truth Observation:</span>
                <p className="text-[#0F172A] leading-relaxed">{activeRationaleFinding.explanation}</p>
              </div>

              {activeRationaleFinding.structuredExplanation && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-white border border-[#CBD5E1]">
                    <span className="font-bold text-[#64748B] uppercase text-xs block">1. What Changed</span>
                    <p className="text-[#0F172A] mt-1 leading-relaxed">{activeRationaleFinding.structuredExplanation.whatChanged}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
                    <span className="font-bold text-amber-800 uppercase text-xs block">2. Why It Matters (Statutory Impact)</span>
                    <p className="text-[#0F172A] mt-1 leading-relaxed">{activeRationaleFinding.structuredExplanation.whyItMatters}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200">
                    <span className="font-bold text-indigo-800 uppercase text-xs block">3. What INDRA Recommends</span>
                    <p className="text-[#0F172A] mt-1 leading-relaxed">{activeRationaleFinding.structuredExplanation.whatIndraRecommends}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                    <span className="font-bold text-emerald-800 uppercase text-xs block">4. What You Must Authorize</span>
                    <p className="text-[#0F172A] mt-1 leading-relaxed">{activeRationaleFinding.structuredExplanation.whatCitizenMustAuthorize}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-cyan-50/60 border border-cyan-200">
                    <span className="font-bold text-cyan-800 uppercase text-xs block">5. What Happens Next</span>
                    <p className="text-[#0F172A] mt-1 leading-relaxed">{activeRationaleFinding.structuredExplanation.whatHappensNext}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
              <button
                onClick={() => setActiveRationaleFinding(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] transition cursor-pointer"
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
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Open Action Plan</span>
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
                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Start Action</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};