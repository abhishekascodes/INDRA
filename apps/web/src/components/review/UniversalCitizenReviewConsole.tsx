import React, { useState, useEffect } from 'react';
import type {
  ReviewSessionContract,
  DataProvenanceField,
  StatutoryDeclaration,
  WorkflowRunSummary,
} from '@indra/contracts';
import {
  ShieldCheckIcon,
  LockIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  CheckIcon,
  BuildingIcon,
  ClockIcon,
  ArrowRightIcon,
  EditIcon,
  RefreshIcon,
  CloseIcon,
  FileTextIcon,
} from '../icons.js';
import { formatHumanLabel, formatStateLabel } from '../../utils/civicFormatters.js';
import {
  fetchReviewSession,
  editReviewField,
  authorizeReviewSession,
  executeAuthorizedStep,
} from '../../api.js';

interface UniversalCitizenReviewConsoleProps {
  workflowRunId: string;
  citizen: any;
  onWorkflowAdvanced: (updated: WorkflowRunSummary) => void;
  onCancel: () => void;
}

export function UniversalCitizenReviewConsole({
  workflowRunId,
  citizen,
  onWorkflowAdvanced,
  onCancel,
}: UniversalCitizenReviewConsoleProps) {
  const [session, setSession] = useState<ReviewSessionContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingFieldKey, setEditingFieldKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [acceptedDeclarations, setAcceptedDeclarations] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSession = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const data = await fetchReviewSession(workflowRunId);
      setSession(data);
      // Pre-populate accepted declarations if already saved
      const preAccepted = (data.statutoryDeclarations || [])
        .filter((d) => d.accepted)
        .map((d) => d.id);
      setAcceptedDeclarations(preAccepted);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize citizen review session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [workflowRunId]);

  const handleStartEdit = (field: DataProvenanceField) => {
    setEditingFieldKey(field.fieldKey);
    setEditValue(String(field.value ?? ''));
  };

  const handleSaveEdit = async () => {
    if (!session || !editingFieldKey) return;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const updated = await editReviewField(workflowRunId, session.id, editingFieldKey, editValue);
      setSession(updated);
      setEditingFieldKey(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update field');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDeclaration = (id: string) => {
    setAcceptedDeclarations((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const requiredDeclarations = (session?.statutoryDeclarations || []).filter((d) => d.required);
  const allRequiredAccepted = requiredDeclarations.every((d) => acceptedDeclarations.includes(d.id));

  const handleAuthorizeAndExecute = async () => {
    if (!session) return;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // 1. Authorize: Server mints signed AuthorizationToken bound to payloadHash
      const authResult = await authorizeReviewSession(
        workflowRunId,
        session.id,
        session.payloadHash,
        acceptedDeclarations
      );

      // 2. Execute: Server verifies payloadHash integrity and consumes token
      const advanced = await executeAuthorizedStep(workflowRunId, authResult.authorizationToken);
      onWorkflowAdvanced(advanced);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authorization and execution failed');
      // If stale review state, reload session automatically
      if (err.message?.includes('STALE_REVIEW_STATE')) {
        await loadSession();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 text-center shadow-xs space-y-3">
        <RefreshIcon className="w-6 h-6 text-[#0F172A] animate-spin mx-auto" />
        <p className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
          Assembling Statutory Review Session...
        </p>
        <p className="text-xs text-[#64748B]">
          Resolving verified ground truth, calculating disclosures, and synthesizing cryptographic payload digest.
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 shadow-xs space-y-4 text-center">
        <AlertCircleIcon className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-base font-bold text-[#0F172A]">Unable to Load Review Session</h3>
        <p className="text-xs text-[#475569] max-w-md mx-auto">{errorMessage || 'Review session data unavailable.'}</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={loadSession}
            className="px-4 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-xl hover:bg-[#1E293B] cursor-pointer"
          >
            Retry Review Inspection
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 text-slate-800 text-xs font-bold rounded-xl hover:bg-slate-200 cursor-pointer border border-slate-300"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isIrreversible = session.reviewMode === 'IRREVERSIBLE';
  const isFederated = session.reviewMode === 'FEDERATED_CONSENT';

  return (
    <div className="w-full bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden space-y-6 pb-6 animate-fadeIn">
      
      {/* 1. TOP HEADER & AUTHORITY BANNER */}
      <div className="p-6 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-3 py-1 text-xs font-bold tracking-wider uppercase rounded-full border ${
                  isIrreversible
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : isFederated
                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                    : 'bg-slate-100 text-slate-800 border-slate-200'
                }`}
              >
                Review Mode: {formatHumanLabel(session.reviewMode)}
              </span>
              <span className="px-3 py-1 text-xs font-semibold tracking-wide rounded-full border bg-slate-100 text-slate-800 border-slate-200">
                Review Version: v{session.version || 1}
              </span>
              <span className="px-3 py-1 text-xs font-semibold tracking-wide rounded-full border bg-blue-50 text-blue-800 border-blue-200">
                Synthetic Infrastructure
              </span>
              <span className="text-xs font-medium text-[#64748B] flex items-center">
                <ClockIcon className="w-3.5 h-3.5 mr-1 text-[#64748B]" />
                Session Active (30m TTL)
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] tracking-tight">
              {session.operationPreview.title}
            </h2>

            <div className="flex items-center space-x-2 text-sm text-[#475569] font-medium pt-0.5">
              <BuildingIcon className="w-4 h-4 text-[#64748B] flex-shrink-0" />
              <span>Designated Authority: <strong>{session.operationPreview.authority}</strong></span>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1 bg-white p-3 rounded-xl border border-[#E2E8F0] sm:border-0 sm:bg-transparent sm:p-0">
            <div className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">
              Authorization Checksum
            </div>
            <div className="text-xs font-semibold text-[#0F172A] bg-slate-100 sm:bg-white px-2.5 py-1 rounded-lg border border-slate-200 sm:border-slate-300 inline-block">
              SHA256:{session.payloadHash.slice(0, 8)}...{session.payloadHash.slice(-8)}
            </div>
          </div>
        </div>

        <p className="text-sm text-[#334155] mt-3 leading-relaxed">
          {session.operationPreview.summary}
        </p>
      </div>

      <div className="px-6 space-y-6">

        {/* 2. DATA PROVENANCE & DISCLOSURE MATRIX */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileTextIcon className="w-4 h-4 text-[#0F172A]" />
              <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                1. Data Provenance & Operational Inputs
              </h3>
            </div>
            <span className="text-xs text-[#64748B]">
              Verified against official registries & citizen inputs
            </span>
          </div>

          <div className="border border-[#CBD5E1] rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#CBD5E1] text-[#475569] text-xs font-bold uppercase tracking-wider">
                  <th className="p-3.5">Data Attribute</th>
                  <th className="p-3.5">Verified Value</th>
                  <th className="p-3.5">Provenance Source</th>
                  <th className="p-3.5">Sensitivity</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {session.dataProvenanceMatrix.map((field) => {
                  const isEditing = editingFieldKey === field.fieldKey;
                  return (
                    <tr key={field.fieldKey} className="hover:bg-[#FAFAFA] transition">
                      <td className="p-3.5 font-bold text-[#0F172A]">{field.label}</td>
                      <td className="p-3.5 text-sm font-medium text-[#334155]">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="px-3 py-1.5 border border-indigo-600 rounded-lg text-sm focus:outline-none bg-white ring-2 ring-indigo-50"
                              autoFocus
                            />
                            <button
                              onClick={handleSaveEdit}
                              disabled={isSubmitting}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 cursor-pointer transition shadow-2xs"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingFieldKey(null)}
                              className="p-1.5 text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                            >
                              <CloseIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-semibold">{String(field.value ?? '')}</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center space-x-1.5 text-[#0F172A] text-xs font-semibold">
                          <CheckIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>{field.sourceLabel}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-bold tracking-wider uppercase border ${
                            field.sensitivity === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : field.sensitivity === 'HIGH'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : field.sensitivity === 'MEDIUM'
                              ? 'bg-sky-50 text-sky-800 border-sky-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {field.sensitivity}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {field.editable && !isEditing ? (
                          <button
                            onClick={() => handleStartEdit(field)}
                            className="text-xs font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center space-x-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition"
                          >
                            <EditIcon className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        ) : !field.editable ? (
                          <span className="text-xs text-[#94A3B8] font-semibold">Authoritative</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. INSTITUTIONAL DISCLOSURES & PRECONDITIONS (2 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Disclosures */}
          <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#FAFAFA] space-y-3">
            <h4 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center space-x-1.5">
              <BuildingIcon className="w-4 h-4 text-[#0F172A]" />
              <span>Institutional Disclosure Notice</span>
            </h4>
            {session.disclosures.map((disc, idx) => (
              <div key={idx} className="text-sm space-y-1 text-[#334155]">
                <div>
                  <span className="text-[#64748B]">Recipient: </span>
                  <strong className="text-[#0F172A]">{disc.recipient}</strong> ({disc.role})
                </div>
                <div>
                  <span className="text-[#64748B]">Data Categories: </span>
                  <span className="text-xs font-semibold text-[#0F172A]">
                    {disc.categories.map((c) => formatHumanLabel(c)).join(', ')}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748B]">Purpose: </span>
                  <span>{disc.purpose}</span>
                </div>
                <div className="text-xs text-[#64748B] pt-1">
                  {disc.retention || 'Statutory retention under Public Records Act, 1993'}
                </div>
              </div>
            ))}
          </div>

          {/* Preconditions */}
          <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#FAFAFA] space-y-3">
            <h4 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
              <span>Statutory Preconditions</span>
            </h4>
            <div className="space-y-2.5">
              {session.preconditions.map((pre) => (
                <div key={pre.code} className="flex items-start space-x-2 text-sm">
                  {pre.passed ? (
                    <CheckIcon className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircleIcon className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <span className="font-bold text-[#0F172A]">{pre.label}</span>
                    {pre.details && (
                      <p className="text-xs text-[#64748B] mt-0.5">{pre.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. CONSEQUENCES & IRREVERSIBILITY WARNING */}
        <div
          className={`p-5 rounded-xl border space-y-2.5 ${
            isIrreversible
              ? 'bg-amber-50/80 border-amber-300 text-amber-950'
              : 'bg-sky-50/80 border-sky-200 text-sky-950'
          }`}
        >
          <div className="flex items-center space-x-2">
            {isIrreversible ? (
              <AlertTriangleIcon className="w-5 h-5 text-amber-700 flex-shrink-0" />
            ) : (
              <ShieldCheckIcon className="w-5 h-5 text-sky-700 flex-shrink-0" />
            )}
            <h4 className="text-sm font-bold uppercase tracking-wider">
              {isIrreversible ? 'Statutory Warning: Irreversible Action' : 'Operational Consequence Preview'}
            </h4>
          </div>

          <p className="text-sm leading-relaxed font-medium">
            {session.consequences.warning}
          </p>

          <div className="pt-1">
            <div className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Expected Downstream Effects:</div>
            <ul className="list-disc list-inside text-sm space-y-1 pt-1 text-[#334155]">
              {session.consequences.downstreamUpdates.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* 5. STATUTORY FEES & OBLIGATIONS */}
        {session.feeBreakdown && session.feeBreakdown.totalInr > 0 && (
          <div className="p-4 rounded-xl border border-[#CBD5E1] bg-white flex items-center justify-between text-sm">
            <div>
              <div className="font-bold text-[#0F172A]">Statutory Government Fee</div>
              <div className="text-xs text-[#64748B] mt-0.5">
                Payable to public treasury via {session.feeBreakdown.paymentMethod || 'Bharat BillPay'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-[#0F172A] mono">
                ₹{session.feeBreakdown.totalInr}
              </div>
              <div className="text-xs text-emerald-700 font-semibold">Zero Service Charge</div>
            </div>
          </div>
        )}

        {/* 6. STATUTORY DECLARATIONS & LEGAL ACKNOWLEDGMENTS */}
        <div className="p-5 rounded-xl border-2 border-indigo-600 bg-[#FAFAFA] space-y-3.5">
          <div className="flex items-center space-x-2 text-[#0F172A]">
            <LockIcon className="w-4 h-4 text-indigo-700" />
            <h4 className="text-sm font-black uppercase tracking-wider">
              Mandatory Citizen Legal Declarations
            </h4>
          </div>

          <div className="space-y-2.5">
            {session.statutoryDeclarations.map((decl, idx) => {
              const isChecked = acceptedDeclarations.includes(decl.id);
              return (
                <label
                  key={decl.id}
                  className="flex items-start space-x-3 p-3 rounded-xl bg-white border border-[#CBD5E1] hover:border-indigo-500 transition cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleDeclaration(decl.id)}
                    className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                  <div className="text-sm text-[#0F172A] leading-relaxed">
                    <span className="font-bold text-[#475569] mr-1">Declaration {idx + 1}:</span>
                    <span>{decl.text}</span>
                    {decl.required && (
                      <span className="ml-1.5 text-rose-600 font-bold text-xs uppercase">
                        (Required)
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* 7. ERROR MESSAGE DISPLAY */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm font-semibold flex items-center space-x-2 animate-fadeIn">
            <AlertCircleIcon className="w-4 h-4 text-rose-700 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 8. AUTHORIZATION & SUBMISSION ACTION BAR */}
        <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E2E8F0]">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-sm text-[#64748B] hover:text-[#0F172A] font-bold cursor-pointer py-2"
          >
            ← Cancel Review & Return
          </button>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={handleAuthorizeAndExecute}
              disabled={!allRequiredAccepted || isSubmitting}
              className={`w-full sm:w-auto px-7 py-3.5 text-sm font-bold rounded-xl transition shadow-xs flex items-center justify-center space-x-2 cursor-pointer ${
                allRequiredAccepted && !isSubmitting
                  ? isIrreversible
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshIcon className="w-4 h-4 animate-spin text-white" />
                  <span>Submitting & Executing...</span>
                </>
              ) : (
                <>
                  <span>
                    {isIrreversible
                      ? 'Authorize & Submit Irreversible Action'
                      : 'Authorize Statutory Action'}
                  </span>
                  <ArrowRightIcon className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
