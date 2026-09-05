import React, { useEffect, useState } from 'react';
import { fetchWorldModel } from '../../api.js';
import type { CitizenWorldModel } from '@indra/contracts';
import {
  ShieldCheckIcon,
  UserIcon,
  VehicleCarIcon,
  LandParcelIcon,
  BriefcaseIcon,
  ScaleOfJusticeIcon,
  CheckIcon,
} from '../icons.js';

interface WorldModelInspectorProps {
  citizenId: string;
}

export const WorldModelInspector: React.FC<WorldModelInspectorProps> = ({ citizenId }) => {
  const [worldModel, setWorldModel] = useState<CitizenWorldModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchWorldModel()
      .then((data) => {
        if (mounted) {
          setWorldModel(data.worldModel);
          setError(null);
        }
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [citizenId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#64748B] font-sans">
        <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full mr-3" />
        Checking official government records across national registries...
      </div>
    );
  }

  if (error || !worldModel) {
    return (
      <div className="p-8 bg-[#F8FAFC] rounded-2xl border border-[#CBD5E1] text-[#475569] font-sans">
        <h3 className="text-lg font-bold text-[#0F172A] mb-1">Official Records Unavailable</h3>
        <p className="text-sm text-[#64748B]">{error || 'Unable to retrieve citizen public record.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans w-full py-2 animate-fadeIn">
      {/* Header Banner */}
      <div className="border-b border-[#E2E8F0] pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold tracking-wider uppercase px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
                Official Public Record
              </span>
              <span className="text-sm font-semibold text-[#64748B]">Synchronized with National Registries</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              My Official Public Records
            </h1>
            <p className="text-sm sm:text-base text-[#475569] mt-1.5 leading-relaxed">
              All official records connected to your identity — identity details, vehicle registrations, properties, employment, and legal requirements.
            </p>
          </div>
          <div className="sm:text-right shrink-0">
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
              <ShieldCheckIcon className="w-4 h-4 mr-1.5 text-emerald-600" />
              100% Verified Ground Truth
            </span>
            <p className="text-xs text-[#64748B] mt-1 font-mono">Profile ID: {worldModel.profile.id.slice(0, 8)}...</p>
          </div>
        </div>
      </div>

      {/* Grid: Identity & Family */}
      <div className="grid items-start grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-[#CBD5E1] shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#334155]">
                Identity & Demographics
              </h2>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-[#475569]">
              UIDAI / Aadhaar
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-[#64748B] font-medium">Full Legal Name</dt>
              <dd className="font-bold text-[#0F172A] mt-0.5">{worldModel.profile.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B] font-medium">Date of Birth</dt>
              <dd className="font-bold text-[#0F172A] mt-0.5">{worldModel.profile.dateOfBirth}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B] font-medium">Current Residence</dt>
              <dd className="font-bold text-[#0F172A] mt-0.5">{worldModel.profile.currentCity}, {worldModel.profile.currentState}</dd>
            </div>
            <div>
              <dt className="text-xs text-[#64748B] font-medium">Registered Mobile</dt>
              <dd className="font-mono font-bold text-[#0F172A] mt-0.5">{worldModel.profile.primaryMobile}</dd>
            </div>
          </dl>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-[#CBD5E1] shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F1F5F9]">
            <div className="flex items-center space-x-2">
              <UserIcon className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#334155]">
                Family & Kinship Links
              </h2>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-[#475569]">
              Civil Registry
            </span>
          </div>
          {worldModel.relationships.length === 0 ? (
            <p className="text-sm text-[#64748B] italic py-4 text-center">No family relationships linked.</p>
          ) : (
            <div className="space-y-3">
              {worldModel.relationships.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-b-0">
                  <div>
                    <span className="text-xs font-bold text-[#475569] mr-2 uppercase tracking-wide">
                      {r.relationType}
                    </span>
                    <span className="font-bold text-[#0F172A]">{r.fullName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.isNomineeForEpfo && (
                      <span className="text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded-md">
                        EPFO Nominee
                      </span>
                    )}
                    {r.isDependentForHealth && (
                      <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                        Health Dependent
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vehicles (Vahan) Section */}
      <div className="p-6 bg-white rounded-2xl border border-[#CBD5E1] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
              <VehicleCarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Motor Vehicles & Transport (Vahan)</h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">Verified directly with Ministry of Road Transport & Highways</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-[#F1F5F9] px-3 py-1 rounded-md text-[#334155] border border-[#CBD5E1]">
            {worldModel.vehicles.length} Registered
          </span>
        </div>

        {worldModel.vehicles.length === 0 ? (
          <div className="p-6 bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-xl text-center">
            <p className="text-sm font-semibold text-[#334155]">No motor vehicles registered under this identity.</p>
            <p className="text-xs text-[#64748B] mt-1">Vehicle compliance and inter-state NOC obligations are automatically cleared.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {worldModel.vehicles.map((v) => (
              <div key={v.id} className="p-5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-bold text-[#0F172A] tracking-wide">{v.registrationNumber}</span>
                  <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded font-bold">
                    {v.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#334155]">{v.makerModel}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-[#475569] pt-2 border-t border-[#E2E8F0]">
                  <div>RTO: <span className="font-mono text-[#0F172A] font-semibold">{v.rtoCode} ({v.state})</span></div>
                  <div>Fitness: <span className="font-mono text-[#0F172A] font-semibold">{v.fitnessValidUntil}</span></div>
                  {v.hypothecatedTo && <div className="col-span-2">Hypothecated: <span className="font-semibold text-[#0F172A]">{v.hypothecatedTo}</span></div>}
                </div>
                <div className="text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span>Source: {v.provenance.source}</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckIcon className="w-3.5 h-3.5" />
                    Verified Official Record
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Real Estate & Properties Section */}
      <div className="p-6 bg-white rounded-2xl border border-[#CBD5E1] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200">
              <LandParcelIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Properties & Land Parcels</h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">Municipal Corporation & State Revenue Land Records</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-[#F1F5F9] px-3 py-1 rounded-md text-[#334155] border border-[#CBD5E1]">
            {worldModel.properties.length} Parcel / Unit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {worldModel.properties.map((p) => (
            <div key={p.id} className="p-5 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#475569]">{p.propertyType.replace('_', ' ')}</span>
                <span className="font-mono text-xs text-[#0F172A] font-bold">{p.identifier}</span>
              </div>
              <p className="text-sm font-semibold text-[#0F172A]">{p.address}</p>
              <div className="flex items-center justify-between text-xs text-[#475569] pt-2 border-t border-[#E2E8F0]">
                <span>Authority: <span className="font-semibold text-[#0F172A]">{p.municipalBody}</span></span>
                <span className="text-emerald-700 font-bold">Tax: ₹{p.annualTaxInr.toLocaleString()} ({p.taxPaymentStatus})</span>
              </div>
              <div className="text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                <span>Source: {p.provenance.source}</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckIcon className="w-3.5 h-3.5" />
                  Verified Official Record
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employment & Service Records Section */}
      <div className="p-6 bg-white rounded-2xl border border-[#CBD5E1] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
              <BriefcaseIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Employment & Provident Fund History</h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">Employees' Provident Fund Organisation (EPFO) Records</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-[#F1F5F9] px-3 py-1 rounded-md text-[#334155] border border-[#CBD5E1]">
            {worldModel.employments.length} Record(s)
          </span>
        </div>

        <div className="space-y-3">
          {worldModel.employments.map((e) => (
            <div key={e.id} className={`p-5 rounded-xl border ${e.isCurrent ? 'border-emerald-200 bg-emerald-50/20' : 'border-[#CBD5E1] bg-[#F8FAFC]'} space-y-2`}>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#0F172A]">{e.employerName}</h3>
                {e.isCurrent ? (
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md font-bold">Current Employer</span>
                ) : (
                  <span className="text-xs bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-md font-semibold">Past Service</span>
                )}
              </div>
              <p className="text-xs text-[#475569] font-medium">{e.designation || 'Specialist'}</p>
              <div className="grid grid-cols-3 gap-2 text-xs font-mono text-[#334155] pt-2 border-t border-[#E2E8F0]">
                <div>UAN: <span className="font-bold text-[#0F172A]">{e.uan || 'Linked'}</span></div>
                <div>Member ID: <span className="font-bold text-[#0F172A]">{e.memberId ? e.memberId.slice(0, 16) + '...' : 'N/A'}</span></div>
                <div className="text-right">Tenure: {e.startDate} → {e.endDate || 'Present'}</div>
              </div>
              <div className="text-xs text-[#64748B] pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                <span>Est. ID: {e.establishmentId}</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckIcon className="w-3.5 h-3.5" />
                  Verified Official Record
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statutory Obligations & Compliance Deadlines */}
      <div className="p-6 bg-white rounded-2xl border border-[#CBD5E1] shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl border border-purple-200">
              <ScaleOfJusticeIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">Active Government Obligations</h2>
              <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">Upcoming tax filings, renewals, and compliance dates</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {worldModel.obligations.map((o) => (
            <div key={o.id} className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${o.status === 'SATISFIED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                    {o.status}
                  </span>
                  <span className="text-base font-bold text-[#0F172A]">{o.title}</span>
                </div>
                <p className="text-xs text-[#64748B] mt-1 font-medium">{o.authority} · Due: {o.dueDate || 'Standard Cycle'}</p>
              </div>
              {o.penaltyInrPerDay && o.penaltyInrPerDay > 0 && (
                <div className="text-right">
                  <span className="text-xs text-amber-700 font-bold">₹{o.penaltyInrPerDay}/day late fee if delayed</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
