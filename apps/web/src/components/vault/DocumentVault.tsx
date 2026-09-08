import React, { useState } from 'react';
import { LockIcon, ShieldCheckIcon, CheckIcon, AlertCircleIcon, FileTextIcon } from '../icons.js';
import { formatHumanLabel } from '../../utils/civicFormatters.js';

interface DocumentVaultProps {
  documents: any[];
  onLaunchWorkflow: (workflowCode: string) => void;
}

export function DocumentVault({ documents = [], onLaunchWorkflow }: DocumentVaultProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const getCategoryFromType = (docType: string) => {
    switch (docType) {
      case 'AADHAAR_CARD':
      case 'PASSPORT':
        return 'IDENTITY';
      case 'PAN_CARD':
        return 'TAX';
      case 'DRIVING_LICENCE':
      case 'VEHICLE_RC':
        return 'TRANSPORT';
      case 'EPFO_UAN':
        return 'SOCIAL_SECURITY';
      default:
        return 'OTHER';
    }
  };

  const getCategoryBadge = (docType: string) => {
    switch (docType) {
      case 'AADHAAR_CARD':
        return { label: 'National Identity', color: 'bg-slate-100 text-slate-800 border-slate-200' };
      case 'PAN_CARD':
        return { label: 'Tax & Corporate', color: 'bg-amber-50 text-amber-800 border-amber-200' };
      case 'DRIVING_LICENCE':
        return { label: 'Transport & Licensing', color: 'bg-blue-50 text-blue-800 border-blue-200' };
      case 'EPFO_UAN':
        return { label: 'Social Security (EPFO)', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'PASSPORT':
        return { label: 'Passport & Travel', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
      default:
        return { label: 'Civil Credential', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const filteredDocs = selectedCategory === 'ALL'
    ? documents
    : documents.filter((d) => getCategoryFromType(d.documentType) === selectedCategory);

  return (
    <div className="w-full space-y-8 animate-fadeIn pb-16 pt-2">
      {/* Vault Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E8F0] pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
              Your Secure Vault
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Official Digital Documents · Synthetic Digital Receipts
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
            Saved IDs & Documents
          </h1>
          <p className="text-sm sm:text-base text-[#475569] mt-1.5 leading-relaxed max-w-3xl">
            Official identity cards, licenses, and certificates verified directly from government databases.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl shrink-0 shadow-2xs">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
          <span>100% Verified</span>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          { id: 'ALL', label: 'All Documents' },
          { id: 'IDENTITY', label: 'National Identity' },
          { id: 'TAX', label: 'Tax & Revenue' },
          { id: 'TRANSPORT', label: 'Transport' },
          { id: 'SOCIAL_SECURITY', label: 'Social Security' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl border transition cursor-pointer shrink-0 ${
              selectedCategory === cat.id
                ? 'bg-[#0F172A] border-[#0F172A] text-white shadow-xs'
                : 'bg-white border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#475569] hover:border-[#94A3B8]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Dynamic Documents Grid */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#CBD5E1] rounded-2xl shadow-xs">
          <FileTextIcon className="w-8 h-8 text-[#94A3B8] mx-auto mb-3" />
          <p className="text-base font-bold text-[#0F172A]">No documents found in this category</p>
          <p className="text-sm text-[#64748B] mt-1">Select another filter or check your main dashboard.</p>
        </div>
      ) : (
        <div className="grid items-start grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc: any) => {
            const badge = getCategoryBadge(doc.documentType);
            const isPanMismatch = doc.documentType === 'PAN_CARD' && doc.documentNumber?.includes('ABCPS');

            return (
              <div
                key={doc.id || doc.documentNumber}
                className={`p-6 rounded-2xl bg-white border transition shadow-xs flex flex-col justify-between space-y-4 ${
                  isPanMismatch ? 'border-2 border-amber-300' : 'border-[#CBD5E1] hover:border-[#94A3B8]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-md border ${badge.color}`}>
                      {badge.label}
                    </span>

                    {isPanMismatch ? (
                      <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center">
                        <AlertCircleIcon className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Name Mismatch
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center">
                        <CheckIcon className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Verified
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#0F172A]">{doc.title}</h3>
                    <p className="text-sm font-mono font-semibold text-[#64748B] mt-1">
                      {doc.documentNumber}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-[#F1F5F9] text-sm text-[#475569] space-y-1.5">
                    <div>
                      <span className="text-xs text-[#64748B] font-medium block">Issuing Department:</span>
                      <span className="font-semibold text-[#0F172A]">{doc.issuer}</span>
                    </div>

                    {doc.issueDate && (
                      <div className="flex items-center justify-between text-xs pt-1 text-[#64748B]">
                        <span>Issued: <strong className="text-[#0F172A]">{doc.issueDate}</strong></span>
                        {doc.expiryDate && (
                          <span>Valid Thru: <strong className="text-[#0F172A]">{doc.expiryDate}</strong></span>
                        )}
                      </div>
                    )}

                    {doc.provenanceId && (
                      <div className="text-xs text-[#94A3B8] pt-1 truncate">
                        Registry Ref: {formatHumanLabel(doc.provenanceId)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Specific Action Link (e.g. Mismatch Resolution) */}
                {isPanMismatch && (
                  <div className="pt-3 border-t border-amber-100">
                    <button
                      onClick={() => onLaunchWorkflow('RESOLVE_NAME_MISMATCH')}
                      className="w-full py-2 px-3 text-xs font-bold bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl transition cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <span>Fix Name Mismatch with Aadhaar →</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
