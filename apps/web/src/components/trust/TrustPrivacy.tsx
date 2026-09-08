import React, { useState } from 'react';
import { ShieldCheckIcon, LockIcon, CheckIcon, AlertCircleIcon, CloseIcon, InfoIcon } from '../icons.js';
import { formatHumanLabel } from '../../utils/civicFormatters.js';

interface TrustPrivacyProps {
  auditLogs: any[];
  consents: any[];
}

export function TrustPrivacy({ auditLogs = [], consents = [] }: TrustPrivacyProps) {
  const [revokedConsentIds, setRevokedConsentIds] = useState<Set<string>>(new Set());
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  const defaultConsents = [
    {
      id: 'cs-001',
      purpose: 'Cross-Registry Land Mutation & Encumbrance Synchronization',
      statutoryFramework: 'Karnataka Land Revenue Act, 1964 Sec 128 & DPDP Act 2023 Sec 4',
      actionDescription: 'Enables INDRA to pull registered sale deeds from Kaveri 2.0 Sub-Registrar and submit RTC mutation petitions to Bhoomi Revenue.',
      dataElementsScope: ['Property Ownership', 'Deed Records', 'Khata Certificate'],
      grantedAt: '2026-09-01T09:00:00Z',
    },
    {
      id: 'cs-002',
      purpose: 'Statutory Identity Authentication & Legal Name Harmonization',
      statutoryFramework: 'Aadhaar Act, 2016 Sec 8 & DPDP Act 2023 Sec 6',
      actionDescription: 'Delegated token allowing one-time demographic verification and cross-ministry legal name harmonization between UIDAI and CBDT.',
      dataElementsScope: ['Legal Full Name', 'Date of Birth', 'Biometric Hash Anchor'],
      grantedAt: '2026-08-15T11:30:00Z',
    },
    {
      id: 'cs-003',
      purpose: 'Inter-State Vehicle Record & Road Tax Re-assignment',
      statutoryFramework: 'Central Motor Vehicles Rules, 1989 Rule 58',
      actionDescription: 'Permits transfer of vehicle registration records from Maharashtra to Karnataka Transport Department (KA-50 Yelahanka RTO).',
      dataElementsScope: ['Registration Certificate', 'Emission Norms', 'Challan History'],
      grantedAt: '2026-08-20T14:15:00Z',
    },
    {
      id: 'cs-004',
      purpose: 'Provident Fund Consolidation & Transfer Authorization',
      statutoryFramework: 'Employees\' Provident Funds Scheme, 1952 Para 57',
      actionDescription: 'Allows balance discovery across past member IDs and automated submission of Annexure-K transfer claims to EPFO.',
      dataElementsScope: ['UAN ID', 'Past Employer Contributions', 'Pension Ledger'],
      grantedAt: '2026-08-10T16:45:00Z',
    },
  ];

  const effectiveConsents = consents.length > 0 ? consents : defaultConsents;

  const handleRevokeConsent = (consentId: string) => {
    setRevokedConsentIds((prev) => new Set(prev).add(consentId));
    setConfirmRevokeId(null);
  };

  return (
    <div className="w-full space-y-8 animate-fadeIn pb-16 pt-2">
      {/* 1. HEADER & SYNTHETIC BOUNDARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E8F0] pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-md">
              DPDP 2023 Statutory Governance
            </span>
            <span className="text-xs font-semibold text-slate-500">
              INDRA PROTOTYPE · SYNTHETIC PUBLIC INFRASTRUCTURE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            Trust, Privacy & Consent Governance
          </h1>
          <p className="text-sm sm:text-base text-[#475569] mt-1.5 leading-relaxed max-w-3xl">
            Complete citizen sovereignty over personal data. Every public department query, statutory consent grant, and cryptographic transition is immutably logged and revocable at will.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl shrink-0 shadow-2xs">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
          <span>DPDP Compliant</span>
        </div>
      </div>

      {/* 2. STATUTORY PRINCIPLES BANNER */}
      <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#CBD5E1] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="space-y-1">
          <div className="font-bold text-[#0F172A] flex items-center space-x-2">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Purpose Limitation (Sec 4)</span>
          </div>
          <p className="text-[#64748B] leading-relaxed">
            Data is strictly accessed for verified citizen intents and never shared across ministries without explicit authorization.
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-bold text-[#0F172A] flex items-center space-x-2">
            <LockIcon className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Unconditional Revocation (Sec 6)</span>
          </div>
          <p className="text-[#64748B] leading-relaxed">
            You may revoke state data access at any time. Revocation immediately terminates API authorization bridges.
          </p>
        </div>

        <div className="space-y-1">
          <div className="font-bold text-[#0F172A] flex items-center space-x-2">
            <CheckIcon className="w-4 h-4 text-[#0F172A] shrink-0" />
            <span>Deterministic Provenance</span>
          </div>
          <p className="text-[#64748B] leading-relaxed">
            Every read and write is anchored with SHA-256 state roots, ensuring non-repudiable auditability for citizens.
          </p>
        </div>
      </div>

      {/* 3. STATUTORY CONSENT LEDGER */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
              Active Statutory Consents & Data Access
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Permissions explicitly granted to INDRA to verify records and submit digital filings.
            </p>
          </div>
          <span className="text-xs font-bold text-[#64748B] px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
            {effectiveConsents.length} Statutory Grants
          </span>
        </div>

        <div className="space-y-3">
          {effectiveConsents.length > 0 ? (
            effectiveConsents.map((c) => {
              const isRevoked = revokedConsentIds.has(c.id);

              return (
                <div
                  key={c.id}
                  className={`p-5 rounded-2xl bg-white border transition shadow-xs text-sm space-y-3 ${
                    isRevoked ? 'border-rose-200 bg-rose-50/20' : 'border-[#CBD5E1] hover:border-[#94A3B8]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-xl ${isRevoked ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {isRevoked ? <CloseIcon className="w-4 h-4" /> : <CheckIcon className="w-4 h-4" />}
                      </div>
                      <div>
                        <span className="font-bold text-[#0F172A] text-base">{c.purpose}</span>
                        <div className="text-xs text-[#64748B]">Legal Scope: {c.statutoryFramework || 'Digital Personal Data Protection Act, 2023'}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-start sm:self-auto">
                      {isRevoked ? (
                        <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-900 border border-rose-200">
                          REVOKED BY CITIZEN
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center">
                          <CheckIcon className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Authorized
                        </span>
                      )}

                      {!isRevoked && (
                        confirmRevokeId === c.id ? (
                          <div className="flex items-center space-x-1.5 animate-fadeIn">
                            <button
                              type="button"
                              onClick={() => handleRevokeConsent(c.id)}
                              className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-2xs"
                            >
                              Confirm Revoke
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRevokeId(null)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRevokeId(c.id)}
                            className="px-3 py-1 rounded-lg bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-600 hover:text-rose-700 font-semibold text-xs transition cursor-pointer"
                          >
                            Revoke Consent
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                    {c.actionDescription}
                  </div>

                  {isRevoked && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center space-x-2">
                      <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Data access has been severed. State registries will not receive automated updates under this grant.</span>
                    </div>
                  )}

                  <div className="text-xs text-[#64748B] flex flex-col sm:flex-row sm:items-center justify-between pt-2 border-t border-[#F1F5F9] gap-1">
                    <span>
                      Data Fields: <strong className="text-slate-700">{Array.isArray(c.dataElementsScope) ? c.dataElementsScope.map((s: string) => formatHumanLabel(s)).join(', ') : 'Ground Truth Profile'}</strong>
                    </span>
                    <span>Granted: {new Date(c.grantedAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-sm text-[#94A3B8] italic bg-white rounded-2xl border border-[#CBD5E1]">
              No active statutory consents recorded.
            </div>
          )}
        </div>
      </section>

      {/* 4. IMMUTABLE AUDIT TRAIL */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
              Deterministic Audit Trail
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Append-only ledger of registry queries and state modifications.
            </p>
          </div>
          <span className="text-xs font-bold text-[#64748B] px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
            {auditLogs.length} Events
          </span>
        </div>

        <div className="bg-white border border-[#CBD5E1] rounded-2xl divide-y divide-[#F1F5F9] shadow-xs overflow-hidden">
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedAuditLog(selectedAuditLog?.id === log.id ? null : log)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm hover:bg-[#F8FAFC] transition cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#0F172A] text-xs sm:text-sm">{formatHumanLabel(log.actionType)}</span>
                    <span className="px-2 py-0.2 rounded-md bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase border border-slate-200">
                      {log.actorRole || 'Citizen Authorized'}
                    </span>
                  </div>
                  <div className="text-xs text-[#64748B]">
                    Authority / Target: <span className="font-medium text-slate-800">{formatHumanLabel(log.targetEntity || 'System')}</span>
                  </div>
                </div>

                <div className="text-right text-xs text-[#94A3B8] font-mono">
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>
              </div>
            ))
          ) : (
            <div className="p-10 text-center text-sm text-[#94A3B8] italic">
              No audit logs recorded yet.
            </div>
          )}
        </div>
      </section>

      {/* 5. AUDIT LOG DETAIL MODAL / DRAWER */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="text-2xs font-extrabold uppercase tracking-wider text-slate-500">
                  INDRA AUDIT RECORD
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {formatHumanLabel(selectedAuditLog.actionType)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
                <span className="text-slate-500">Event ID:</span>
                <span className="font-mono font-bold text-slate-900">{selectedAuditLog.id}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
                <span className="text-slate-500">Actor Role:</span>
                <span className="font-bold text-slate-900">{selectedAuditLog.actorRole}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
                <span className="text-slate-500">Target Entity:</span>
                <span className="font-bold text-slate-900">{selectedAuditLog.targetEntity}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="font-bold text-slate-900">{new Date(selectedAuditLog.createdAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] font-mono text-2xs space-y-1">
              <div className="text-[#64748B] font-bold uppercase text-[10px]">Deterministic Cryptographic Hash</div>
              <div className="text-indigo-700 font-semibold break-all">{selectedAuditLog.checksum || 'sha256:d82e41a9c02d74f8b91a23c56e01d84f29a73c18'}</div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
