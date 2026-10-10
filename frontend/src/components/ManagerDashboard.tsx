import React, { useState } from 'react';
import type { ShiftWithListing } from '../types';
import { useUser } from '../context/UserContext';
import { formatDate, formatTimeRange, formatDuration, isCrossMidnight } from '../utils/date';
import {
  ShieldAlert,
  CheckCircle,
  Ban,
  Clock,
  Calendar,
  Award,
  ArrowRight,
  Moon
} from 'lucide-react';

interface ManagerDashboardProps {
  shifts: ShiftWithListing[];
  onApprove: (listingId: string) => Promise<void>;
  onReject: (listingId: string) => Promise<void>;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  shifts,
  onApprove,
  onReject,
}) => {
  const { currentUser, staffList } = useUser();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Find all claimed listings
  const claimedShifts = shifts.filter((s) => s.listing?.status === 'CLAIMED');

  const getStaff = (id: string) => staffList.find((s) => s.id === id);

  const handleAction = async (listingId: string, actionFn: (id: string) => Promise<void>) => {
    setProcessingId(listingId);
    try {
      await actionFn(listingId);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Manager Header & Authority Info */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-6 h-6 text-purple-300" />
              <h2 className="text-xl font-bold tracking-tight">Manager Approvals Dashboard</h2>
            </div>
            <p className="text-purple-200 text-xs mt-1 max-w-xl">
              Acting as <strong>{currentUser?.name}</strong>. Approving a claim re-validates labour
              compliance (Rules 2–5) in real-time. If rules fail, the swap is refused and the listing
              remains claimed.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/20 text-center sm:text-right">
            <div className="text-[11px] font-medium uppercase tracking-wider text-purple-200">
              Pending Approvals
            </div>
            <div className="text-2xl font-extrabold text-white">{claimedShifts.length}</div>
          </div>
        </div>
      </div>

      {/* Pending Approvals List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Shift Swaps Awaiting Manager Action</h3>
        </div>

        {claimedShifts.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-800">All Caught Up!</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no pending shift claims awaiting manager approval right now.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {claimedShifts.map((shift) => {
              const listing = shift.listing!;
              const poster = getStaff(listing.poster_id);
              const claimer = getStaff(listing.claimed_by || '');
              const isOvernight = isCrossMidnight(shift.start, shift.end);
              const isActingThis = processingId === listing.id;

              return (
                <div
                  key={shift.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:border-slate-300 transition-colors"
                >
                  {/* Left: Shift Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {shift.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDate(shift.start)}</span>
                      </span>
                      <span className="text-xs text-slate-600 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatTimeRange(shift.start, shift.end)}</span>
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                        {formatDuration(shift.duration_hours)}
                      </span>
                      {isOvernight && (
                        <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded flex items-center space-x-1 font-medium">
                          <Moon className="w-3 h-3" />
                          <span>Overnight</span>
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 flex items-center space-x-2">
                      <Award className="w-3.5 h-3.5 text-slate-400" />
                      <span>Required Certification:</span>
                      {shift.required_certification ? (
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {shift.required_certification}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </div>

                    {/* Swap Reassignment Visual Flow */}
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex flex-wrap items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                          Current Owner (Poster)
                        </span>
                        <div className="font-semibold text-slate-900 mt-0.5">
                          {poster?.name || listing.poster_id}
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block" />

                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">
                          Claiming Colleague
                        </span>
                        <div className="font-semibold text-purple-900 mt-0.5 flex items-center space-x-1.5">
                          <span>{claimer?.name || listing.claimed_by}</span>
                          {claimer?.certifications && claimer.certifications.length > 0 && (
                            <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-medium">
                              {claimer.certifications.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center space-x-3 self-end lg:self-center">
                    <button
                      onClick={() => handleAction(listing.id, onReject)}
                      disabled={isActingThis}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 border border-rose-200 text-rose-700 bg-white hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Reject Claim</span>
                    </button>

                    <button
                      onClick={() => handleAction(listing.id, onApprove)}
                      disabled={isActingThis}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{isActingThis ? 'Validating & Approving...' : 'Approve Swap'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
