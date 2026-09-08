import React, { useState } from 'react';
import {
  IndraEmblemIcon,
  ShieldCheckIcon,
  LockIcon,
  AlertCircleIcon,
  UserIcon,
  CheckIcon,
  InfoIcon,
} from '../icons.js';
import { login, signup } from '../../api.js';

interface IndraAuthPortalProps {
  onAuthenticated: (user: any, citizen: any) => void;
}

export function IndraAuthPortal({ onAuthenticated }: IndraAuthPortalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [state, setState] = useState('Karnataka');
  const [syntheticChallenge, setSyntheticChallenge] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          throw new Error('Please enter both email and password.');
        }
        const res = await login({ email, password });
        if (res.success && res.citizen) {
          onAuthenticated(res.user, res.citizen);
        } else {
          throw new Error(res.error || 'Authentication failed');
        }
      } else {
        if (!fullName || !email || !password) {
          throw new Error('Full Name, Email, and Password are required.');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        if (!syntheticChallenge || !/^\d{4}$/.test(syntheticChallenge.trim())) {
          throw new Error('Synthetic demo PIN must be exactly 4 digits (e.g. 4567).');
        }
        const res = await signup({
          email,
          password,
          fullName,
          city,
          state,
          syntheticChallenge: syntheticChallenge.trim(),
        });
        if (res.success && res.citizen) {
          onAuthenticated(res.user, res.citizen);
        } else {
          throw new Error(res.error || 'Registration failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#0F172A] font-sans antialiased">
      {/* 1. TOP CIVIC HEADER */}
      <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50 shadow-2xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & System Tag */}
          <div className="flex items-center space-x-3 select-none shrink-0">
            <div className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center p-1.5 shadow-xs">
              <IndraEmblemIcon className="w-5.5 h-5.5 shrink-0 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-sans font-black text-xl tracking-tight text-[#0F172A]">INDRA</span>
              <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-extrabold tracking-wider uppercase text-slate-600">
                CIVIC OS · PROTOTYPE
              </span>
            </div>
          </div>

          {/* Right Status Pill */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>National Gateway Operational</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. AUTHENTICATION BODY */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[460px]">
          {/* Gateway Title Block */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 mb-3 shadow-2xs">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sovereign Citizen Access Gateway</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#0F172A]">
              INDRA
            </h1>
            <div className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#64748B] mt-1">
              Universal Public Operating Layer
            </div>
            <p className="text-xs sm:text-sm text-[#64748B] mt-2 leading-relaxed max-w-sm mx-auto">
              Single authenticated citizen identity. Verified statutory records and deterministic public operations.
            </p>
          </div>

          {/* Clean Civic Card */}
          <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-sm overflow-hidden transition-all">
            {/* Segmented Mode Switcher */}
            <div className="p-3 pb-0">
              <div className="flex bg-[#F1F5F9] p-1 rounded-xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer select-none ${
                    mode === 'login'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                  }}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all text-center cursor-pointer select-none ${
                    mode === 'signup'
                      ? 'bg-white text-[#0F172A] shadow-xs'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Create Citizen Account
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 pt-5 space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircleIcon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 leading-relaxed">{error}</div>
                </div>
              )}

              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#334155] uppercase tracking-wider mb-1.5">
                      Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Aarav Patel"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#334155] uppercase tracking-wider mb-1.5">
                        City
                      </label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Bengaluru"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#334155] uppercase tracking-wider mb-1.5">
                        State
                      </label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Karnataka"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-[#334155] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'login' ? 'aarav.patel@example.in' : 'citizen@example.in'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#334155] uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'signup' && (
                    <span className="text-[10px] text-[#64748B]">Min. 8 characters</span>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                />
              </div>

              {mode === 'signup' && (
                <div className="pt-1">
                  <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                        Synthetic Demo PIN
                      </label>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        4 Digits
                      </span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mb-2">
                      Enter any 4 digits (e.g. 4567) to establish your synthetic cryptographic key.
                    </p>
                    <input
                      type="text"
                      maxLength={4}
                      pattern="\d{4}"
                      required
                      value={syntheticChallenge}
                      onChange={(e) => setSyntheticChallenge(e.target.value.replace(/\D/g, ''))}
                      placeholder="4567"
                      className="w-full px-3.5 py-2 rounded-lg border border-[#CBD5E1] bg-white text-sm text-[#0F172A] font-mono tracking-widest text-center focus:border-[#0F172A] focus:ring-2 focus:ring-[#0F172A]/10 shadow-2xs transition-all"
                    />
                    <div className="mt-2 text-[10px] text-[#94A3B8] text-center">
                      Zero real government credentials or biometric tokens are stored.
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm tracking-wide shadow-xs hover:shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <LockIcon className="w-4 h-4" />
                      <span>{mode === 'login' ? 'Sign In to Citizen Workspace' : 'Create Account & Enter'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Evaluation Test Credentials Hint Card */}
            {mode === 'login' && (
              <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider flex items-center gap-1.5">
                    <InfoIcon className="w-3.5 h-3.5 text-[#64748B]" />
                    <span>Evaluation Test Accounts</span>
                  </span>
                  <span className="text-[10px] font-medium text-[#64748B]">
                    Click to load credentials
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left">
                  <button
                    type="button"
                    onClick={() => handleFillDemo('aarav.patel@example.in', 'Password123!')}
                    className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#94A3B8] hover:shadow-xs transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-[#0F172A] group-hover:text-blue-900">Aarav Patel</span>
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
                        Active
                      </span>
                    </div>
                    <div className="text-[10px] text-[#64748B] font-mono truncate">aarav.patel@example.in</div>
                    <div className="text-[10px] text-[#94A3B8] font-mono">Password123!</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFillDemo('priya.sharma@example.in', 'Password123!')}
                    className="p-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:border-[#94A3B8] hover:shadow-xs transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-[#0F172A] group-hover:text-blue-900">Priya Sharma</span>
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1 py-0.2 rounded">
                        Active
                      </span>
                    </div>
                    <div className="text-[10px] text-[#64748B] font-mono truncate">priya.sharma@example.in</div>
                    <div className="text-[10px] text-[#94A3B8] font-mono">Password123!</div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* High-Trust Compliance & Security Footer */}
          <div className="mt-6 text-center space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
              <span className="inline-flex items-center gap-1">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span>DPDP Act 2023 Compliant</span>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <LockIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>HttpOnly Cryptographic Session</span>
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8]">
              Synthetic Public Service Demonstration · Republic of India Digital Public Infrastructure
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
