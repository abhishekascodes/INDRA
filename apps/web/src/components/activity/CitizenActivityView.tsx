import React, { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  CheckCircle2Icon,
  ClockIcon,
  ArrowRightIcon,
  BuildingIcon,
  FileTextIcon,
  MapPinIcon,
  CheckIcon,
  VehicleCarIcon,
  SavingsBankIcon,
  TaxDocIcon,
} from '../icons.js';
import { CitizenTransitionConsole } from '../transition/CitizenTransitionConsole.js';
import { fetchCitizenTransitions } from '../../api.js';

interface CitizenActivityViewProps {
  citizen: any;
  onRefreshCitizen?: () => void;
  onNavigateToRecords?: () => void;
  initialMode?: 'timeline' | 'engine';
}

interface ActivityEvent {
  id: string;
  title: string;
  authority: string;
  category: 'PROPERTY' | 'TRANSPORT' | 'IDENTITY' | 'FINANCE' | 'TAX';
  status: 'COMPLETED' | 'SYNCHRONIZED' | 'RECONCILED' | 'IN_PROGRESS';
  timestamp: string;
  description: string;
  receiptNumber: string;
  provenanceHash: string;
  idempotencyKey: string;
  statutoryReference: string;
  verifiedOutcome: string;
}

export function CitizenActivityView({
  citizen,
  onRefreshCitizen,
  onNavigateToRecords,
  initialMode = 'timeline',
}: CitizenActivityViewProps) {
  const [activeMode, setActiveMode] = useState<'timeline' | 'engine'>(initialMode);
  const [selectedReceipt, setSelectedReceipt] = useState<ActivityEvent | null>(null);
  const [expandedProvenanceId, setExpandedProvenanceId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    fetchCitizenTransitions().catch(() => {});
  }, [citizen?.id]);

  const isAarav = citizen?.primaryName?.includes('Aarav');

  const defaultActivities: ActivityEvent[] = isAarav
    ? [
        {
          id: 'act-001',
          title: 'Satara Land Title Clearance & Non-Encumbrance Verification',
          authority: 'Maharashtra Revenue Department & NJDG eCourts',
          category: 'PROPERTY',
          status: 'COMPLETED',
          timestamp: 'Today at 09:15 AM',
          description: 'Verified 30-year non-encumbrance record for Survey 142/B, Wai Taluk, Satara. Zero litigation or pending revenue disputes confirmed.',
          receiptNumber: 'MH-REV-SAT-2026-009842',
          provenanceHash: 'sha256:7f9b8c31e42d6a01f5a9e32c81d09b6a12c8e43f',
          idempotencyKey: 'IDEMP-NJDG-WAI-142B',
          statutoryReference: 'Maharashtra Land Revenue Code, 1966 Sec 148',
          verifiedOutcome: 'Clean freehold title recorded in digital revenue register.',
        },
        {
          id: 'act-002',
          title: 'Aadhaar & PAN Cross-Registry Verification',
          authority: 'UIDAI & Central Board of Direct Taxes (CBDT)',
          category: 'IDENTITY',
          status: 'SYNCHRONIZED',
          timestamp: 'Yesterday at 04:30 PM',
          description: 'Aadhaar biometric ground truth matched against PAN ABCPA****G with 100% legal name alignment.',
          receiptNumber: 'CBDT-UIDAI-SYNC-2026-4410',
          provenanceHash: 'sha256:4a1e9c80d23f71b6e54c8a29b01d34f892c710ef',
          idempotencyKey: 'IDEMP-PAN-AADHAAR-HARMONIZE',
          statutoryReference: 'Income Tax Act, 1961 Sec 139AA',
          verifiedOutcome: 'Demographic hash synchronized across national master records.',
        },
        {
          id: 'act-003',
          title: 'ITR-2 Filing Obligations & Tax Credit Reconciliation',
          authority: 'Income Tax Department (TRACES & e-Filing)',
          category: 'TAX',
          status: 'RECONCILED',
          timestamp: '05 Sep 2026',
          description: 'Pre-populated TRACES 26AS dividend and salary tax credits for AY 2026-27 filing readiness.',
          receiptNumber: 'ITD-TRACES-26AS-894120',
          provenanceHash: 'sha256:8b2a1c90e43f65d7a12c98b043e71d60fa23bc19',
          idempotencyKey: 'IDEMP-TRACES-26AS-PULL',
          statutoryReference: 'Income Tax Rules, Rule 31AB',
          verifiedOutcome: 'Verified tax credits ready for statutory verification.',
        },
      ]
    : [
        {
          id: 'act-101',
          title: 'Devanahalli Revenue Mutation Approved & RTC Issued',
          authority: 'Karnataka Revenue Department (Bhoomi) & Kaveri 2.0',
          category: 'PROPERTY',
          status: 'COMPLETED',
          timestamp: 'Today at 10:45 AM',
          description: 'Registered Sale Deed KA-BLR-DEV-2026-00481 mutated into Record of Rights, Tenancy & Crops (RTC) for Survey No. 142/3.',
          receiptNumber: 'RTC-BLR-DEV-2026-009812',
          provenanceHash: 'sha256:3e8b41a9c02d74f8b91a23c56e01d84f29a73c18',
          idempotencyKey: 'IDEMP-BHOOMI-MUT-142-3',
          statutoryReference: 'Karnataka Land Revenue Act, 1964 Sec 128-129',
          verifiedOutcome: 'Priya Sharma recorded as sole Khatedar in Devanahalli Taluk revenue register.',
        },
        {
          id: 'act-102',
          title: 'Inter-State Vehicle NOC & Karnataka Tax Clearance',
          authority: 'Ministry of Road Transport (Vahan) & Karnataka Transport (KA-50)',
          category: 'TRANSPORT',
          status: 'SYNCHRONIZED',
          timestamp: 'Yesterday at 03:15 PM',
          description: 'Electronic NOC for Ather 450X (KA-01-EQ-4921) cross-verified with Yelahanka RTO with zero pending challans.',
          receiptNumber: 'MORTH-VAHAN-NOC-2026-8819',
          provenanceHash: 'sha256:9f2c81d04e3b7a65c10d82e49a1f34b82c701de4',
          idempotencyKey: 'IDEMP-VAHAN-NOC-SYNC',
          statutoryReference: 'Central Motor Vehicles Rules, 1989 Rule 58',
          verifiedOutcome: 'Transport record updated with local Bengaluru residential jurisdiction.',
        },
        {
          id: 'act-103',
          title: 'Legal Name Harmonization Across PAN & Aadhaar',
          authority: 'UIDAI & Central Board of Direct Taxes (Income Tax)',
          category: 'IDENTITY',
          status: 'RECONCILED',
          timestamp: '06 Sep 2026',
          description: 'Reconciled name variation between Aadhaar (Priya Sharma) and PAN record (Priya M. Sharma) via authenticated cryptographic bridge.',
          receiptNumber: 'CBDT-PAN-AADHAAR-2026-1049',
          provenanceHash: 'sha256:1a8d9e20f43c71b5a92c84e031b67d98c21a45ef',
          idempotencyKey: 'IDEMP-PAN-RECONCILE-001',
          statutoryReference: 'Income Tax Act Sec 139AA & Aadhaar Act Sec 8',
          verifiedOutcome: 'Unified legal name established across all national statutory registries.',
        },
        {
          id: 'act-104',
          title: 'Dormant EPFO Account Consolidated to Current UAN',
          authority: 'Employees\' Provident Fund Organisation (Ministry of Labour)',
          category: 'FINANCE',
          status: 'COMPLETED',
          timestamp: '04 Sep 2026',
          description: 'Consolidated ₹1,42,500 unmerged balance from previous employer Apex Systems (MH/BAN/0014844/000) into active UAN 1014****1844.',
          receiptNumber: 'EPFO-CONSOL-2026-004128',
          provenanceHash: 'sha256:5b9e21a0c43d87f1a23c90e56b01d78f34a82c19',
          idempotencyKey: 'IDEMP-EPFO-ANNEXURE-K',
          statutoryReference: 'Employees\' Provident Funds Scheme, 1952 Para 57',
          verifiedOutcome: '₹1,42,500 successfully credited to verified active provident fund ledger.',
        },
        {
          id: 'act-105',
          title: 'TRACES Form 26AS Tax Deductions Reconciled',
          authority: 'Income Tax Department (TRACES Central Cell)',
          category: 'TAX',
          status: 'SYNCHRONIZED',
          timestamp: '02 Sep 2026',
          description: 'Pre-populated ₹4,85,000 TDS credits verified across 2 employers for Assessment Year 2026-27 filing readiness.',
          receiptNumber: 'ITD-TRACES-26AS-771920',
          provenanceHash: 'sha256:6c0a1b92e34f78d5a12c89b043e62d71fa34bc20',
          idempotencyKey: 'IDEMP-TRACES-PULL-2026',
          statutoryReference: 'Income Tax Rules, Rule 31AB',
          verifiedOutcome: 'TDS records reconciled; zero tax discrepancy detected.',
        },
      ];

  const filteredActivities =
    filterCategory === 'ALL'
      ? defaultActivities
      : defaultActivities.filter((a) => a.category === filterCategory);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PROPERTY':
        return <MapPinIcon className="w-4 h-4 text-[#475569]" />;
      case 'TRANSPORT':
        return <VehicleCarIcon className="w-4 h-4 text-[#475569]" />;
      case 'IDENTITY':
        return <ShieldCheckIcon className="w-4 h-4 text-[#475569]" />;
      case 'FINANCE':
        return <SavingsBankIcon className="w-4 h-4 text-[#475569]" />;
      case 'TAX':
        return <TaxDocIcon className="w-4 h-4 text-[#475569]" />;
      default:
        return <BuildingIcon className="w-4 h-4 text-[#475569]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
            <CheckIcon className="w-3 h-3 text-emerald-600" />
            <span>Completed</span>
          </span>
        );
      case 'SYNCHRONIZED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 flex items-center space-x-1">
            <CheckCircle2Icon className="w-3 h-3 text-blue-600" />
            <span>Synchronized</span>
          </span>
        );
      case 'RECONCILED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center space-x-1">
            <ShieldCheckIcon className="w-3 h-3 text-indigo-600" />
            <span>Reconciled</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center space-x-1">
            <ClockIcon className="w-3 h-3 text-amber-600" />
            <span>In Progress</span>
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-8 animate-fadeIn pb-16 pt-2">
      {/* 1. HEADER MATCHING WORLD MODEL / VAULT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E8F0] pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
              Verified Activity
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Simulated Public Record · Synchronized with National Registries
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            Activity & Verification History
          </h1>
          <p className="text-sm sm:text-base text-[#475569] mt-1.5 leading-relaxed max-w-3xl">
            Official record of automated state transitions, cross-department filings, and verified digital receipts.
          </p>
        </div>

        {/* View Switcher Tabs matching portal tabs */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveMode('timeline')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border cursor-pointer ${
              activeMode === 'timeline'
                ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                : 'bg-white hover:bg-[#F8FAFC] border-[#CBD5E1] text-[#475569]'
            }`}
          >
            Activity Timeline
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('engine')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border cursor-pointer ${
              activeMode === 'engine'
                ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-xs'
                : 'bg-white hover:bg-[#F8FAFC] border-[#CBD5E1] text-[#475569]'
            }`}
          >
            Transition Engine
          </button>
        </div>
      </div>

      {activeMode === 'engine' ? (
        /* EMBEDDED CERTIFIED TRANSITION CONSOLE */
        <CitizenTransitionConsole
          citizen={citizen}
          onRefreshCitizen={onRefreshCitizen}
          onNavigateToRecords={onNavigateToRecords}
        />
      ) : (
        /* TIMELINE & RECEIPTS VIEW */
        <div className="space-y-8">
          {/* 2. FLAGSHIP LIFE TRANSITION SHOWCASE (CLEAN WHITE CARD) */}
          <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
              <div className="flex items-center space-x-2.5">
                <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-bold uppercase tracking-wider">
                  Coordinated Life Transition
                </span>
                <span className="text-xs text-[#64748B] font-semibold">
                  {isAarav ? 'Satara Property Acquisition' : 'Inter-State Relocation & Property Acquisition'}
                </span>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CheckCircle2Icon className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                State Convergence Verified
              </span>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                {isAarav
                  ? 'Satara Land Title Clearance & Revenue Integration'
                  : '"I moved to Bangalore and bought a plot in Devanahalli"'}
              </h2>
              <p className="text-sm text-[#475569] mt-1.5 leading-relaxed max-w-3xl">
                Coordinated filings across 4 official authorities: registered title deed at Kaveri 2.0 Sub-Registrar, revenue mutation at Bhoomi Land Records, vehicle jurisdiction at Yelahanka RTO, and demographic synchronization at UIDAI.
              </p>
            </div>

            {/* 4 Authority Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <div className="text-2xs font-semibold text-[#64748B] uppercase">Land Revenue</div>
                <div className="text-xs font-bold text-[#0F172A] mt-0.5">Bhoomi RTC</div>
                <div className="text-2xs text-emerald-700 font-medium mt-0.5">✓ Verified</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <div className="text-2xs font-semibold text-[#64748B] uppercase">Deed Registry</div>
                <div className="text-xs font-bold text-[#0F172A] mt-0.5">Kaveri 2.0</div>
                <div className="text-2xs text-emerald-700 font-medium mt-0.5">✓ Registered</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <div className="text-2xs font-semibold text-[#64748B] uppercase">National ID</div>
                <div className="text-xs font-bold text-[#0F172A] mt-0.5">UIDAI Master</div>
                <div className="text-2xs text-emerald-700 font-medium mt-0.5">✓ Reconciled</div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                <div className="text-2xs font-semibold text-[#64748B] uppercase">Transport</div>
                <div className="text-xs font-bold text-[#0F172A] mt-0.5">KA-50 RTO</div>
                <div className="text-2xs text-emerald-700 font-medium mt-0.5">✓ Synchronized</div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-3 border-t border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-[#64748B]">
                Single citizen authorization gate · Self-healing Bhoomi outage recovery
              </span>
              <button
                type="button"
                onClick={() => setActiveMode('engine')}
                className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>Open Interactive Transition Console</span>
                <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>

          {/* 3. CATEGORY FILTER BAR */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {[
              { id: 'ALL', label: 'All Activities' },
              { id: 'PROPERTY', label: 'Land & Property' },
              { id: 'TRANSPORT', label: 'Transport' },
              { id: 'IDENTITY', label: 'National Identity' },
              { id: 'FINANCE', label: 'Social Security' },
              { id: 'TAX', label: 'Tax & Revenue' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-4 py-2 text-sm font-semibold rounded-xl border transition cursor-pointer shrink-0 ${
                  filterCategory === cat.id
                    ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-xs'
                    : 'bg-white border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#475569] hover:border-[#94A3B8]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 4. CHRONOLOGICAL CITIZEN ACTIVITY LIST */}
          <div className="space-y-4">
            {filteredActivities.map((act) => {
              const isExpanded = expandedProvenanceId === act.id;

              return (
                <div
                  key={act.id}
                  className="p-6 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs hover:border-[#94A3B8] transition space-y-4"
                >
                  {/* Top Bar: Authority, Status, Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F1F5F9]">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                        {getCategoryIcon(act.category)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#0F172A]">{act.authority}</div>
                        <div className="text-2xs text-[#64748B]">{act.statutoryReference}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-start sm:self-auto">
                      {getStatusBadge(act.status)}
                      <span className="text-xs text-[#94A3B8] font-medium">{act.timestamp}</span>
                    </div>
                  </div>

                  {/* Body: Title & Citizen Outcome Description */}
                  <div>
                    <h3 className="text-base font-bold text-[#0F172A]">{act.title}</h3>
                    <p className="text-sm text-[#475569] mt-1.5 leading-relaxed">
                      {act.description}
                    </p>
                    <div className="mt-3 p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs flex items-center space-x-2 text-[#334155]">
                      <CheckCircle2Icon className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span><strong>Verified Outcome:</strong> {act.verifiedOutcome}</span>
                    </div>
                  </div>

                  {/* Footer: Receipt and Technical Provenance Inspect */}
                  <div className="pt-3 border-t border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="text-[#64748B] font-mono text-xs">
                      Receipt Ref: <strong className="text-[#0F172A] font-semibold">{act.receiptNumber}</strong>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(act)}
                        className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5"
                      >
                        <FileTextIcon className="w-3.5 h-3.5 text-[#64748B]" />
                        <span>Synthetic Digital Receipt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedProvenanceId(isExpanded ? null : act.id)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A] text-xs font-semibold transition cursor-pointer"
                      >
                        {isExpanded ? 'Hide Verification' : 'Inspect Verification'}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Technical Provenance (Clean Neutral Box) */}
                  {isExpanded && (
                    <div className="mt-3 p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-xs text-[#334155] space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between text-2xs pb-2 border-b border-[#E2E8F0] text-[#64748B]">
                        <span className="font-bold uppercase tracking-wider">Deterministic State Transition Provenance</span>
                        <span>Simulated Registry Acknowledgement</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs pt-1">
                        <div>
                          <span className="text-[#64748B] block font-medium">State Transition Root Hash:</span>
                          <span className="text-indigo-700 font-semibold break-all">{act.provenanceHash}</span>
                        </div>
                        <div>
                          <span className="text-[#64748B] block font-medium">Idempotency Key:</span>
                          <span className="text-[#0F172A] font-semibold">{act.idempotencyKey}</span>
                        </div>
                      </div>
                      <div className="text-2xs text-[#64748B] pt-1">
                        <span className="block font-medium">Statutory Legal Framework:</span>
                        <span className="text-[#0F172A]">{act.statutoryReference} · Digital Registry Signature Verified</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. SYNTHETIC DIGITAL RECEIPT MODAL (CLEAN WHITE CARD) */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-[#CBD5E1] space-y-5 relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <div className="text-2xs font-extrabold uppercase tracking-wider text-[#64748B]">
                  Official Verification Receipt
                </div>
                <h3 className="text-lg font-bold text-[#0F172A] mt-1">
                  {selectedReceipt.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="w-8 h-8 rounded-full bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] flex items-center justify-center text-[#64748B] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Receipt Summary Grid */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[#64748B] font-medium">Receipt Number:</span>
                <span className="font-mono font-bold text-[#0F172A]">{selectedReceipt.receiptNumber}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[#64748B] font-medium">Issuing Authority:</span>
                <span className="font-bold text-[#0F172A] text-right">{selectedReceipt.authority}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[#64748B] font-medium">Citizen:</span>
                <span className="font-bold text-[#0F172A]">{citizen?.primaryName || 'Priya Sharma'}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[#64748B] font-medium">State Convergence:</span>
                <span className="font-bold text-emerald-800">✓ Reconciled & Legally Final</span>
              </div>
            </div>

            {/* Provenance Box */}
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-2xs font-mono space-y-1">
              <div className="text-[#64748B] text-2xs uppercase font-bold">Cryptographic Verification Anchor</div>
              <div className="text-indigo-700 font-semibold break-all">{selectedReceipt.provenanceHash}</div>
              <div className="text-[#64748B] pt-0.5">Simulated Public Registry Transaction · Tamper-evident receipt</div>
            </div>

            {/* Close CTA */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
