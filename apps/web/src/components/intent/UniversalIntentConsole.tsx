import React, { useState, useEffect, useRef } from 'react';
import type { StructuredIntent } from '@indra/contracts';
import {
  SearchIcon,
  MicIcon,
  ArrowRightIcon,
  BuildingIcon,
  BriefcaseIcon,
  PhoneIcon,
  ShieldCheckIcon,
  MapPinIcon,
} from '../icons.js';
import { resolveIntent } from '../../api.js';
import { formatHumanLabel } from '../../utils/civicFormatters.js';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Live background intent understanding as user types
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setPreviewIntent(null);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const resolved = await resolveIntent(trimmed);
        setPreviewIntent(resolved);
      } catch {
        setPreviewIntent(null);
      }
    }, 180);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [query]);

  // Handle Form Submission (Both Enter key and button click)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    try {
      setIsSubmitting(true);
      const resolved = await resolveIntent(trimmed);
      setPreviewIntent(resolved);
      onExecuteIntent(resolved);
    } catch (err) {
      console.error('Failed to submit intent:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Clicking Popular Chips
  const handleChipClick = async (chipText: string) => {
    setQuery(chipText);
    try {
      setIsSubmitting(true);
      const resolved = await resolveIntent(chipText);
      setPreviewIntent(resolved);
      onExecuteIntent(resolved);
    } catch (err) {
      console.error('Failed to resolve chip intent:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Web Speech Recognition Handler
  const toggleVoiceInput = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice('Voice recognition is supported in Chrome, Edge, and Safari. Please type your request.');
      setTimeout(() => setVoiceNotice(null), 4000);
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setQuery(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceNotice('Microphone access was denied. Please allow microphone permissions in browser settings.');
        } else if (event.error !== 'no-speech') {
          setVoiceNotice(`Microphone notice: ${event.error}`);
        }
        setTimeout(() => setVoiceNotice(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setVoiceNotice('Could not access microphone. Please check browser permissions.');
      setTimeout(() => setVoiceNotice(null), 4000);
    }
  };

  return (
    <section className="w-full">
      {/* COMMAND DECK CONTAINER WITH AMBIENT FOCUS BORDER */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`relative p-[1.5px] rounded-2xl transition-all shadow-[0_4px_25px_rgba(165,180,252,0.15)] ${
            isListening
              ? 'bg-gradient-to-r from-red-500 via-amber-500 to-rose-500 ring-2 ring-red-400'
              : 'bg-gradient-to-r from-[#93C5FD] via-[#A5B4FC] to-[#D8B4FE] focus-within:from-[#3B82F6] focus-within:to-[#8B5CF6]'
          }`}
        >
          <div className="bg-white rounded-[15px] px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3">
            {/* Input field */}
            <div className="flex-1 flex items-center">
              <SearchIcon className="w-5 h-5 text-[#94A3B8] mr-3 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={
                  isListening
                    ? 'Listening... Speak clearly now...'
                    : 'What do you need to get done? (e.g., recover PF, lost phone, register company)'
                }
                className="w-full text-base sm:text-lg font-normal text-[#0F172A] placeholder-[#64748B] focus:outline-none tracking-tight bg-transparent"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setPreviewIntent(null);
                  }}
                  className="text-xs text-[#94A3B8] hover:text-[#0F172A] px-2 py-1 cursor-pointer font-bold uppercase tracking-wider"
                  title="Clear input"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Mic and Action Pill */}
            <div className="flex items-center space-x-2.5 flex-shrink-0">
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition cursor-pointer ${
                  isListening
                    ? 'bg-red-50 border-red-500 text-red-600 animate-pulse'
                    : 'border-[#E2E8F0] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A]'
                }`}
                title={isListening ? 'Click to stop listening' : 'Click for voice input'}
              >
                <MicIcon className={`w-4 h-4 ${isListening ? 'text-red-600' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isResolving || isSubmitting}
                className="px-5 py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white text-sm font-semibold rounded-full transition shadow-xs hover:shadow active:scale-95 cursor-pointer flex items-center space-x-1.5 disabled:opacity-60"
              >
                <span>{isSubmitting ? 'Consulting INDRA...' : 'Ask INDRA'}</span>
                <ArrowRightIcon className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Voice Feedback Tooltip */}
        {voiceNotice && (
          <div className="mt-2 text-xs px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 animate-fadeIn">
            {voiceNotice}
          </div>
        )}
      </form>

      {/* REAL-TIME INTENT PREVIEW BANNER */}
      {previewIntent && (
        <div className="mt-3 px-5 py-3.5 bg-white border border-[#CBD5E1] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm shadow-xs animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[#64748B]">I think you want to:</span>
            <span className="font-bold text-[#0F172A]">
              {previewIntent.suggestedActionTitle || formatHumanLabel(previewIntent.intentId)}
            </span>
            <span className="text-xs uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
              {previewIntent.intentCategory || previewIntent.statutoryAuthority || 'CIVIC'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {previewIntent.recoverableValue && (
              <span className="font-bold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-md border border-amber-200 text-xs">
                {previewIntent.recoverableValue}
              </span>
            )}
            <button
              type="button"
              onClick={() => onExecuteIntent(previewIntent)}
              className="font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-sm flex items-center cursor-pointer shadow-xs transition"
            >
              <span>{previewIntent.matchedWorkflowCode ? 'Start Action' : 'View Answer'}</span>
              <ArrowRightIcon className="w-4 h-4 ml-1.5" />
            </button>
          </div>
        </div>
      )}

      {/* POPULAR INTENT QUICK LAUNCH CHIPS */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5 text-sm">
        <span className="text-[#64748B] font-bold mr-1 text-xs uppercase tracking-wider">TRY SAYING:</span>

        <button
          type="button"
          onClick={() => handleChipClick('I moved to Bangalore and bought a plot in Devanahalli')}
          className="px-4 py-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#94A3B8] rounded-xl text-[#334155] font-medium transition shadow-2xs cursor-pointer flex items-center space-x-2"
        >
          <MapPinIcon className="w-4 h-4 text-[#64748B]" />
          <span>I moved to Bangalore & bought a plot</span>
        </button>

        <button
          type="button"
          onClick={() => handleChipClick('Recover dormant PF from previous employer')}
          className="px-4 py-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#94A3B8] rounded-xl text-[#334155] font-medium transition shadow-2xs cursor-pointer flex items-center space-x-2"
        >
          <BriefcaseIcon className="w-4 h-4 text-[#64748B]" />
          <span>Recover dormant PF</span>
          <span className="font-bold text-amber-800 bg-amber-50 text-xs px-2 py-0.5 rounded border border-amber-200">
            ₹1.42L
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleChipClick('Fix name discrepancy between PAN and Aadhaar')}
          className="px-4 py-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#94A3B8] rounded-xl text-[#334155] font-medium transition shadow-2xs cursor-pointer flex items-center space-x-2"
        >
          <ShieldCheckIcon className="w-4 h-4 text-[#64748B]" />
          <span>Harmonize PAN name</span>
        </button>

        <button
          type="button"
          onClick={() => handleChipClick('I want to start a private limited company')}
          className="px-4 py-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#94A3B8] rounded-xl text-[#334155] font-medium transition shadow-2xs cursor-pointer flex items-center space-x-2"
        >
          <BuildingIcon className="w-4 h-4 text-[#64748B]" />
          <span>Start a company</span>
        </button>

        <button
          type="button"
          onClick={() => handleChipClick('I lost my phone and need emergency block')}
          className="px-4 py-2 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] hover:border-[#94A3B8] rounded-xl text-[#334155] font-medium transition shadow-2xs cursor-pointer flex items-center space-x-2"
        >
          <PhoneIcon className="w-4 h-4 text-[#64748B]" />
          <span>Lost / stolen phone</span>
        </button>
      </div>
    </section>
  );
}
