import React, { useState } from 'react';
import type {
  CivicTaskDescriptor,
  CivicTaskField,
  CivicTaskDeclaration,
  CivicTaskPrerequisite,
  CivicTaskGroundTruthRecord,
  CivicTaskDataDisclosure,
} from '@indra/contracts';
import {
  ShieldCheckIcon,
  AlertCircleIcon,
  CheckIcon,
  CheckCircle2Icon,
  ArrowRightIcon,
  LockIcon,
  FileTextIcon,
  CloseIcon,
  BuildingIcon,
  RefreshIcon,
} from '../icons.js';
import { CustomSelect } from '../common/CustomSelect.js';

interface CivicTaskRendererProps {
  descriptor: CivicTaskDescriptor;
  citizen?: any;
  initialOutcomeData?: any;
  isBlocked?: boolean;
  blockedReason?: string;
  onExecute: (input: Record<string, any>) => Promise<any>;
  onClose: () => void;
  onNavigateToPublicRecord?: () => void;
}

export function CivicTaskRenderer({
  descriptor,
  citizen,
  initialOutcomeData,
  isBlocked = false,
  blockedReason,
  onExecute,
  onClose,
  onNavigateToPublicRecord,
}: CivicTaskRendererProps) {
  // Form input state initialized with default values from fields
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    for (const field of descriptor.fields) {
      if (field.defaultValue !== undefined) {
        initial[field.fieldId] = field.defaultValue;
      }
    }
    return initial;
  });

  // Statutory declarations accepted IDs
  const [acceptedDeclarations, setAcceptedDeclarations] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [outcomeData, setOutcomeData] = useState<any | null>(initialOutcomeData || null);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const toggleDeclaration = (id: string) => {
    setAcceptedDeclarations((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const requiredDeclarations = descriptor.declarations.filter((d: CivicTaskDeclaration) => d.required);
  const allDeclarationsAccepted = requiredDeclarations.every((d: CivicTaskDeclaration) => acceptedDeclarations.includes(d.id));

  const handleExecute = async () => {
    try {
      setErrorMessage(null);

      // Validate required fields
      for (const field of descriptor.fields) {
        if (field.required && (formData[field.fieldId] === undefined || formData[field.fieldId] === '')) {
          setErrorMessage(`Please complete the required field: ${field.label}`);
          return;
        }
      }

      if (descriptor.requiresAuthorization && !allDeclarationsAccepted) {
        setErrorMessage('Please accept all mandatory statutory declarations before authorizing.');
        return;
      }

      setIsSubmitting(true);
      const result = await onExecute(formData);
      setOutcomeData(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Statutory action execution failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const receipt = outcomeData ? descriptor.generateOutcome(formData, outcomeData) : null;

  return (
    <div className="w-full bg-white border border-[#CBD5E1] rounded-2xl shadow-xs overflow-hidden animate-fadeIn">
      {/* 1. CIVIC HEADER & STATUTORY CITATION (Pure Light Civic Theme) */}
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-bold tracking-wider uppercase rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                Official Task Review
              </span>
              <span className="text-xs font-semibold text-[#475569]">
                {descriptor.authority}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              {descriptor.title}
            </h2>
            <p className="text-sm sm:text-base text-[#475569] max-w-3xl leading-relaxed">
              {descriptor.subtitle}
            </p>
          </div>

          <button
            onClick={onClose}
            className="self-start p-2 rounded-xl text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200/60 transition cursor-pointer"
            title="Close Task"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Statutory Act Citation */}
        <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center space-x-2 text-xs text-[#475569]">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-bold text-[#0F172A]">Governing Department & Law:</span>
          <span>{descriptor.statutoryAct}</span>
        </div>
      </div>

      {/* ERROR NOTICE */}
      {errorMessage && (
        <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <AlertCircleIcon className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold uppercase text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VERIFIED OUTCOME / SYNTHETIC DIGITAL RECEIPT (If completed) */}
      {/* ========================================================================= */}
      {receipt ? (
        <div className="p-6 sm:p-8 space-y-6 animate-fadeIn">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#F0FDF4] border-2 border-emerald-500 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200 pb-5">
              <div className="flex items-center space-x-3">
                <CheckCircle2Icon className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    Application Confirmed
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-[#0F172A] mt-1">
                    {receipt.receiptTitle}
                  </h3>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-xs text-[#64748B] font-semibold">Application Reference Number</div>
                <div className="font-mono text-sm font-bold text-[#0F172A] bg-white px-3 py-1 rounded-lg border border-emerald-200 mt-1 inline-block">
                  {receipt.referenceCode}
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
              {receipt.confirmationNotice}
            </p>

            {/* Verified Ledger Updates */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                Official Government Records Updated
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {receipt.verifiedUpdates.map((update: { registry: string; status: string; detail: string }, i: number) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-white border border-[#CBD5E1] space-y-1 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F172A]">{update.registry}</span>
                      <span className="px-2 py-0.5 rounded text-2xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {update.status === 'CONVERGED' ? 'Updated' : update.status}
                      </span>
                    </div>
                    <p className="text-[#64748B] text-2xs leading-relaxed">{update.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B]">
              <div>
                <span>Issuing Authority: </span>
                <strong className="text-[#0F172A]">{receipt.authority}</strong>
              </div>
              <div>
                <span>Timestamp: </span>
                <span className="font-mono">{new Date(receipt.timestamp).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            {onNavigateToPublicRecord && (
              <button
                onClick={onNavigateToPublicRecord}
                className="px-5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#0F172A] hover:bg-[#F8FAFC] transition cursor-pointer"
              >
                View My Records
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#0F172A] hover:bg-black text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 4. CONTINUOUS TASK WORKSPACE (Single-Page Flow) */
        /* ========================================================================= */
        <div className="p-6 sm:p-8 space-y-8 animate-fadeIn">
          
          {/* PREREQUISITE BLOCKED NOTICE (If task is blocked by preceding phase) */}
          {isBlocked && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start space-x-3.5 shadow-2xs">
              <LockIcon className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Complete Previous Steps First
                </h4>
                <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                  {blockedReason ||
                    'This step requires earlier steps in the plan to be completed first. You can review your verified details and what is required below.'}
                </p>
              </div>
            </div>
          )}

          {/* SECTION A: VERIFIED GROUND TRUTH (Authoritative Records) */}
          <section className="space-y-3">
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                Your Verified Government Records
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {descriptor.groundTruth.map((record: CivicTaskGroundTruthRecord, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs flex flex-col justify-between space-y-1.5"
                >
                  <div className="flex items-center justify-between text-2xs text-[#64748B]">
                    <span className="font-semibold uppercase tracking-wider">{record.label}</span>
                    {record.isVerified && (
                      <span className="inline-flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-2xs font-bold border border-emerald-200">
                        <CheckIcon className="w-3 h-3 mr-1" />
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-sm text-[#0F172A] break-words">
                    {record.value}
                  </div>
                  <div className="text-2xs text-[#64748B] pt-1">
                    Source: {record.sourceAuthority}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION B: DISCREPANCY RESOLUTION (If cross-registry discrepancy detected) */}
          {descriptor.discrepancy && descriptor.discrepancy.detected && (
            <section className="p-5 rounded-xl bg-amber-50/80 border-2 border-amber-300 space-y-3">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                <AlertCircleIcon className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Attention: Name or Details Mismatch Found</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                {descriptor.discrepancy.resolutionGuidance}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-3.5 bg-white rounded-lg border border-amber-200 shadow-2xs">
                  <span className="text-2xs text-[#64748B] block font-semibold">Existing Value:</span>
                  <span className="font-bold text-[#0F172A]">{descriptor.discrepancy.actualValue}</span>
                </div>
                <div className="p-3.5 bg-white rounded-lg border border-amber-200 shadow-2xs">
                  <span className="text-2xs text-[#64748B] block font-semibold">Verified Official Record:</span>
                  <span className="font-bold text-emerald-800">{descriptor.discrepancy.expectedValue}</span>
                </div>
              </div>
            </section>
          )}

          {/* SECTION C: EDITABLE ACTION INFORMATION */}
          {descriptor.fields.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center space-x-2">
                <FileTextIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                  Details for This Application
                </h3>
              </div>

              <div className="space-y-4">
                {descriptor.fields.map((field: CivicTaskField) => (
                  <div key={field.fieldId} className="space-y-1.5">
                    <label className="text-xs font-bold text-[#334155] flex items-center justify-between">
                      <span>{field.label}</span>
                      {field.required && (
                        <span className="text-rose-600 text-2xs font-semibold">Required</span>
                      )}
                    </label>

                    {field.type === 'TEXT' && (
                      <input
                        type="text"
                        value={formData[field.fieldId] ?? ''}
                        placeholder={field.placeholder || ''}
                        disabled={isBlocked}
                        onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-white disabled:bg-slate-50 disabled:text-slate-500 shadow-2xs transition"
                      />
                    )}

                    {field.type === 'SELECT' && field.options && (
                      <CustomSelect
                        options={field.options}
                        value={String(formData[field.fieldId] ?? field.options[0]?.value ?? '')}
                        onChange={(val) => handleFieldChange(field.fieldId, val)}
                        disabled={isBlocked}
                        placeholder="Choose option..."
                      />
                    )}

                    {field.type === 'TEXTAREA' && (
                      <textarea
                        rows={3}
                        value={formData[field.fieldId] ?? ''}
                        placeholder={field.placeholder || ''}
                        disabled={isBlocked}
                        onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-xs sm:text-sm text-[#0F172A] focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 bg-white disabled:bg-slate-50 disabled:text-slate-500 shadow-2xs transition"
                      />
                    )}

                    {field.helperText && (
                      <p className="text-2xs text-[#64748B]">{field.helperText}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION D: PREREQUISITES VERIFICATION CHECKLIST */}
          {descriptor.prerequisites.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                Requirements & Eligibility Check
              </h3>
              <div className="space-y-2.5">
                {descriptor.prerequisites.map((prereq: CivicTaskPrerequisite, idx: number) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white border border-[#CBD5E1] shadow-2xs flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-[#0F172A]">{prereq.title}</div>
                      {prereq.details && (
                        <div className="text-2xs text-[#64748B]">{prereq.details}</div>
                      )}
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-2xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {prereq.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION E: CONSEQUENCES & STATUTORY NOTICE */}
          <section
            className={`p-5 rounded-xl border ${
              descriptor.consequences.severity === 'CRITICAL' || descriptor.consequences.severity === 'HIGH'
                ? 'bg-amber-50 border-amber-300 text-amber-950'
                : 'bg-slate-50 border-slate-300 text-[#0F172A]'
            }`}
          >
            <div className="flex items-center space-x-2 mb-1.5">
              <AlertCircleIcon className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <h4 className="font-bold text-sm">
                Notice · {descriptor.consequences.isIrreversible ? 'Permanent Record (Cannot be undone)' : 'Can be updated later'}
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-[#334155] leading-relaxed">
              {descriptor.consequences.warning}
            </p>
            {descriptor.consequences.downstreamUpdates && descriptor.consequences.downstreamUpdates.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200/80 text-xs flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#0F172A]">Official Records That Will Be Updated:</span>
                {descriptor.consequences.downstreamUpdates.map((upd: string, i: number) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md bg-white text-slate-800 border border-slate-200 font-semibold text-2xs shadow-2xs"
                  >
                    {upd}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* SECTION F: STATUTORY DECLARATIONS & CONSENT */}
          {descriptor.declarations.length > 0 && (
            <section className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                Review & Agree to Declarations
              </h4>
              <div className="space-y-3">
                {descriptor.declarations.map((decl: CivicTaskDeclaration) => {
                  const isAccepted = acceptedDeclarations.includes(decl.id);
                  return (
                    <label
                      key={decl.id}
                      onClick={() => !isBlocked && toggleDeclaration(decl.id)}
                      className={`flex items-start space-x-3.5 p-4 rounded-xl border transition cursor-pointer ${
                        isBlocked
                          ? 'bg-slate-50 border-[#E2E8F0] cursor-not-allowed opacity-60'
                          : isAccepted
                          ? 'bg-emerald-50/60 border-emerald-400 shadow-2xs'
                          : 'bg-white border-[#CBD5E1] hover:border-[#94A3B8] shadow-2xs'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAccepted}
                        disabled={isBlocked}
                        onChange={() => {}}
                        className="w-4 h-4 mt-1 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <p className="text-xs sm:text-sm font-medium text-[#0F172A] leading-relaxed">
                          {decl.text}
                        </p>
                        {decl.statutoryReference && (
                          <p className="text-2xs font-semibold text-emerald-800">
                            Official Rule: {decl.statutoryReference}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECTION G: DPDP DISCLOSURES & FEE ASSESSMENT */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Disclosures */}
            <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                How Your Data Is Used
              </h4>
              {descriptor.disclosures.map((disc: CivicTaskDataDisclosure, idx: number) => (
                <div
                  key={idx}
                  className="text-xs text-[#334155] border-b border-slate-200/60 pb-2.5 last:border-b-0 last:pb-0"
                >
                  <div className="font-bold text-[#0F172A]">{disc.recipient}</div>
                  <div className="text-[#64748B] mt-0.5">{disc.purpose}</div>
                  <div className="text-2xs text-slate-500 mt-0.5">Retention: {disc.retention}</div>
                </div>
              ))}
            </div>

            {/* Fee Assessment */}
            <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] shadow-2xs space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569]">
                Government Fees & Charges
              </h4>
              <div className="flex justify-between text-xs text-[#334155]">
                <span>Official Government Fee:</span>
                <span className="font-bold">
                  {descriptor.statutoryFeesInr === 0
                    ? '₹0 (Free Public Service)'
                    : `₹${descriptor.statutoryFeesInr.toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[#334155]">
                <span>INDRA Service Fee:</span>
                <span className="font-bold text-emerald-700">₹0 (Free Public Service)</span>
              </div>
              <div className="pt-2.5 border-t border-[#CBD5E1] flex justify-between text-sm font-black text-[#0F172A]">
                <span>Total Payable:</span>
                <span>
                  {descriptor.statutoryFeesInr === 0
                    ? '₹0'
                    : `₹${descriptor.statutoryFeesInr.toLocaleString('en-IN')}`}
                </span>
              </div>
            </div>
          </section>

          {/* IN-FLIGHT EXECUTION STATE */}
          {isSubmitting && (
            <div className="p-6 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] text-center space-y-2 animate-fadeIn">
              <div className="inline-block animate-spin w-6 h-6 border-2 border-[#0F172A] border-t-transparent rounded-full"></div>
              <div className="text-sm font-bold text-[#0F172A]">
                Submitting Application...
              </div>
              <p className="text-xs text-[#64748B]">
                Sending your details securely to the department portal and recording verified proof.
              </p>
            </div>
          )}

          {/* ACTION BUTTON BAR */}
          <div className="pt-6 border-t border-[#E2E8F0] flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-[#CBD5E1] text-xs font-bold text-[#475569] hover:bg-[#F8FAFC] transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={handleExecute}
              disabled={isSubmitting || isBlocked}
              className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>
                {isSubmitting
                  ? 'Submitting...'
                  : isBlocked
                  ? 'Waiting on Previous Step'
                  : descriptor.actionVerb}
              </span>
              <ArrowRightIcon className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
