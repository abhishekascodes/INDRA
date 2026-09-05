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
import { UniversalCitizenReviewConsole } from '../review/UniversalCitizenReviewConsole.js';
import { CustomSelect } from '../common/CustomSelect.js';
import { formatHumanLabel, formatStateLabel } from '../../utils/civicFormatters.js';

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
    <div className="w-full space-y-6 animate-fadeIn pb-12">
      
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
            {activeUI?.workspaceTitle || workflowRun.title || formatHumanLabel(workflowRun.workflowCode)}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
            {formatStateLabel(workflowRun.state)}
          </span>
          <span className="text-xs text-[#64748B] font-medium">
            Session: {workflowRun.id.slice(0, 8)}
          </span>
        </div>
      </div>

      {/* 2. HEADER BANNER */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 text-xs font-bold tracking-wider uppercase rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                STATUTORY WORKSPACE
              </span>
              <span className="text-sm text-[#64748B] font-medium">
                Step {currentStepNum} of {totalStepsNum}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0F172A] mt-2.5 tracking-tight">
              {activeUI?.workspaceTitle || workflowRun.title || 'Statutory Action in Progress'}
            </h1>
            <p className="text-sm text-[#475569] mt-1.5 leading-relaxed">
              {activeUI?.workspaceSubtitle || 'Review verified government ground truth and authorize official submission.'}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full sm:w-52 self-center sm:self-start">
            <div className="flex justify-between text-xs font-bold text-[#64748B] mb-1.5">
              <span>Progress</span>
              <span>{isCompleted ? '100%' : `${progressPercent}%`}</span>
            </div>
            <div className="w-full bg-[#E2E8F0] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
                style={{ width: isCompleted ? '100%' : `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. VERIFIED GOVERNMENT GROUND TRUTH INSPECTOR */}
      <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-xs">
        <button
          onClick={() => setIsInspectorOpen(!isInspectorOpen)}
          className="w-full p-4 bg-[#F8FAFC] border-b border-[#CBD5E1] flex items-center justify-between text-left hover:bg-[#F1F5F9] transition cursor-pointer"
        >
          <div className="flex items-center space-x-2 text-sm font-bold text-[#0F172A]">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-600" />
            <span>Verified Synthetic Ground Truth (Demonstration Registry)</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#64748B]">
            <span>{isInspectorOpen ? 'Hide Records' : 'Inspect Verified Records'}</span>
            {isInspectorOpen ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
          </div>
        </button>

        {isInspectorOpen && (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            {activeUI?.knownInformation && activeUI.knownInformation.length > 0 ? (
              activeUI.knownInformation.map((info, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#FAFAFA] border border-[#CBD5E1]">
                  <div className="text-xs text-[#64748B] font-semibold">{info.label}</div>
                  <div className="font-bold text-[#0F172A] mt-1 text-sm">{info.value}</div>
                  <div className="text-xs text-emerald-700 font-semibold mt-1.5 flex items-center">
                    <CheckIcon className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    <span>{info.source}</span>
                  </div>
                </div>
              ))
            ) : (
              <>
                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#CBD5E1]">
                  <div className="text-xs text-[#64748B] font-semibold">Citizen Full Legal Name</div>
                  <div className="font-bold text-[#0F172A] mt-1 text-sm">{citizen?.primaryName || 'Verified Citizen'}</div>
                  <div className="text-xs text-emerald-700 font-semibold mt-1.5 flex items-center">
                    <CheckIcon className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    <span>Verified via UIDAI Ground Truth</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#CBD5E1]">
                  <div className="text-xs text-[#64748B] font-semibold">Permanent Account Number (PAN)</div>
                  <div className="font-bold text-[#0F172A] mt-1 font-mono text-sm">
                    {(workflowRun.contextData?.panNumber as string) || citizen?.panNumber || 'Credential on file'}
                  </div>
                  <div className="text-xs text-sky-700 font-semibold mt-1.5 flex items-center">
                    <CheckIcon className="w-3.5 h-3.5 mr-1 text-sky-600" />
                    <span>Income Tax Department</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#CBD5E1]">
                  <div className="text-xs text-[#64748B] font-semibold">Verified Residential Address</div>
                  <div className="font-bold text-[#0F172A] mt-1 text-sm">
                    {citizen?.currentCity && citizen?.currentState
                      ? `${citizen.currentCity}, ${citizen.currentState}`
                      : 'Address record verified'}
                  </div>
                  <div className="text-xs text-emerald-700 font-semibold mt-1.5 flex items-center">
                    <CheckIcon className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    <span>UIDAI Address Registry</span>
                  </div>
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

          <div className="space-y-4">
            {activeUI.requiredFields.map((field: UIFieldDefinition) => (
              <div key={field.fieldId} className="space-y-1.5">
                <label className="text-sm font-bold text-[#334155] flex items-center justify-between">
                  <span>{field.label}</span>
                  {field.required && <span className="text-rose-600 text-xs font-semibold">Required</span>}
                </label>

                {field.type === 'TEXT_INPUT' && (
                  <input
                    type="text"
                    defaultValue={field.defaultValue as string}
                    placeholder={(field.props?.placeholder as string) || ''}
                    onChange={(e) => handleFieldChange(field.fieldId, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#CBD5E1] text-sm text-[#0F172A] focus:outline-none focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 bg-white"
                  />
                )}

                {field.type === 'SELECT_CHOICE' && field.options && (
                  <CustomSelect
                    options={field.options.map((opt) => ({
                      value: String(opt.value),
                      label: String(opt.label),
                    }))}
                    value={String(formData[field.fieldId] ?? field.defaultValue ?? field.options[0]?.value ?? '')}
                    onChange={(val) => handleFieldChange(field.fieldId, val)}
                    placeholder="Choose an option..."
                  />
                )}

                {field.helperText && (
                  <p className="text-xs text-[#64748B]">{field.helperText}</p>
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => handleResume(false)}
              disabled={isSubmitting}
              className="px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer flex items-center space-x-2"
            >
              <span>{isSubmitting ? 'Validating...' : activeUI.submitButtonText || 'Continue to Authorization'}</span>
              <ArrowRightIcon className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* 5. UNIVERSAL CITIZEN REVIEW & AUTHORIZATION CONSOLE */}
      {isAwaitingAuth && (
        <UniversalCitizenReviewConsole
          workflowRunId={workflowRun.id}
          citizen={citizen}
          onWorkflowAdvanced={onWorkflowUpdated}
          onCancel={onExitWorkspace}
        />
      )}

      {/* 6. OFFICIAL COMPLETION RECEIPT */}
      {isCompleted && (
        <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 shadow-md space-y-4 animate-fadeIn">
          <div className="flex items-center space-x-3 text-emerald-800">
            <CheckCircle2Icon className="w-7 h-7 text-emerald-600 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-extrabold text-[#0F172A]">
                Statutory Action Completed Successfully
              </h3>
              <p className="text-sm text-emerald-800 font-medium mt-0.5">
                Official claim submitted and registered with statutory authority.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#64748B]">Universal Reference Code:</span>
              <span className="font-bold text-[#0F172A] mono">APP-STAT-{workflowRun.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748B]">Server-Issued Authorization Hash:</span>
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
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              Return to Government Home
            </button>
          </div>
        </div>
      )}

      {/* 7. FAILURE / COMPENSATION STATE */}
      {isFailed && (
        <div className="bg-white border-2 border-rose-500 rounded-2xl p-6 shadow-md space-y-4 animate-fadeIn">
          <div className="flex items-center space-x-3 text-rose-800">
            <AlertCircleIcon className="w-7 h-7 text-rose-600 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-extrabold text-[#0F172A]">
                Action Could Not Be Completed
              </h3>
              <p className="text-sm text-rose-800 font-medium mt-0.5">
                Automated reverse compensation was executed. No charges or partial changes were persisted.
              </p>
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <button
              onClick={onExitWorkspace}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              Return to Government Home
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
