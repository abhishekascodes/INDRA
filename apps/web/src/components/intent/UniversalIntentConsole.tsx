import React, { useState, useEffect, useRef } from 'react';
import type { StructuredIntent } from '@indra/contracts';
import { SearchIcon, MicIcon, ArrowRightIcon, BuildingIcon, BriefcaseIcon, PhoneIcon, ShieldCheckIcon } from '../icons.js';
import { resolveIntent } from '../../api.js';

interface UniversalIntentConsoleProps {
  onExecuteIntent: (intent: StructuredIntent) => void;
  isResolving?: boolean;
}

export function UniversalIntentConsole({
  onExecuteIntent,
  isResolving = false,
}: UniversalIntentConsoleProps) {
  const [query, setQuery] = useState('');
  const [previewIntent, setPreviewIntent] = useState<StructuredIntent | null>(null);
  const [isTypingResolving, setIsTypingResolving] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) {
      setPreviewIntent(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        setIsTypingResolving(true);
        const resolved = await resolveIntent(trimmed);
        if (resolved.intentId !== 'GENERAL_INQUIRY') {
          setPreviewIntent(resolved);
        } else {
          setPreviewIntent(null);
        }
      } catch {
        setPreviewIntent(null);
      } finally {
        setIsTypingResolving(false);
      }
    }, 180);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    try {
      const resolved = previewIntent || (await resolveIntent(trimmed));
      onExecuteIntent(resolved);
    } catch (err) {
      console.error('Failed to submit intent:', err);
    }
  };

  const handleChipClick = async (chipText: string) => {
    setQuery(chipText);
    try {
      const resolved = await resolveIntent(chipText);
      onExecuteIntent(resolved);
    } catch (err) {
      console.error('Failed to resolve chip intent:', err);
    }
  };

  return (
    <section className="w-full">
      {/* COMMAND DECK CONTAINER WITH SUBTLE AMBIENT BORDER */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative p-[1.5px] rounded-2xl bg-gradient-to-r from-[#93C5FD] via-[#A5B4FC] to-[#D8B4FE] shadow-[0_4px_25px_rgba(165,180,252,0.12)] focus-within:from-[#60A5FA] focus-within:to-[#C084FC] transition-all">
          <div className="bg-white rounded-[15px] px-5 py-3.5 flex items-center justify-between gap-3">
            
            {/* Input field */}
            <div className="flex-1 flex items-center">
              <SearchIcon className="w-5 h-5 text-[#94A3B8] mr-3 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What do you need to get done?"
                className="w-full text-base sm:text-lg font-normal text-[#0F172A] placeholder-[#64748B] focus:outline-none tracking-tight bg-transparent"
              />
            </div>

            {/* Mic and Action Pill */}
            <div className="flex items-center space-x-2.5 flex-shrink-0">
              <button
                type="button"
                className="w-10 h-10 rounded-full border border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
                title="Voice input"
              >
                <MicIcon className="w-4 h-4" />
              </button>

              <button
                type="submit"
                disabled={isResolving}
                className="px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-semibold rounded-full transition shadow-xs hover:shadow active:scale-95 cursor-pointer flex items-center space-x-1.5"
              >
                <span>Ask INDRA</span>
                <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

          </div>
        </div>
      </form>

      {/* QUIET HUMAN INTENT PREVIEW (Noisy AI telemetry replaced by quiet understanding) */}
      {previewIntent && (
        <div className="mt-2.5 px-4 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition animate-fadeIn">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
            <span className="font-semibold text-[#0F172A]">
              {previewIntent.humanExplanation || previewIntent.suggestedActionTitle}
            </span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] text-[#64748B]">
            {previewIntent.statutoryAuthority && (
              <span className="font-medium text-[#475569]">{previewIntent.statutoryAuthority}</span>
            )}
            {previewIntent.recoverableValue && (
              <span className="font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded">
                {previewIntent.recoverableValue}
              </span>
            )}
            <button
              onClick={() => onExecuteIntent(previewIntent)}
              className="font-bold text-[#0F172A] hover:underline flex items-center cursor-pointer"
            >
              <span>Act now</span>
              <ArrowRightIcon className="w-3 h-3 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* POPULAR INTENT QUICK LAUNCH CHIPS */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[#64748B] font-medium mr-1 text-[11px]">Popular:</span>

        <button
          onClick={() => handleChipClick('I want to start a private limited company')}
          className="px-3.5 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl text-[#334155] font-medium transition shadow-2xs cursor-pointer flex items-center space-x-1.5"
        >
          <BuildingIcon className="w-3 h-3 text-[#64748B]" />
          <span>Start a company</span>
        </button>

        <button
          onClick={() => handleChipClick('Recover dormant PF from previous employer')}
          className="px-3.5 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl text-[#334155] font-medium transition shadow-2xs cursor-pointer flex items-center space-x-1.5"
        >
          <BriefcaseIcon className="w-3 h-3 text-[#64748B]" />
          <span>Recover dormant PF</span>
          <span className="font-bold text-amber-800 bg-amber-50 text-[10px] px-1 rounded border border-amber-200">
            ₹1.42L
          </span>
        </button>

        <button
          onClick={() => handleChipClick('I lost my phone and need emergency block')}
          className="px-3.5 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl text-[#334155] font-medium transition shadow-2xs cursor-pointer flex items-center space-x-1.5"
        >
          <PhoneIcon className="w-3 h-3 text-[#64748B]" />
          <span>Lost / stolen phone</span>
        </button>

        <button
          onClick={() => handleChipClick('Fix name discrepancy between PAN and Aadhaar')}
          className="px-3.5 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl text-[#334155] font-medium transition shadow-2xs cursor-pointer flex items-center space-x-1.5"
        >
          <ShieldCheckIcon className="w-3 h-3 text-[#64748B]" />
          <span>Harmonize PAN name</span>
        </button>

        <button
          onClick={() => handleChipClick('I moved to Bengaluru and need to update records')}
          className="px-3.5 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl text-[#334155] font-medium transition shadow-2xs cursor-pointer flex items-center space-x-1.5"
        >
          <span>I moved to Bengaluru</span>
        </button>
      </div>
    </section>
  );
}
