import React, { useState } from 'react';
import type { StructuredIntent } from '@indra/contracts';
import { UniversalIntentConsole } from '../intent/UniversalIntentConsole.js';
import { ProactiveFindingsBanner } from '../action-plans/ProactiveFindingsBanner.js';
import {
  ShieldCheckIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  BuildingIcon,
  BriefcaseIcon,
  LockIcon,
  FileTextIcon,
  ClockIcon,
  TaxDocIcon,
  PassportTravelIcon,
  VehicleCarIcon,
  SavingsBankIcon,
  LandParcelIcon,
  HealthHeartIcon,
  ScaleOfJusticeIcon,
  RefreshIcon,
} from '../icons.js';

import { fetchRelocationImpact } from '../../api.js';
import { formatHumanLabel, formatStateLabel } from '../../utils/civicFormatters.js';

interface PersonalGovernmentHomeProps {
  citizen: any;
  applications: any[];
  onLaunchWorkflow: (workflowCode: string, initialContext?: Record<string, unknown>) => void;
  onSelectTab: (tab: 'home' | 'world-model' | 'action-plans' | 'transitions' | 'inbox' | 'vault' | 'trust') => void;
}

export function PersonalGovernmentHome({
  citizen,
  applications,
  onLaunchWorkflow,
  onSelectTab,
}: PersonalGovernmentHomeProps) {
  const [transitionIntent, setTransitionIntent] = useState<StructuredIntent | null>(null);
  const [relocationImpact, setRelocationImpact] = useState<any | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const handleExecuteIntent = async (intent: StructuredIntent) => {
    setTransitionIntent(intent);

    if (intent.intentId === 'LIFE_EVENT_MOVING') {
      setIsSynthesizing(true);
      try {
        const destCity = (intent.extractedEntities?.targetCity as string) || 'Bengaluru';
        const impact = await fetchRelocationImpact(destCity, 'Karnataka');
        setRelocationImpact(impact);
      } catch (err) {
        console.error('Failed to synthesize relocation impact:', err);
      } finally {
        setIsSynthesizing(false);
      }
    } else if (intent.matchedWorkflowCode) {
      onLaunchWorkflow(intent.matchedWorkflowCode, intent.extractedEntities);
    }
  };

  const name = citizen?.primaryName || 'Priya Sharma';

  // Helper to extract ground truth highlights for general inquiries
  const getGroundTruthHighlights = () => {
    const isAarav = citizen?.primaryName?.includes('Aarav');
    if (isAarav) {
      return [
        { label: 'Identity', value: 'Aarav Patel · PAN: ABCPA****G · Aadhaar Verified' },
        { label: 'Land & Property', value: 'Satara Survey 142/B (Wai) · Clean Title Confirmed (NJDG eCourts)' },
        { label: 'Vehicles Registered', value: '0 Vehicles (Strictly verified on MoRTH Vahan)' },
        { label: 'Statutory Obligation', value: 'ITR-2 Filing Due for AY 2026-27 (Section 139(1))' },
      ];
    }
    return [
      { label: 'Identity', value: 'Priya Sharma · PAN: ABCPS****F · Aadhaar Verified' },
      { label: 'Provident Fund', value: 'UAN 1014****1844 · Apex Systems: ₹1,42,500 Unmerged' },
      { label: 'Vehicle Registered', value: 'Ather 450X (KA-01-EQ-4921) · RTO Koramangala' },
      { label: 'Passport Status', value: 'Passport Z198**** expiring on 14 Sep 2026' },
      { label: 'Tax Credit Statement', value: 'TRACES Form 26AS: ₹4,85,000 TDS verified across 2 employers' },
    ];
  };

  const getApplicationIcon = (category: string = '', title: string = '') => {
    const combined = (category + ' ' + title).toUpperCase();
    if (combined.includes('TAX') || combined.includes('ITR') || combined.includes('TRACES') || combined.includes('GST') || combined.includes('26AS')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
          <TaxDocIcon className="w-5 h-5" />
        </div>
      );
    }
    if (combined.includes('PASSPORT') || combined.includes('TRAVEL') || combined.includes('VISA') || combined.includes('IMMIGRATION')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
          <PassportTravelIcon className="w-5 h-5" />
        </div>
      );
    }
    if (combined.includes('VEHICLE') || combined.includes('TRANSPORT') || combined.includes('DRIVING') || combined.includes('RTO') || combined.includes('VAHAN')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
          <VehicleCarIcon className="w-5 h-5" />
        </div>
      );
    }
    if (combined.includes('EPF') || combined.includes('PENSION') || combined.includes('BANK') || combined.includes('SUBSIDY') || combined.includes('KISAN')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
          <SavingsBankIcon className="w-5 h-5" />
        </div>
      );
    }
    if (combined.includes('LAND') || combined.includes('PROPERTY') || combined.includes('REVENUE') || combined.includes('MUNICIPAL')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
          <LandParcelIcon className="w-5 h-5" />
        </div>
      );
    }
    if (combined.includes('HEALTH') || combined.includes('ABHA') || combined.includes('AYUSHMAN')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
          <HealthHeartIcon className="w-5 h-5" />
        </div>
      );
    }
    if (combined.includes('JUSTICE') || combined.includes('LEGAL') || combined.includes('COURT')) {
      return (
        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
          <ScaleOfJusticeIcon className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
        <BuildingIcon className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. GREETING & STATUS */}
      <div className="flex items-center justify-between pb-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
          Good morning, {name.split(' ')[0]}
        </h1>

        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
          <ShieldCheckIcon className="w-3.5 h-3.5 mr-1.5 text-[#059669]" />
          <span>Verified Citizen</span>
        </div>
      </div>


      {/* 2. UNIVERSAL INTENT CONSOLE */}
      <UniversalIntentConsole onExecuteIntent={handleExecuteIntent} />

      {/* 3. CIVIC QUERY ANSWER / INTENT RESULT CARD */}
      {transitionIntent && (
        <div className="p-6 bg-white border-2 border-indigo-600 rounded-2xl shadow-md space-y-4 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                {transitionIntent.intentCategory || transitionIntent.statutoryAuthority || 'CIVIC UNDERSTANDING'}
              </span>

              <span className="text-xs font-semibold text-[#64748B]">
                {transitionIntent.suggestedActionTitle || formatHumanLabel(transitionIntent.intentId)}
              </span>
            </div>

            <button
              onClick={() => {
                setTransitionIntent(null);
                setRelocationImpact(null);
              }}
              className="text-xs text-[#64748B] hover:text-[#0F172A] font-semibold px-2.5 py-1 rounded-lg border border-[#CBD5E1] hover:bg-[#F8FAFC] cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          {/* Dynamic Content based on intent */}
          {transitionIntent.intentId === 'LIFE_EVENT_MOVING' ? (
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">I can help with your relocation.</h2>
              <p className="text-sm text-[#64748B] mt-1.5 leading-relaxed">
                {relocationImpact
                  ? `INDRA identified ${relocationImpact.registrations.length} public registrations requiring synchronization for your move from ${relocationImpact.originCity} to ${relocationImpact.destinationCity}:`
                  : 'Analyzing your verified credentials and documents for cross-ministry relocation requirements...'}
              </p>

              {isSynthesizing ? (
                <div className="p-8 text-center text-sm text-[#64748B]">
                  <div className="inline-block animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mb-2"></div>
                  <div>Synthesizing cross-ministry impact from verified ground truth...</div>
                </div>
              ) : relocationImpact ? (
                <div className="space-y-4 mt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    {relocationImpact.registrations.map((reg: any) => (
                      <div key={reg.id} className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-1">
                        <div className="font-bold text-[#0F172A]">{reg.title}</div>
                        <div className="text-xs text-indigo-700 font-bold">{reg.authority}</div>
                        <div className="text-xs text-[#64748B] leading-relaxed pt-1">{reg.actionRequired}</div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setTransitionIntent(null);
                        onSelectTab('action-plans');
                      }}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-xs flex items-center space-x-2 cursor-pointer"
                    >
                      <span>Open Inter-State Relocation Action Plan</span>
                      <ArrowRightIcon className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            /* GENERAL INQUIRY / VERIFIED RECORD ANSWER */
            <div className="space-y-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A]">
                  {transitionIntent.suggestedActionTitle || 'Here is what INDRA found in your public record:'}
                </h2>
                <p className="text-sm text-[#475569] mt-1.5 leading-relaxed">
                  {transitionIntent.humanExplanation ||
                    transitionIntent.suggestedActionDescription ||
                    'Verified directly against authoritative state databases (UIDAI, EPFO, Income Tax, and Transport).'}
                </p>
              </div>

              {/* Verified Ground Truth Snippets */}
              <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-sm space-y-2.5">
                <div className="font-bold text-[#0F172A] flex items-center space-x-2">
                  <CheckIcon className="w-4 h-4 text-emerald-600" />
                  <span>Verified Citizen State (Ground Truth)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-sm">
                  {getGroundTruthHighlights().map((fact, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white border border-[#CBD5E1] space-y-0.5">
                      <div className="text-xs uppercase font-bold text-[#64748B]">{fact.label}</div>
                      <div className="text-sm font-semibold text-[#0F172A]">{fact.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                {transitionIntent.matchedWorkflowCode ? (
                  <button
                    onClick={() => {
                      const wf = transitionIntent.matchedWorkflowCode!;
                      setTransitionIntent(null);
                      onLaunchWorkflow(wf);
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Launch Guided Workflow</span>
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </button>
                ) : null}

                <button
                  onClick={() => {
                    setTransitionIntent(null);
                    onSelectTab('world-model');
                  }}
                  className="px-5 py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  View Full Public Record →
                </button>

                <button
                  onClick={() => {
                    setTransitionIntent(null);
                    onSelectTab('inbox');
                  }}
                  className="px-5 py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  Go to Action Center →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. PROACTIVE FINDINGS BANNER (Renders dynamically only when active findings exist) */}
      <ProactiveFindingsBanner
        onSelectActionPlan={() => onSelectTab('action-plans')}
        onSelectWorkflow={onLaunchWorkflow}
      />

      {/* 4.5. CITIZEN STATE-TRANSITION ENGINE CALLOUT */}
      <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-white flex items-center justify-center shrink-0">
            <RefreshIcon className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-[#0F172A]">Citizen State-Transition Engine</h3>
              <span className="px-2 py-0.5 rounded text-2xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                Cross-Institution Saga
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-xl">
              Execute complex civic life events with deterministic consequence graphs, contradiction detection, durable suspension upon institutional outages, and three-tier reconciliation.
            </p>
          </div>
        </div>

        <button
          onClick={() => onSelectTab('transitions')}
          className="px-4 py-2.5 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold transition shadow-2xs shrink-0 cursor-pointer flex items-center space-x-2"
        >
          <span>Open Transitions Console</span>
          <ArrowRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5. THINGS NEEDING ATTENTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <AlertCircleIcon className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-bold tracking-wider uppercase text-[#475569]">
              Things Needing Attention
            </h2>
          </div>
        </div>

        <div className="grid items-start grid-cols-1 md:grid-cols-2 gap-5">
          {citizen?.primaryName?.includes('Aarav') ? (
            <>
              {/* Aarav Card 1: Statutory Income Tax Return Due */}
              <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#94A3B8] transition shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                      Statutory Obligation
                    </span>
                    <span className="text-xs text-[#64748B] font-semibold">Income Tax (CPC)</span>
                  </div>
                  <h3 className="font-bold text-lg text-[#0F172A]">Annual Income Tax Return Due (ITR-2)</h3>
                  <p className="text-sm text-[#475569] mt-2 leading-relaxed">
                    Under Section 139(1) of the Income-tax Act, 1961, individual taxpayers with manufacturing and capital gains income must file Form ITR-2 for Assessment Year 2026-27.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#64748B] block font-medium">Statutory Deadline:</span>
                    <span className="text-sm font-bold text-[#0F172A]">31 July 2026</span>
                  </div>
                  <button
                    onClick={() => onLaunchWorkflow('CHECK_ITR_STATUS')}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Check 26AS & Status</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Aarav Card 2: PM-KISAN Direct Benefit Transfer */}
              <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#94A3B8] transition shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                      Direct Benefit Transfer
                    </span>
                    <span className="text-xs text-[#64748B] font-semibold">MoA&FW (PM-KISAN)</span>
                  </div>
                  <h3 className="font-bold text-lg text-[#0F172A]">PM-KISAN Direct Subsidy Seeding Pending</h3>
                  <p className="text-sm text-[#475569] mt-2 leading-relaxed">
                    Your 1.8-hectare agricultural land parcel in Satara (Survey 142/B) is eligible for PM-KISAN ₹6,000 annual installment benefits. Aadhaar-NPCI bank seeding required.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#64748B] block font-medium">Annual Entitlement:</span>
                    <span className="text-sm font-bold text-emerald-700">₹6,000 / Year</span>
                  </div>
                  <button
                    onClick={() => onSelectTab('world-model')}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] transition cursor-pointer"
                  >
                    Verify Land Parcel
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Priya Card 1: Unlinked EPF */}
              <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#94A3B8] transition shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                      Action Recommended
                    </span>
                    <span className="text-xs text-[#64748B] font-semibold">EPFO</span>
                  </div>
                  <h3 className="font-bold text-lg text-[#0F172A]">Unlinked Provident Fund Account Detected</h3>
                  <p className="text-sm text-[#475569] mt-2 leading-relaxed">
                    An inactive EPF account from <strong className="text-[#0F172A]">Apex Systems Global Services</strong> with a balance of{' '}
                    <strong className="text-[#0F172A]">₹1,42,500</strong> was identified under your UAN. Dormant accounts stop compounding interest after 36 months.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#64748B] block font-medium">Recoverable:</span>
                    <span className="text-sm font-bold text-[#0F172A]">₹1,42,500</span>
                  </div>
                  <button
                    onClick={() => onLaunchWorkflow('RECOVER_DORMANT_PF')}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Review & Consolidate</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              </div>

              {/* Priya Card 2: Passport Reissue */}
              <div className="p-6 rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#94A3B8] transition shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 uppercase tracking-wider">
                      Statutory Notice
                    </span>
                    <span className="text-xs text-[#64748B] font-semibold">Passport Seva</span>
                  </div>
                  <h3 className="font-bold text-lg text-[#0F172A]">Passport Reissue Due in September 2026</h3>
                  <p className="text-sm text-[#475569] mt-2 leading-relaxed">
                    Your passport (<code className="text-xs font-mono font-bold text-[#0F172A]">Z198****</code>) reaches 10-year validity on 14 Sep 2026. Most international destinations require at least 6 months remaining validity before entry.
                  </p>
                </div>

                <div className="pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#64748B] block font-medium">Validity:</span>
                    <span className="text-sm font-bold text-[#0F172A]">11 months remaining</span>
                  </div>
                  <button
                    onClick={() => onLaunchWorkflow('RENEW_PASSPORT')}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>Prepare Reissue</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* 6. IN-PROGRESS APPLICATIONS & VERIFIED IDENTITY ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications List */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wider uppercase text-[#475569]">In Progress Applications</h2>
            <button
              onClick={() => onSelectTab('inbox')}
              className="text-xs text-[#64748B] hover:text-[#0F172A] font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>{applications.length} Total</span>
              <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="space-y-3">
            {applications.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#CBD5E1] rounded-2xl text-sm text-[#94A3B8]">
                No active applications. Launch an action above to start.
              </div>
            ) : (
              applications.slice(0, 3).map((app) => (
                <div
                  key={app.id}
                  className="p-5 rounded-2xl bg-white border border-[#CBD5E1] hover:border-[#94A3B8] transition shadow-2xs flex items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3.5">
                    {getApplicationIcon(app.serviceCategory, app.title)}
                    <div>
                      <h4 className="font-bold text-base text-[#0F172A]">{app.title}</h4>
                      <div className="flex items-center space-x-2 text-xs text-[#64748B] mt-1">
                        <span>Ref: {app.referenceCode}</span>
                        <span>·</span>
                        <span>{new Date(app.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-md uppercase tracking-wider ${
                      app.universalStatus === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {app.universalStatus}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Identity & Vault Snapshot */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-wider uppercase text-[#475569]">Verified Identity & Vault</h2>
            <button
              onClick={() => onSelectTab('vault')}
              className="text-xs text-[#64748B] hover:text-[#0F172A] font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>View Vault</span>
              <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-2xs space-y-4">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-[#0F172A]">Aadhaar Card</span>
                <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Verified
                </span>
              </div>
              <div className="font-mono text-sm text-[#64748B]">
                {citizen?.primaryName?.includes('Aarav') ? 'XXXX-XXXX-4567' : 'XXXX-XXXX-9012'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-[#0F172A]">PAN Card</span>
                <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Verified
                </span>
              </div>
              <div className="font-mono text-sm text-[#64748B]">
                {citizen?.primaryName?.includes('Aarav') ? 'BCDEF****K' : 'ABCPS****F'}
              </div>
              {!citizen?.primaryName?.includes('Aarav') && (
                <div className="text-xs text-amber-800 font-medium pt-1 flex items-center justify-between">
                  <span>Name: "Priya S."</span>
                  <button
                    onClick={() => onLaunchWorkflow('RESOLVE_NAME_MISMATCH')}
                    className="underline font-bold text-[#0F172A] hover:text-indigo-600 cursor-pointer"
                  >
                    Harmonize →
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => onSelectTab('world-model')}
              className="w-full py-2.5 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] font-semibold text-sm rounded-xl transition cursor-pointer text-center"
            >
              Inspect Complete Public Record →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
