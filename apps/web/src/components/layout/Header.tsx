import React from 'react';
import { HomeIcon, InboxIcon, LockIcon, ShieldCheckIcon, AlertCircleIcon } from '../icons.js';

export type NavTab = 'home' | 'inbox' | 'vault' | 'trust';

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
  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50">
      {/* 1. SYNTHETIC ENVIRONMENT DISCLOSURE MICRO-BANNER */}
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-1 text-center text-[11px] font-medium text-[#64748B] flex items-center justify-center space-x-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
        <span className="font-semibold text-[#0F172A]">Synthetic Public Infrastructure Environment</span>
        <span>·</span>
        <span>Demonstration Data</span>
        <span className="hidden sm:inline text-gray-300">|</span>
        <span className="hidden sm:inline text-[10px] text-[#94A3B8]">
          Simulated UIDAI, Income Tax, EPFO, MCA & CEIR registries
        </span>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* 2. LOGO & CIVIC TAGLINE */}
        <div 
          onClick={() => onSelectTab('home')}
          className="flex items-center space-x-3 cursor-pointer select-none"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0F172A] flex items-center justify-center text-white font-extrabold text-xs tracking-wider">
            IN
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="font-extrabold text-lg tracking-tight text-[#0F172A]">INDRA</span>
            <span className="text-xs text-[#64748B] font-medium hidden sm:inline">Citizen Operating Layer</span>
          </div>
        </div>

        {/* 3. CENTER NAVIGATION TABS */}
        <nav className="flex items-center space-x-1 text-xs font-semibold">
          <button
            onClick={() => onSelectTab('home')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'home'
                ? 'text-[#0F172A] bg-[#F1F5F9] font-bold'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-50'
            }`}
          >
            <HomeIcon className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => onSelectTab('inbox')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'inbox'
                ? 'text-[#0F172A] bg-[#F1F5F9] font-bold'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-50'
            }`}
          >
            <InboxIcon className="w-3.5 h-3.5" />
            <span>Inbox</span>
            {inboxUnreadCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-900 rounded-full font-bold">
                {inboxUnreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('vault')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'vault'
                ? 'text-[#0F172A] bg-[#F1F5F9] font-bold'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-50'
            }`}
          >
            <LockIcon className="w-3.5 h-3.5" />
            <span>Vault</span>
          </button>

          <button
            onClick={() => onSelectTab('trust')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'trust'
                ? 'text-[#0F172A] bg-[#F1F5F9] font-bold'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-gray-50'
            }`}
          >
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            <span>Trust & Privacy</span>
          </button>
        </nav>

        {/* 4. RIGHT CITIZEN IDENTITY PILL & SYNTHETIC SWITCHER */}
        <div className="flex items-center space-x-3">
          {availableCitizens && availableCitizens.length > 1 && onSwitchCitizen && (
            <select
              value={activeCitizenId || availableCitizens[0]?.id}
              onChange={(e) => onSwitchCitizen(e.target.value)}
              className="text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-1 text-[#0F172A] font-semibold cursor-pointer outline-none hover:border-[#94A3B8]"
              title="Switch Synthetic Citizen"
            >
              {availableCitizens.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.primaryName} ({c.currentCity})
                </option>
              ))}
            </select>
          )}

          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-[#0F172A]">{citizenName}</div>
            <div className="text-[11px] text-[#64748B]">{citizenLocation}</div>
          </div>

          <div className="w-9 h-9 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs border border-[#CBD5E1] shadow-xs">
            {citizenName.split(' ').map((n) => n[0]).join('')}
          </div>
        </div>

      </div>
    </header>
  );
}
