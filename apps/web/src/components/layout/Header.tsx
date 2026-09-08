import React, { useState, useRef, useEffect } from 'react';
import {
  HomeIcon,
  InboxIcon,
  LockIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
  ChevronDownIcon,
  CheckIcon,
  UserIcon,
  IndraEmblemIcon,
  CitizenAvatarIcon,
  RefreshIcon,
} from '../icons.js';

export type NavTab = 'home' | 'world-model' | 'action-plans' | 'transitions' | 'inbox' | 'vault' | 'trust';

interface HeaderProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  inboxUnreadCount: number;
  citizenName?: string;
  citizenLocation?: string;
  onLogout?: () => void;
  onResetWorkspace?: () => Promise<void>;
}

export function Header({
  activeTab,
  onSelectTab,
  inboxUnreadCount,
  citizenName = 'Aarav Patel',
  citizenLocation = 'Bengaluru, KA',
  onLogout,
  onResetWorkspace,
}: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleConfirmReset = async () => {
    if (!onResetWorkspace) return;
    try {
      setIsResetting(true);
      await onResetWorkspace();
      setShowResetModal(false);
    } catch (err) {
      console.error('Failed to reset synthetic workspace:', err);
    } finally {
      setIsResetting(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50 shadow-2xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 h-16 flex items-center justify-between gap-4">
        {/* 1. BRAND LOGO & SYSTEM TAG */}
        <div 
          onClick={() => onSelectTab('home')}
          className="flex items-center space-x-3 cursor-pointer select-none shrink-0 group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center p-1.5 shadow-xs group-hover:bg-slate-800 transition-colors">
            <IndraEmblemIcon className="w-5.5 h-5.5 shrink-0 text-white" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-sans font-black text-xl tracking-tight text-[#0F172A]">INDRA</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-extrabold tracking-wider uppercase text-slate-600">
              CIVIC OS · PROTOTYPE
            </span>
          </div>
        </div>

        {/* 2. CENTER NAVIGATION TABS (Sleek, compact, zero wrapping) */}
        <nav className="flex items-center space-x-1 text-xs sm:text-sm font-semibold overflow-x-auto no-scrollbar py-1">
          <button
            data-tab="home"
            onClick={() => onSelectTab('home')}
            className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer select-none whitespace-nowrap ${
              activeTab === 'home'
                ? 'text-[#0F172A] bg-slate-100 font-extrabold shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            <HomeIcon className="w-4 h-4 shrink-0" />
            <span>Home</span>
          </button>

          <button
            data-tab="records"
            onClick={() => onSelectTab('world-model')}
            className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer select-none whitespace-nowrap ${
              activeTab === 'world-model'
                ? 'text-[#0F172A] bg-slate-100 font-extrabold shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            <ShieldCheckIcon className="w-4 h-4 shrink-0" />
            <span>Records</span>
          </button>

          <button
            data-tab="action-plans"
            onClick={() => onSelectTab('action-plans')}
            className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer select-none whitespace-nowrap ${
              activeTab === 'action-plans'
                ? 'text-[#0F172A] bg-slate-100 font-extrabold shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            <AlertCircleIcon className="w-4 h-4 shrink-0" />
            <span>Action Plans</span>
          </button>

          <button
            data-tab="transitions"
            onClick={() => onSelectTab('transitions')}
            className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer select-none whitespace-nowrap ${
              activeTab === 'transitions'
                ? 'text-[#0F172A] bg-slate-100 font-extrabold shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            <RefreshIcon className="w-4 h-4 shrink-0" />
            <span>Activity</span>
          </button>

          <button
            data-tab="inbox"
            onClick={() => onSelectTab('inbox')}
            className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer select-none whitespace-nowrap ${
              activeTab === 'inbox'
                ? 'text-[#0F172A] bg-slate-100 font-extrabold shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            <InboxIcon className="w-4 h-4 shrink-0" />
            <span>Inbox</span>
            {inboxUnreadCount > 0 && (
              <span className="px-1.5 py-0.2 text-2xs bg-amber-100 text-amber-900 rounded-full font-bold">
                {inboxUnreadCount}
              </span>
            )}
          </button>

          <button
            data-tab="vault"
            onClick={() => onSelectTab('vault')}
            className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer select-none whitespace-nowrap ${
              activeTab === 'vault'
                ? 'text-[#0F172A] bg-slate-100 font-extrabold shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            <LockIcon className="w-4 h-4 shrink-0" />
            <span>Vault</span>
          </button>

          <button
            data-tab="trust"
            onClick={() => onSelectTab('trust')}
            className={`px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer select-none whitespace-nowrap ${
              activeTab === 'trust'
                ? 'text-[#0F172A] bg-slate-100 font-extrabold shadow-2xs'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            <ShieldCheckIcon className="w-4 h-4 shrink-0" />
            <span>Privacy</span>
          </button>
        </nav>

        {/* 3. RIGHT CITIZEN IDENTITY PILL & AUTHENTICATED PROFILE MENU */}
        <div ref={dropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border transition flex items-center space-x-2.5 cursor-pointer select-none ${
              isDropdownOpen
                ? 'bg-white border-[#0F172A] ring-2 ring-[#0F172A]/10 shadow-xs'
                : 'bg-white hover:bg-[#F8FAFC] border-[#CBD5E1] hover:border-[#94A3B8] shadow-2xs'
            }`}
            title="Citizen Account"
          >
            <div className="relative">
              <CitizenAvatarIcon className="w-7 h-7 shrink-0" />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            <div className="text-left hidden sm:block">
              <div className="text-xs font-bold text-[#0F172A] leading-tight">{citizenName}</div>
              <div className="text-[11px] text-[#64748B] leading-tight">{citizenLocation}</div>
            </div>

            <ChevronDownIcon
              className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-200 shrink-0 ${
                isDropdownOpen ? 'rotate-180 text-[#0F172A]' : ''
              }`}
            />
          </button>

          {/* Authenticated Citizen Profile Dropdown Card */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#CBD5E1] rounded-2xl shadow-xl z-50 p-3 animate-fadeIn">
              <div className="flex items-center space-x-3 pb-3 border-b border-[#F1F5F9]">
                <CitizenAvatarIcon className="w-10 h-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[#0F172A] truncate">{citizenName}</div>
                  <div className="text-xs text-[#64748B] truncate">{citizenLocation}</div>
                </div>
              </div>

              <div className="py-2.5 space-y-2 border-b border-[#F1F5F9]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748B] font-medium">Status</span>
                  <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    ✓ Verified Citizen
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#64748B] font-medium">Security</span>
                  <span className="inline-flex items-center text-xs text-slate-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block mr-1.5" />
                    Secure session active
                  </span>
                </div>
              </div>

              <div className="pt-2 space-y-1">
                {onResetWorkspace && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setShowResetModal(true);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors text-left flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center space-x-2">
                      <RefreshIcon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reset synthetic workspace</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Demo</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onLogout) onLogout();
                  }}
                  className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors text-left flex items-center justify-between cursor-pointer"
                >
                  <span>Log Out</span>
                  <span className="text-rose-400">→</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Synthetic Workspace Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold">
                <RefreshIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#0F172A] tracking-tight uppercase">
                  Reset Synthetic Workspace
                </h3>
                <p className="text-[11px] font-semibold text-[#64748B]">
                  Synthetic Evaluation & Demonstration Environment
                </p>
              </div>
            </div>

            <p className="text-xs text-[#475569] leading-relaxed">
              This returns this synthetic citizen to the clean evaluation starting state. Your account remains intact.
            </p>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-bold text-slate-800">What will be reset:</div>
              <div>• Completed and suspended workflow runs & state transitions</div>
              <div>• Simulated institutional failure states & contradictions</div>
              <div>• Created demo properties, filings, and test receipts</div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0F172A] hover:bg-slate-800 text-white cursor-pointer disabled:opacity-50 flex items-center space-x-1.5 shadow-xs"
              >
                {isResetting ? (
                  <span>Resetting...</span>
                ) : (
                  <span>Reset workspace</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
