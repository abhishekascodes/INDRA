import React, { useState, useEffect } from 'react';
import { InboxIcon, AlertCircleIcon, ArrowRightIcon, CheckIcon, ShieldCheckIcon } from '../icons.js';
import { fetchActionCenterFeed, fetchConsentArtifacts, revokeConsentArtifact } from '../../api.js';
import {
  formatHumanLabel,
  formatStateLabel,
  formatProviderName,
  formatPurposeName,
} from '../../utils/civicFormatters.js';

interface GovernmentInboxProps {
  inboxItems: any[];
  onLaunchWorkflow: (workflowCode: string) => void;
}

export function GovernmentInbox({ inboxItems, onLaunchWorkflow }: GovernmentInboxProps) {
  const [activeTab, setActiveTab] = useState<'action-center' | 'consents' | 'notices'>('action-center');
  const [actionCenterData, setActionCenterData] = useState<{ items: any[]; summary: any } | null>(null);
  const [consentArtifacts, setConsentArtifacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadActionCenter = async () => {
    try {
      setLoading(true);
      const [feed, consents] = await Promise.all([
        fetchActionCenterFeed(),
        fetchConsentArtifacts(),
      ]);
      setActionCenterData(feed);
      setConsentArtifacts(consents);
    } catch (err) {
      console.error('Failed to load Action Center data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActionCenter();
  }, []);

  const handleRevoke = async (id: string) => {
    try {
      setRevokingId(id);
      await revokeConsentArtifact(id);
      await loadActionCenter();
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke consent artifact');
    } finally {
      setRevokingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTION_REQUIRED':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'AWAITING_AUTHORIZATION':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'READY_TO_SUBMIT':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'APPROVED':
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'BLOCKED':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      case 'REJECTED':
      case 'FAILED':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="w-full space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E8F0] pb-4 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">Action Center & Notices</h1>
          <p className="text-sm text-[#64748B] mt-1.5 leading-relaxed">
            Review pending tasks, active permissions, and official government updates in one place.
          </p>
        </div>
        {actionCenterData && (
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              {actionCenterData.summary.criticalCount} Critical
            </span>
            <span className="text-xs font-bold text-[#0F172A] bg-slate-100 px-3 py-1 rounded-full">
              {actionCenterData.summary.totalActionable} Total Items
            </span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-[#E2E8F0]">
        <button
          onClick={() => setActiveTab('action-center')}
          className={`px-5 py-2.5 text-sm font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'action-center'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          To Do & Approvals ({actionCenterData?.items.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('consents')}
          className={`px-5 py-2.5 text-sm font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'consents'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Data Permissions ({consentArtifacts.length})
        </button>
        <button
          onClick={() => setActiveTab('notices')}
          className={`px-5 py-2.5 text-sm font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'notices'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          Official Notices ({inboxItems.length})
        </button>
      </div>

      {/* Tab 1: Action Center Feed */}
      {activeTab === 'action-center' && (
        <div className="space-y-4">
          {actionCenterData && actionCenterData.items.length > 0 ? (
            actionCenterData.items.map((item) => (
              <div
                key={item.id}
                className={`p-6 rounded-2xl border transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  item.urgency === 'CRITICAL'
                    ? 'bg-rose-50/30 border-rose-200'
                    : item.urgency === 'HIGH'
                    ? 'bg-amber-50/30 border-amber-200'
                    : 'bg-white border-[#CBD5E1] hover:border-[#94A3B8]'
                }`}
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${getStatusBadge(
                        item.canonicalStatus
                      )}`}
                    >
                      {formatStateLabel(item.canonicalStatus)}
                    </span>
                    {item.subtitle && (
                      <span className="text-xs font-semibold text-[#64748B]">
                        {formatHumanLabel(item.subtitle)}
                      </span>
                    )}
                    {item.dueDate && (
                      <span className="text-xs text-[#DC2626] font-bold">
                        Due: {item.dueDate.slice(0, 10)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">{item.title}</h3>
                  <p className="text-sm text-[#475569] leading-relaxed">{item.description}</p>
                </div>

                {item.actionPayload?.recommendedWorkflow && (
                  <button
                    onClick={() => onLaunchWorkflow(item.actionPayload.recommendedWorkflow)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-xs flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer shrink-0"
                  >
                    <span>Execute Action</span>
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-sm text-[#94A3B8] italic bg-white rounded-2xl border border-[#CBD5E1]">
              {loading ? 'Checking for pending tasks and approvals...' : 'All caught up! No tasks or approvals pending.'}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Sovereign Consent Artifacts (DPDP Act 2023) */}
      {activeTab === 'consents' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
            <span className="font-bold">Your Privacy & Data Permissions:</span> Every data permission is granted only with your authorization, is strictly time-limited, and can be revoked at any time.
          </div>

          {consentArtifacts.length > 0 ? (
            consentArtifacts.map((c) => (
              <div
                key={c.id}
                className="p-6 rounded-2xl border border-[#CBD5E1] bg-white hover:border-[#94A3B8] transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300">
                      {formatHumanLabel(c.ecosystem)}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-rose-100 text-rose-900 border-rose-300'
                      }`}
                    >
                      {formatStateLabel(c.status)}
                    </span>
                    <span className="text-xs font-medium text-[#64748B]">
                      Expires: {new Date(c.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">
                    Purpose: {formatPurposeName(c.purposeCode)}
                  </h3>
                  <p className="text-sm text-[#475569]">
                    Provider: <span className="font-semibold text-[#0F172A]">{formatProviderName(c.dataProviderId)}</span> → Consumer: <span className="font-semibold text-[#0F172A]">{formatProviderName(c.dataConsumerId)}</span>
                  </p>
                  <p className="text-xs text-[#94A3B8] truncate">
                    Cryptographic Digest: {c.signatureDigest ? c.signatureDigest.slice(0, 16) + '...' : 'Verified Electronic Consent'}
                  </p>
                </div>

                {c.status === 'ACTIVE' && (
                  <button
                    onClick={() => handleRevoke(c.id)}
                    disabled={revokingId === c.id}
                    className="px-4 py-2 border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    {revokingId === c.id ? 'Revoking...' : 'Revoke Consent'}
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-sm text-[#94A3B8] italic bg-white rounded-2xl border border-[#CBD5E1]">
              No electronic consent artifacts currently recorded.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Department Notices */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          {inboxItems.length > 0 ? (
            inboxItems.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-2xl border border-[#CBD5E1] bg-white hover:border-[#94A3B8] transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                      {formatHumanLabel(item.domain)}
                    </span>
                    <span className="text-xs text-[#64748B]">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A]">{item.title}</h3>
                  <p className="text-sm text-[#475569] leading-relaxed">{item.body}</p>
                </div>

                {item.actionWorkflowCode && (
                  <button
                    onClick={() => onLaunchWorkflow(item.actionWorkflowCode)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-xs flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer shrink-0"
                  >
                    <span>{item.actionLabel || 'Take Action'}</span>
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-sm text-[#94A3B8] italic bg-white rounded-2xl border border-[#CBD5E1]">
              Your inbox is completely clear. No outstanding statutory notices.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
