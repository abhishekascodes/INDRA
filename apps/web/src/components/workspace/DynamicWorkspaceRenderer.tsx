import React, { useState } from 'react';
import type { WorkflowRunSummary, UIFieldDefinition } from '@indra/contracts';
import {
  ShieldCheckIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  LockIcon,
} from '../icons.js';
import { resumeWorkflow } from '../../api.js';

interface DynamicWorkspaceRendererProps {
  workflowRun: WorkflowRunSummary;
  citizen: any;
  onWorkflowUpdated: (updated: WorkflowRunSummary) => void;
  onExitWorkspace: () => void;
}

export function DynamicWorkspaceRenderer({
  workflowRun,
  citizen,
  onWorkflowUpdated,
  onExitWorkspace,
}: DynamicWorkspaceRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [consentGranted, setConsentGranted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeUI = workflowRun.activeUI;
  const isAwaitingAuth = workflowRun.state === 'AWAITING_AUTHORIZATION';
  const isAwaitingInput = workflowRun.state === 'AWAITING_USER_INPUT';
  const isCompleted = workflowRun.state === 'COMPLETED';
  const isFailed = workflowRun.state === 'FAILED';

  const currentStepNum = (activeUI?.currentStepIndex ?? 0) + 1;
  const totalStepsNum = activeUI?.totalSteps ?? 3;
  const progressPercent = Math.min(100, Math.round((currentStepNum / totalStepsNum) * 100));

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleResume = async (authorize = false) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const updated = await resumeWorkflow(workflowRun.id, formData, authorize);
      onWorkflowUpdated(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to advance workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      
      {/* 1. TOP NAV & BREADCRUMB */}
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center space-x-2 text-xs text-[#64748B]">
          <button
            onClick={onExitWorkspace}
            className="hover:text-[#0F172A] font-semibold cursor-pointer"
          >
            ← Government Home
          </button>
          <span>/</span>
          <span className="font-bold text-[#0F172A]">
            {activeUI?.workspaceTitle || workflowRun.title || workflowRun.workflowCode}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
            {workflowRun.state.replace(/_/g, ' ')}
          </span>
          <span className="text-xs font-mono text-[#64748B]">
            ID: {workflowRun.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* 2. HEADER BANNER */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                STATUTORY WORKSPACE
              </span>
              <span className="text-xs text-[#64748B] font-medium">
                Step {currentStepNum} of {totalStepsNum}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-2 tracking-tight">
              {activeUI?.workspaceTitle || workflowRun.title || 'Statutory Action in Progress'}
            </h1>
            <p className="text-xs sm:text-sm text-[#475569] mt-1 leading-relaxed">
              {activeUI?.workspaceSubtitle || 'Review verified government ground truth and authorize official submission.'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full sm:w-48 self-center sm:self-start">
            <div className="flex justify-between text-[11px] font-bold text-[#64748B] mb-1">
              <span>Progress</span>
              <span>{isCompleted ? '100%' : `${progressPercent}%`}</span>
            </div>
            <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#0F172A] h-full transition-all duration-300 rounded-full"
                style={{ width: isCompleted ? '100%' : `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. VERIFIED GOVERNMENT GROUND TRUTH INSPECTOR */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xs">
        <button
          onClick={() => setIsInspectorOpen(!isInspectorOpen)}
          className="w-full p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-left hover:bg-[#F1F5F9] transition cursor-pointer"
        >
          <div className="flex items-center space-x-2 text-xs font-bold text-[#0F172A]">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
            <span>Verified Public Ground Truth (Zero Re-typing)</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-[#64748B]">
            <span>{isInspectorOpen ? 'Hide' : 'Inspect'}</span>
            {isInspectorOpen ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
          </div>
        </button>

        {isInspectorOpen && (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {activeUI?.knownInformation && activeUI.knownInformation.length > 0 ? (
              activeUI.knownInformation.map((info, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E2E8F0]">
                  <div className="text-[11px] text-[#64748B] font-medium">{info.label}</div>
                  <div className="font-bold text-[#0F172A] mt-0.5">{info.value}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-1">✓ {info.source}</div>
                </div>
              ))
            ) : (
              <>
                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E2E8F0]">
                  <div className="text-[11px] text-[#64748B] font-medium">Citizen Full Legal Name</div>
                  <div className="font-bold text-[#0F172A] mt-0.5">{citizen?.primaryName || 'Priya Sharma'}</div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-1">✓ Verified via UIDAI Ground Truth</div>
                </div>

                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E2E8F0]">
                  <div className="text-[11px] text-[#64748B] font-medium">Permanent Account Number (PAN)</div>
                  <div className="font-bold text-[#0F172A] mt-0.5 mono">ABCPS****F</div>
                  <div className="text-[10px] text-sky-700 font-semibold mt-1">✓ Income Tax Department</div>
                </div>

                <div className="p-3 rounded-xl bg-[#FAFAFA] border border-[#E2E8F0]">
                  <div className="text-[11px] text-[#64748B] font-medium">Verified Residential Address</div>
                  <div className="font-bold text-[#0F172A] mt-0.5">Indiranagar, Bengaluru, KA - 560038</div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-1">✓ UIDAI Address Registry</div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 4. DYNAMIC STEP CONTROLS (Rendered from DynamicWorkspaceContract) */}
      {isAwaitingInput && activeUI?.requiredFields && activeUI.requiredFields.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
            Required Action Details
          </h3>

          <div className="space-y-3">
            {activeUI.requiredFields.map((field: UIFieldDefinition) => (
              <div key={field.fieldId} className="space-y-1">
                <label className="text-xs font-bold text-[#334155] flex items-center justify-between">
                  <span>{field.label}</span>
                  {field.required && <span className="text-rose-600 text-[10px]">Required</span>}
                </label>

                {field.type === 'TEXT_INPUT' && (
                  <input
                    type="text"
                    defaultValue={field.defaultValue as string}
                    placeholder={(field.props?.placeholder as string) || ''}
                    onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs focus:outline-none focus:border-[#0F172A]"
                  />
                )}

                {field.type === 'SELECT_CHOICE' && field.options && (
                  <select
                    defaultValue={field.defaultValue as string}
                    onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#CBD5E1] text-xs focus:outline-none focus:border-[#0F172A] bg-white"
                  >
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {field.helperText && (
                  <p className="text-[11px] text-[#64748B]">{field.helperText}</p>
                )}
              </div>
            ))}
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={() => handleResume(false)}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center space-x-1.5"
            >
              <span>{isSubmitting ? 'Validating...' : activeUI.submitButtonText || 'Continue to Authorization'}</span>
              <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* 5. STATUTORY AUTHORIZATION & CONSENT GATE */}
      {isAwaitingAuth && (
        <div className="bg-white border-2 border-[#0F172A] rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex items-center space-x-2 text-amber-800">
            <LockIcon className="w-5 h-5 text-amber-700" />
            <h3 className="text-base font-extrabold text-[#0F172A]">
              Statutory Citizen Authorization Required
            </h3>
          </div>

          <p className="text-xs text-[#334155] leading-relaxed">
            {activeUI?.authorizationNotice ||
              'This action submits an official statutory request. Under the Public Records and Information Technology statutory framework, INDRA requires your explicit authorization before executing irreversible changes.'}
          </p>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 text-xs space-y-2">
            <div className="font-bold text-[#0F172A]">Statutory Consent & Legal Terms:</div>
            <p className="text-[11px] text-[#475569]">
              I, <strong>{citizen?.primaryName || 'Priya Sharma'}</strong>, hereby authorize INDRA to submit signed digital claims and instructions to the designated statutory authority on my behalf, using my verified government ground truth.
            </p>
            <label className="flex items-center space-x-2 text-xs font-bold text-[#0F172A] pt-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentGranted}
                onChange={(e) => setConsentGranted(e.target.checked)}
                className="w-4 h-4 rounded text-[#0F172A] focus:ring-0"
              />
              <span>I confirm and grant statutory consent for this action.</span>
            </label>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          <div className="pt-2 flex justify-between items-center">
            <button
              onClick={onExitWorkspace}
              className="text-xs text-[#64748B] hover:text-[#0F172A] font-semibold cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={() => handleResume(true)}
              disabled={!consentGranted || isSubmitting}
              className={`px-6 py-2.5 text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1.5 cursor-pointer ${
                consentGranted && !isSubmitting
                  ? 'bg-[#0F172A] hover:bg-[#1E293B] text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>{isSubmitting ? 'Submitting to Authority...' : 'Authorize Statutory Action'}</span>
              <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* 6. OFFICIAL COMPLETION RECEIPT */}
      {isCompleted && (
        <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 shadow-md space-y-4 animate-fadeIn">
          <div className="flex items-center space-x-2 text-emerald-800">
            <CheckCircle2Icon className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-extrabold text-[#0F172A]">
                Statutory Action Completed Successfully
              </h3>
              <p className="text-xs text-emerald-700 font-medium">
                Official claim submitted and registered with statutory authority.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Universal Reference Code:</span>
              <span className="font-bold text-[#0F172A] mono">APP-STAT-{workflowRun.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Digital Signature Hash:</span>
              <span className="font-bold text-[#0F172A] mono">SHA256:4f9a...892e</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Statutory Universal Status:</span>
              <span className="font-bold text-emerald-800">COMPLETED & AUDITED</span>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={onExitWorkspace}
              className="px-6 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              Return to Government Home
            </button>
          </div>
        </div>
      )}

      {/* 7. FAILURE / COMPENSATION STATE */}
      {isFailed && (
        <div className="bg-white border-2 border-rose-500 rounded-2xl p-6 shadow-md space-y-4 animate-fadeIn">
          <div className="flex items-center space-x-2 text-rose-800">
            <AlertCircleIcon className="w-6 h-6 text-rose-600 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-extrabold text-[#0F172A]">
                Action Could Not Be Completed
              </h3>
              <p className="text-xs text-rose-700 font-medium">
                Automated reverse compensation was executed. No charges or partial changes were persisted.
              </p>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={onExitWorkspace}
              className="px-6 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              Return to Government Home
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
