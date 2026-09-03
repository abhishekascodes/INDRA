import React from 'react';
import { InboxIcon, AlertCircleIcon, ArrowRightIcon, CheckIcon } from '../icons.js';

interface GovernmentInboxProps {
  inboxItems: any[];
  onLaunchWorkflow: (workflowCode: string) => void;
}

export function GovernmentInbox({ inboxItems, onLaunchWorkflow }: GovernmentInboxProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Government Action Inbox</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Authoritative statutory notices, deadlines, and proactive assistance from public ministries.
          </p>
        </div>
        <span className="text-xs font-bold text-[#64748B] bg-slate-100 px-3 py-1 rounded-full">
          {inboxItems.length} Communications
        </span>
      </div>

      <div className="space-y-4">
        {inboxItems.length > 0 ? (
          inboxItems.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                item.severity === 'WARNING' || item.severity === 'ALERT'
                  ? 'bg-amber-50/30 border-amber-200'
                  : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.severity === 'WARNING'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {item.domain}
                  </span>
                  <span className="text-[11px] text-[#64748B]">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#0F172A]">{item.title}</h3>
                <p className="text-xs text-[#475569] leading-relaxed">{item.body}</p>
              </div>

              {item.actionWorkflowCode && (
                <button
                  onClick={() => onLaunchWorkflow(item.actionWorkflowCode)}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
                >
                  <span>{item.actionLabel || 'Take Action'}</span>
                  <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-xs text-[#94A3B8] italic bg-white rounded-2xl border border-[#E2E8F0]">
            Your inbox is completely clear. No outstanding statutory notices or deadlines.
          </div>
        )}
      </div>
    </div>
  );
}
