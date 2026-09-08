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
  availableCitizens?: Array<{ id: string; primaryName: string; currentCity: string; currentState: string }>;
  activeCitizenId?: string;
  onSwitchCitizen?: (id: string) => void;
}

export function Header({
  activeTab,
  onSelectTab,
  inboxUnreadCount,
  citizenName = 'Priya Sharma',
  citizenLocation = 'Bengaluru, KA',
  availableCitizens = [],
  activeCitizenId,
  onSwitchCitizen,
}: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

        {/* 3. RIGHT CITIZEN IDENTITY PILL & PROFILE SWITCHER */}
        <div ref={dropdownRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border transition flex items-center space-x-2.5 cursor-pointer select-none ${
              isDropdownOpen
                ? 'bg-white border-[#0F172A] ring-2 ring-[#0F172A]/10 shadow-xs'
                : 'bg-white hover:bg-[#F8FAFC] border-[#CBD5E1] hover:border-[#94A3B8] shadow-2xs'
            }`}
            title="Switch Profile"
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

          {/* Elevated Persona Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-[#CBD5E1] rounded-2xl shadow-xl z-50 p-2 animate-fadeIn">
              <div className="px-3 pt-2 pb-1.5 border-b border-[#F1F5F9]">
                <div className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
                  Switch Profile
                </div>
                <div className="text-xs text-[#94A3B8] mt-0.5">
                  Select an active citizen profile to view personalized records and filings.
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                {availableCitizens.map((c) => {
                  const isSelected = activeCitizenId === c.id;
                  const isPriya = c.primaryName.includes('Priya');

                  return (
                    <div
                      key={c.id}
                      data-testid={`switch-citizen-${c.id}`}
                      data-citizen-name={c.primaryName}
                      onClick={() => {
                        if (onSwitchCitizen) {
                          onSwitchCitizen(c.id);
                        }
                        setIsDropdownOpen(false);
                      }}
                      className={`p-3 rounded-xl transition cursor-pointer border ${
                        isSelected
                          ? 'bg-[#F8FAFC] border-[#0F172A] shadow-2xs'
                          : 'bg-white hover:bg-[#F8FAFC] border-transparent hover:border-[#E2E8F0]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <CitizenAvatarIcon className="w-9 h-9 shrink-0" />
                          <div>
                            <div className="text-sm font-bold text-[#0F172A] flex items-center gap-1.5">
                              <span>{c.primaryName}</span>
                              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {isPriya ? 'Tech Sector' : 'MSME & Agriculture'}
                              </span>
                            </div>
                            <div className="text-xs text-[#64748B] mt-0.5">
                              {c.currentCity}, {c.currentState}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="p-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-[#F1F5F9] text-xs text-[#64748B]">
                        {isPriya
                          ? 'Key Records: EPFO Active · Ather 450X · Passport Expiring · Flat 402 BBMP'
                          : 'Key Records: GST Active · Satara Land Parcel · PM-KISAN Subsidy · ITR-2 Due'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
