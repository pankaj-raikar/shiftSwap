import React, { useState } from 'react';
import type { ShiftWithListing } from '../types';
import { useUser } from '../context/UserContext';
import { ShiftCard } from './ShiftCard';
import {
  Briefcase,
  ShoppingBag,
  Clock,
} from 'lucide-react';

interface StaffDashboardProps {
  shifts: ShiftWithListing[];
  onPostSwap: (shiftId: string) => Promise<void>;
  onWithdraw: (listingId: string) => Promise<void>;
  onClaim: (listingId: string) => Promise<void>;
  onUnclaim: (listingId: string) => Promise<void>;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  shifts,
  onPostSwap,
  onWithdraw,
  onClaim,
  onUnclaim,
}) => {
  const { currentUser } = useUser();
  const [activeSubTab, setActiveSubTab] = useState<'my_shifts' | 'marketplace' | 'my_claims'>('my_shifts');
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | 'eligible' | 'ineligible'>('all');

  // Shifts assigned to the current user
  const myAssignedShifts = shifts.filter((s) => s.assigned_to === currentUser?.id);

  // Available shift listings posted by other colleagues (OPEN)
  const availableMarketplaceShifts = shifts.filter(
    (s) => s.assigned_to !== currentUser?.id && s.listing?.status === 'OPEN'
  );

  // Shifts claimed by current user awaiting manager approval
  const myClaimedShifts = shifts.filter(
    (s) => s.listing?.status === 'CLAIMED' && s.listing.claimed_by === currentUser?.id
  );

  // Calculate user total hours across all assigned shifts
  const totalAssignedHours = myAssignedShifts.reduce((acc, s) => acc + s.duration_hours, 0);

  // Filtered marketplace shifts
  const filteredMarketplaceShifts = availableMarketplaceShifts.filter((s) => {
    if (eligibilityFilter === 'eligible' && !s.eligibility?.eligible) return false;
    if (eligibilityFilter === 'ineligible' && s.eligibility?.eligible) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Staff Profile & Workload Summary Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {currentUser?.name}
              </h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                Staff Member
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-slate-500 font-medium">Your Certifications:</span>
              {currentUser?.certifications && currentUser.certifications.length > 0 ? (
                currentUser.certifications.map((cert) => (
                  <span
                    key={cert}
                    className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200"
                  >
                    {cert}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">None registered</span>
              )}
            </div>
          </div>

          {/* Workload Metric */}
          <div className="flex items-center space-x-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Assigned Hours
              </div>
              <div className="text-xl font-extrabold text-slate-900 flex items-baseline space-x-1">
                <span>{totalAssignedHours} hrs</span>
                <span className="text-xs font-normal text-slate-400">({myAssignedShifts.length} shifts)</span>
              </div>
            </div>
            <div className="h-10 w-px bg-slate-200"></div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Weekly Maximum
              </div>
              <div className="text-xl font-extrabold text-clinic-700">40.0 hrs</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex space-x-3">
          <button
            onClick={() => setActiveSubTab('my_shifts')}
            className={`flex items-center space-x-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all ${
              activeSubTab === 'my_shifts'
                ? 'border-clinic-600 text-clinic-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>My Assigned Shifts</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-bold">
              {myAssignedShifts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('marketplace')}
            className={`flex items-center space-x-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all ${
              activeSubTab === 'marketplace'
                ? 'border-clinic-600 text-clinic-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Available Shift Swaps</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-clinic-100 text-clinic-700 font-bold">
              {availableMarketplaceShifts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('my_claims')}
            className={`flex items-center space-x-2 pb-3 px-1 text-sm font-semibold border-b-2 transition-all ${
              activeSubTab === 'my_claims'
                ? 'border-clinic-600 text-clinic-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>My Claimed Shifts</span>
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-bold">
              {myClaimedShifts.length}
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: My Assigned Shifts */}
      {activeSubTab === 'my_shifts' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Your Current Roster</h3>
              <p className="text-xs text-slate-500">
                You can post any unlisted shift for a colleague to take over. Shifting remains assigned to you until approved.
              </p>
            </div>
          </div>

          {myAssignedShifts.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
              You have no shifts currently assigned.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAssignedShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  onPostSwap={onPostSwap}
                  onWithdraw={onWithdraw}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Available Shift Swaps (Open Marketplace) */}
      {activeSubTab === 'marketplace' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">Shift Swap Marketplace</h3>
              <p className="text-xs text-slate-500">
                Real-time compliance checks (Rules 1–5). You can claim shifts marked with green badges.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-lg p-1 text-xs font-medium">
                <button
                  onClick={() => setEligibilityFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    eligibilityFilter === 'all'
                      ? 'bg-white text-slate-900 font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({availableMarketplaceShifts.length})
                </button>
                <button
                  onClick={() => setEligibilityFilter('eligible')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    eligibilityFilter === 'eligible'
                      ? 'bg-white text-emerald-800 font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Eligible Only
                </button>
                <button
                  onClick={() => setEligibilityFilter('ineligible')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    eligibilityFilter === 'ineligible'
                      ? 'bg-white text-rose-800 font-semibold shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ineligible
                </button>
              </div>
            </div>
          </div>

          {filteredMarketplaceShifts.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
              No shift listings match the selected filters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMarketplaceShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  onClaim={onClaim}
                  showMarketplaceView={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: My Claimed Shifts */}
      {activeSubTab === 'my_claims' && (
        <div>
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Your Pending Claims</h3>
            <p className="text-xs text-slate-500">
              Shifts you claimed that are awaiting Manager review. You can unclaim anytime before approval.
            </p>
          </div>

          {myClaimedShifts.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 text-sm">
              You have no pending claims awaiting manager approval.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myClaimedShifts.map((shift) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  onUnclaim={onUnclaim}
                  showMarketplaceView={true}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
