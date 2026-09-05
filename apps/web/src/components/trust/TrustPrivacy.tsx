import React from 'react';
import { ShieldCheckIcon, LockIcon, CheckIcon } from '../icons.js';
import { formatHumanLabel } from '../../utils/civicFormatters.js';

interface TrustPrivacyProps {
  auditLogs: any[];
  consents: any[];
}

export function TrustPrivacy({ auditLogs, consents }: TrustPrivacyProps) {
  return (
    <div className="w-full space-y-8 animate-fadeIn pb-12">
      <div className="border-b border-[#E2E8F0] pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">Trust, Privacy & Provenance</h1>
        <p className="text-sm text-[#64748B] mt-1.5 leading-relaxed">
          Every capability invocation, statutory consent grant, and administrative change is durably recorded in an immutable ledger.
        </p>
      </div>

      {/* STATUTORY CONSENT LEDGER */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
            Active Statutory Consents
          </h2>
          <span className="text-sm font-semibold text-[#64748B]">{consents.length} Grants</span>
        </div>

        <div className="space-y-3">
          {consents.length > 0 ? (
            consents.map((c) => (
              <div key={c.id} className="p-5 rounded-2xl bg-white border border-[#CBD5E1] shadow-xs text-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0F172A] text-base">{c.purpose}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center">
                    <CheckIcon className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Authorized
                  </span>
                </div>
                <div className="text-[#475569] leading-relaxed">{c.actionDescription}</div>
                <div className="text-xs text-[#64748B] flex flex-col sm:flex-row sm:justify-between pt-2 border-t border-[#F8FAFC] gap-1">
                  <span>Scope: {Array.isArray(c.dataElementsScope) ? c.dataElementsScope.map((s: string) => formatHumanLabel(s)).join(', ') : 'Ground Truth'}</span>
                  <span>Granted: {new Date(c.grantedAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-[#94A3B8] italic bg-white rounded-2xl border border-[#CBD5E1]">
              No active third-party consents granted.
            </div>
          )}
        </div>
      </section>

      {/* AUDIT LOGS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#475569]">
            Immutable Audit Trail
          </h2>
          <span className="text-sm font-semibold text-[#64748B]">{auditLogs.length} Events</span>
        </div>

        <div className="bg-white border border-[#CBD5E1] rounded-2xl divide-y divide-[#F1F5F9] shadow-xs overflow-hidden">
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between text-sm hover:bg-[#F8FAFC] transition">
                <div className="space-y-1">
                  <div className="font-bold text-[#0F172A] text-xs">{formatHumanLabel(log.actionType)}</div>
                  <div className="text-xs text-[#64748B]">{log.actorRole} · Entity: {formatHumanLabel(log.targetEntity || 'System')}</div>
                </div>
                <div className="text-right text-xs text-[#94A3B8]">
                  {new Date(log.createdAt).toLocaleTimeString()}
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
    </div>
  );
}
