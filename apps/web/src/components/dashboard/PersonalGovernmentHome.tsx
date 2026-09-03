import React, { useState } from 'react';
import type { StructuredIntent } from '@indra/contracts';
import { UniversalIntentConsole } from '../intent/UniversalIntentConsole.js';
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
} from '../icons.js';

import { fetchRelocationImpact } from '../../api.js';

interface PersonalGovernmentHomeProps {
  citizen: any;
  applications: any[];
  onLaunchWorkflow: (workflowCode: string, initialContext?: Record<string, unknown>) => void;
  onSelectTab: (tab: 'inbox' | 'vault' | 'trust') => void;
}

export function PersonalGovernmentHome({
  citizen,
  applications,
  onLaunchWorkflow,
  onSelectTab,
}: PersonalGovernmentHomeProps) {
  // State for rich multi-aspect transition preview (e.g., "I moved to Bengaluru")
  const [transitionIntent, setTransitionIntent] = useState<StructuredIntent | null>(null);
  const [relocationImpact, setRelocationImpact] = useState<any | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const handleExecuteIntent = async (intent: StructuredIntent) => {
    if (intent.intentId === 'LIFE_EVENT_MOVING') {
      setTransitionIntent(intent);
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
    } else {
      setTransitionIntent(intent);
    }
  };

  const name = citizen?.primaryName || 'Priya Sharma';

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* 1. HERO GREETING & VERIFIED PUBLIC IDENTITY STATUS */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
            Good morning, {name.split(' ')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-normal">
            Here's your verified state across public identity, employment records, applications, and security.
          </p>
        </div>

        <div className="text-right self-start sm:self-auto flex-shrink-0">
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
            <ShieldCheckIcon className="w-3.5 h-3.5 mr-1.5 text-[#059669]" />
            <span>Verified Citizen</span>
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-1">
            Ground Truth: UIDAI · Income Tax · EPFO
          </div>
        </div>
      </div>

      {/* 2. UNIVERSAL INTENT CONSOLE */}
      <UniversalIntentConsole onExecuteIntent={handleExecuteIntent} />

      {/* 3. MULTI-REGISTRY INTENT SYNTHESIS TRANSITION (When citizen says "I moved to Bengaluru") */}
      {transitionIntent?.intentId === 'LIFE_EVENT_MOVING' && (
        <div className="p-6 bg-white border-2 border-[#0F172A] rounded-2xl shadow-md space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                LIFE EVENT · MULTI-REGISTRY SYNTHESIS
              </span>
              <h2 className="text-xl font-bold text-[#0F172A] mt-1">I can help with that.</h2>
              <p className="text-xs text-[#64748B]">
                {relocationImpact
                  ? `INDRA identified ${relocationImpact.registrations.length} public registrations requiring synchronization for your move from ${relocationImpact.originCity} to ${relocationImpact.destinationCity}:`
                  : 'Analyzing your verified credentials and documents for cross-ministry relocation requirements...'}
              </p>
            </div>
            <button
              onClick={() => {
                setTransitionIntent(null);
                setRelocationImpact(null);
              }}
              className="text-xs text-[#64748B] hover:text-[#0F172A] font-semibold px-2 py-1 rounded border border-[#E2E8F0]"
            >
              Dismiss ✕
            </button>
          </div>

          {isSynthesizing ? (
            <div className="p-8 text-center text-xs text-[#64748B]">
              <div className="inline-block animate-spin w-5 h-5 border-2 border-[#0F172A] border-t-transparent rounded-full mb-2"></div>
              <div>Synthesizing cross-ministry impact from verified ground truth...</div>
            </div>
          ) : relocationImpact ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {relocationImpact.registrations.map((reg: any) => (
                  <div key={reg.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1">
                    <div className="font-bold text-[#0F172A]">{reg.title}</div>
                    <div className="text-[11px] text-indigo-700 font-semibold">{reg.authority}</div>
                    <div className="text-[11px] text-[#64748B] leading-relaxed pt-1">{reg.actionRequired}</div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#334155] space-y-1.5">
                <div className="font-semibold text-[#0F172A]">Verified from Government Ground Truth:</div>
                {relocationImpact.verifiedGroundTruth.map((fact: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2 text-emerald-800">
                    <CheckIcon className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>
                      <strong className="font-semibold text-[#0F172A]">{fact.label}:</strong> {fact.value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => {
                setTransitionIntent(null);
                onLaunchWorkflow('RESOLVE_NAME_MISMATCH');
              }}
              className="px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Review & Synchronize Registrations</span>
              <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* 4. THINGS NEEDING ATTENTION */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
            Things Needing Attention
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* CARD 1: DORMANT PF */}
          <div className="bg-white border-2 border-amber-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Action Recommended
                </span>
                <span className="text-xs font-bold text-[#64748B]">EPFO</span>
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Unlinked Provident Fund Account Detected</h3>
              <p className="text-xs text-[#475569] mt-2 leading-relaxed">
                An inactive EPF account from <strong>Apex Systems Global Services</strong> with a balance of{' '}
                <strong>₹1,42,500</strong> was identified under your UAN. Dormant accounts stop compounding interest after 36 months.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B]">Recoverable: ₹1,42,500</span>
              <button
                onClick={() => onLaunchWorkflow('RECOVER_DORMANT_PF')}
                className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer flex items-center space-x-1"
              >
                <span>Review & Consolidate</span>
                <ArrowRightIcon className="w-3 h-3 ml-1" />
              </button>
            </div>
          </div>

          {/* CARD 2: PASSPORT EXPIRY */}
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs hover:border-[#CBD5E1] transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-200">
                  Notice
                </span>
                <span className="text-xs font-bold text-[#64748B]">Passport Seva</span>
              </div>
              <h3 className="text-base font-bold text-[#0F172A]">Passport Reissue Due in September 2026</h3>
              <p className="text-xs text-[#475569] mt-2 leading-relaxed">
                Your passport (Z198****) reaches 10-year validity on 14 Sep 2026. Most international destinations require at least 6 months remaining validity before entry.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B]">Validity: 11 months remaining</span>
              <button
                onClick={() => onLaunchWorkflow('RESOLVE_NAME_MISMATCH')}
                className="px-4 py-2 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#0F172A] text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Prepare Reissue
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 5. IN-FLIGHT ACTIONS & VERIFIED CREDENTIALS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* IN-FLIGHT APPLICATION TRACKER (1 col) */}
        <div className="lg:col-span-1 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">In Progress Applications</h2>
            <span className="text-[10px] text-[#64748B] font-mono">{applications.length} Active</span>
          </div>

          <div className="space-y-3">
            {applications.length > 0 ? (
              applications.map((app) => (
                <div key={app.id} className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0F172A]">{app.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        app.universalStatus === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : app.universalStatus === 'FAILED'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {app.universalStatus}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] mono flex items-center justify-between">
                    <span>Ref: {app.referenceCode}</span>
                    <span>{new Date(app.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-[#94A3B8] text-center py-6 italic">
                No open applications. All public records and filings are currently settled.
              </div>
            )}
          </div>
        </div>

        {/* VERIFIED PUBLIC IDENTITY & VAULT (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
              Verified Public Identity & Vault
            </h2>
            <button
              onClick={() => onSelectTab('vault')}
              className="text-xs text-[#0F172A] font-bold hover:underline cursor-pointer"
            >
              View Document Vault →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* AADHAAR */}
            <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                ID
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-[#0F172A]">Aadhaar Card</div>
                <div className="text-[11px] text-[#64748B] mono">XXXX-XXXX-9012</div>
                <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center">
                  <CheckIcon className="w-3 h-3 mr-1 text-emerald-600" />
                  <span>Verified via UIDAI Ground Truth</span>
                </div>
              </div>
            </div>

            {/* PAN */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/20 flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#334155] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                TX
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-[#0F172A]">Permanent Account Number</div>
                <div className="text-[11px] text-[#64748B] mono">ABCPS****F</div>
                <div className="text-[10px] text-amber-700 font-bold mt-1">
                  ⚠️ Name shown as "Priya S."
                </div>
                <button
                  onClick={() => onLaunchWorkflow('RESOLVE_NAME_MISMATCH')}
                  className="mt-2 text-[11px] font-bold text-[#0F172A] hover:underline flex items-center cursor-pointer"
                >
                  <span>Harmonize Name</span>
                  <ArrowRightIcon className="w-2.5 h-2.5 ml-1" />
                </button>
              </div>
            </div>

            {/* DRIVING LICENCE */}
            <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#475569] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                DL
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-[#0F172A]">Driving Licence (KA-01)</div>
                <div className="text-[11px] text-[#64748B] mono">KA-01-2018-******</div>
                <div className="text-[10px] text-emerald-700 font-bold mt-1 flex items-center">
                  <CheckIcon className="w-3 h-3 mr-1 text-emerald-600" />
                  <span>Valid until 2038</span>
                </div>
              </div>
            </div>

            {/* EPFO UAN */}
            <div className="p-3.5 rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-[#1E293B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                PF
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-[#0F172A]">Universal Account Number</div>
                <div className="text-[11px] text-[#64748B] mono">1014****1844</div>
                <div className="text-[10px] text-sky-700 font-bold mt-1">
                  Active: InnoTech Solutions India
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
