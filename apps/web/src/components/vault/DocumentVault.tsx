import React from 'react';
import { LockIcon, ShieldCheckIcon, CheckIcon, AlertCircleIcon } from '../icons.js';

interface DocumentVaultProps {
  documents: any[];
  onLaunchWorkflow: (workflowCode: string) => void;
}

export function DocumentVault({ documents, onLaunchWorkflow }: DocumentVaultProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Verifiable Document Vault</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Authoritative, cryptographically verified public identity records and credentials.
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
          <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
          <span>Legally Authoritative</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AADHAAR */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              NATIONAL IDENTITY
            </span>
            <span className="text-xs font-bold text-emerald-700 flex items-center">
              <CheckIcon className="w-3 h-3 mr-1 text-emerald-600" />
              Verified UIDAI
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Aadhaar (Digital Card)</h3>
            <p className="text-xs text-[#64748B] mono mt-0.5">XXXX-XXXX-9012</p>
          </div>
          <div className="pt-2 border-t border-[#F1F5F9] text-xs text-[#475569] space-y-1">
            <div>Name: Priya Sharma</div>
            <div>DOB: 1990-08-14 · Female</div>
            <div>Address: Indiranagar, Bengaluru, KA - 560038</div>
          </div>
        </div>

        {/* PAN */}
        <div className="p-5 rounded-2xl bg-white border-2 border-amber-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              TAX & CORPORATE
            </span>
            <span className="text-xs font-bold text-amber-700">
              ⚠️ Discrepancy Flag
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Permanent Account Number (PAN)</h3>
            <p className="text-xs text-[#64748B] mono mt-0.5">ABCPS****F</p>
          </div>
          <div className="pt-2 border-t border-[#F1F5F9] text-xs text-[#475569] space-y-1">
            <div>Holder Name: Priya S. (Mismatch with Aadhaar)</div>
            <div>Jurisdiction: Ward 2(1), Bengaluru</div>
            <button
              onClick={() => onLaunchWorkflow('RESOLVE_NAME_MISMATCH')}
              className="mt-2 text-xs font-bold text-[#0F172A] hover:underline flex items-center cursor-pointer"
            >
              <span>Harmonize PAN Name with Aadhaar →</span>
            </button>
          </div>
        </div>

        {/* DRIVING LICENCE */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              TRANSPORT
            </span>
            <span className="text-xs font-bold text-emerald-700 flex items-center">
              <CheckIcon className="w-3 h-3 mr-1 text-emerald-600" />
              Valid until 2038
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Driving Licence (DL)</h3>
            <p className="text-xs text-[#64748B] mono mt-0.5">KA-01-2018-******</p>
          </div>
          <div className="pt-2 border-t border-[#F1F5F9] text-xs text-[#475569] space-y-1">
            <div>RTO: Bengaluru Central (KA-01)</div>
            <div>Vehicle Class: LMV / MCWG</div>
          </div>
        </div>

        {/* EPFO UAN */}
        <div className="p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              PROVIDENT FUND & SOCIAL SECURITY
            </span>
            <span className="text-xs font-bold text-sky-700">
              Active Member
            </span>
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">Universal Account Number (UAN)</h3>
            <p className="text-xs text-[#64748B] mono mt-0.5">1014****1844</p>
          </div>
          <div className="pt-2 border-t border-[#F1F5F9] text-xs text-[#475569] space-y-1">
            <div>Current Employer: InnoTech Solutions India Pvt Ltd</div>
            <div>Linked Member IDs: 2 Accounts</div>
          </div>
        </div>
      </div>
    </div>
  );
}
