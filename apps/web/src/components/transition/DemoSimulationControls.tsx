import React, { useState, useEffect } from 'react';
import {
  setFaultSimulation,
  fetchFaultSimulationStatus,
} from '../../api.js';
import {
  AlertTriangleIcon,
  RefreshIcon,
  CheckIcon,
  ShieldCheckIcon,
} from '../icons.js';

interface DemoSimulationControlsProps {
  onScenarioSelect?: (scenarioQuery: string) => void;
  onStatusChanged?: () => void;
}

export function DemoSimulationControls({
  onScenarioSelect,
  onStatusChanged,
}: DemoSimulationControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSimulatingOutage, setIsSimulatingOutage] = useState(false);
  const [failNextRequest, setFailNextRequest] = useState(false);
  const [injectContradiction, setInjectContradiction] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchFaultSimulationStatus()
      .then((status) => {
        setIsSimulatingOutage(status.simulatePropertyOutage);
        setFailNextRequest(status.failNextPropertyRequest);
        setInjectContradiction(status.injectDeedContradiction);
      })
      .catch(() => {});
  }, []);

  const handleApply = async (newOutage: boolean, newFailNext: boolean, newInjectContra: boolean) => {
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      await setFaultSimulation({
        simulatePropertyOutage: newOutage,
        failNextPropertyRequest: newFailNext,
        injectDeedContradiction: newInjectContra,
      });
      setIsSimulatingOutage(newOutage);
      setFailNextRequest(newFailNext);
      setInjectContradiction(newInjectContra);
      setFeedbackMsg('Simulation parameters updated.');
      if (onStatusChanged) onStatusChanged();
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err: any) {
      setFeedbackMsg(`Error updating simulation: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleOutage = () => {
    const next = !isSimulatingOutage;
    handleApply(next, failNextRequest, injectContradiction);
  };

  const handleToggleContradiction = () => {
    const next = !injectContradiction;
    handleApply(isSimulatingOutage, failNextRequest, next);
  };

  const handleResetAll = () => {
    handleApply(false, false, false);
  };

  return (
    <div className="bg-white border border-[#CBD5E1] rounded-2xl p-4 shadow-2xs mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div
            className={`w-3 h-3 rounded-full shrink-0 ${
              isSimulatingOutage
                ? 'bg-amber-500 ring-4 ring-amber-100 animate-pulse'
                : 'bg-emerald-500 ring-4 ring-emerald-100'
            }`}
          />
          <div>
            <div className="text-xs font-bold text-[#0F172A] flex items-center space-x-2">
              <span>Simulated Public Authority Environment:</span>
              {isSimulatingOutage ? (
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-900">
                  Bhoomi Simulated 503 Outage Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-900">
                  All Institutional Services Online
                </span>
              )}
            </div>
            <p className="text-2xs text-[#64748B]">
              Simulate real-world public infrastructure conditions: test temporary outages, durable pause without data loss, and discrepancy detection.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-3 py-1.5 rounded-xl border border-[#CBD5E1] hover:bg-[#F8FAFC] text-2xs font-bold text-[#0F172A] transition cursor-pointer"
          >
            {isOpen ? 'Close Controls' : 'Simulation Controls'}
          </button>

          {onScenarioSelect && (
            <button
              type="button"
              onClick={() =>
                onScenarioSelect('I moved to Bangalore and bought a plot in Devanahalli.')
              }
              className="px-3 py-1.5 rounded-xl bg-[#0F172A] hover:bg-black text-white text-2xs font-bold transition shadow-xs cursor-pointer flex items-center space-x-1.5"
            >
              <span>Load Flagship Scenario</span>
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-3 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[#0F172A]">
                  Simulate Bhoomi 503 Service Outage
                </span>
                <button
                  type="button"
                  onClick={handleToggleOutage}
                  disabled={isSaving}
                  className={`px-3 py-1 rounded-lg text-2xs font-bold transition cursor-pointer ${
                    isSimulatingOutage
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-gray-100'
                  }`}
                >
                  {isSimulatingOutage ? 'Simulating Outage (Active)' : 'Simulate Outage'}
                </button>
              </div>
              <p className="text-2xs text-[#64748B]">
                Forces Bhoomi Land Records to return a temporary 503 gateway pause during mutation. Demonstrates safe durable pause without rollback or data loss.
              </p>
            </div>

            <div className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-[#0F172A]">
                  Deed Legal Name Discrepancy
                </span>
                <button
                  type="button"
                  onClick={handleToggleContradiction}
                  disabled={isSaving}
                  className={`px-3 py-1 rounded-lg text-2xs font-bold transition cursor-pointer ${
                    injectContradiction
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-white border border-[#CBD5E1] text-[#0F172A] hover:bg-gray-100'
                  }`}
                >
                  {injectContradiction ? 'Enabled (Active)' : 'Disabled'}
                </button>
              </div>
              <p className="text-2xs text-[#64748B]">
                Instruments sale deed transferee as 'Aarav Kumar Patel' vs Aadhaar 'Aarav Patel' to demonstrate automatic cross-registry discrepancy detection.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {feedbackMsg ? (
              <span className="text-2xs font-semibold text-emerald-700">{feedbackMsg}</span>
            ) : (
              <span className="text-2xs text-[#94A3B8]">
                Changes apply deterministically across all synthetic SPI adapter instances.
              </span>
            )}

            <button
              type="button"
              onClick={handleResetAll}
              disabled={isSaving}
              className="text-2xs font-bold text-[#64748B] hover:text-[#0F172A] underline cursor-pointer"
            >
              Reset All to Normal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
