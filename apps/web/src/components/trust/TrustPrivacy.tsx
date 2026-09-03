import React from 'react';
import { ShieldCheckIcon, LockIcon, CheckIcon } from '../icons.js';

interface TrustPrivacyProps {
  auditLogs: any[];
  consents: any[];
}

export function TrustPrivacy({ auditLogs, consents }: TrustPrivacyProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      <div className="border-b border-[#E2E8F0] pb-4">
        <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Trust, Privacy & Provenance</h1>
        <p className="text-xs text-[#64748B] mt-1">
          Every capability invocation, statutory consent grant, and administrative change is durably recorded in an immutable ledger.
        </p>
      </div>

      {/* STATUTORY CONSENT LEDGER */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
            Active Statutory Consents
          </h2>
          <span className="text-xs font-bold text-[#64748B]">{consents.length} Grants</span>
        </div>

        <div className="space-y-3">
          {consents.length > 0 ? (
            consents.map((c) => (
              <div key={c.id} className="p-4 rounded-xl bg-white border border-[#E2E8F0] shadow-xs text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0F172A]">{c.purpose}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center">
                    <CheckIcon className="w-3 h-3 mr-1 text-emerald-600" />
                    Authorized
                  </span>
                </div>
                <div className="text-[#475569]">{c.actionDescription}</div>
                <div className="text-[11px] text-[#64748B] mono flex justify-between pt-1 border-t border-[#F8FAFC]">
                  <span>Scope: {Array.isArray(c.dataElementsScope) ? c.dataElementsScope.join(', ') : 'Ground Truth'}</span>
                  <span>Granted: {new Date(c.grantedAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-[#94A3B8] italic bg-white rounded-xl border border-[#E2E8F0]">
              No active third-party consents granted.
            </div>
          )}
        </div>
      </section>

      {/* AUDIT LOGS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
            Immutable Audit Trail
          </h2>
          <span className="text-xs font-bold text-[#64748B]">{auditLogs.length} Events</span>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-2xl divide-y divide-[#F1F5F9] shadow-xs overflow-hidden">
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-[#F8FAFC]">
                <div className="space-y-0.5">
                  <div className="font-bold text-[#0F172A] mono text-[11px]">{log.actionType}</div>
                  <div className="text-[11px] text-[#64748B]">{log.actorRole} · Entity: {log.targetEntity || 'SYSTEM'}</div>
                </div>
                <div className="text-right text-[11px] text-[#94A3B8] mono">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-[#94A3B8] italic">
              No audit logs recorded yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
