import React, { useState } from 'react';
import type { ShiftWithListing } from '../types';
import { useUser } from '../context/UserContext';
import { formatDate, formatTimeRange, isCrossMidnight, formatDuration } from '../utils/date';
import { EligibilityBadge } from './EligibilityBadge';
import {
  Calendar,
  Clock,
  Award,
  User,
  Moon,
  Send,
  XCircle,
  CheckCircle,
  Ban,
  ArrowRightLeft
} from 'lucide-react';

interface ShiftCardProps {
  shift: ShiftWithListing;
  onPostSwap?: (shiftId: string) => Promise<void>;
  onWithdraw?: (listingId: string) => Promise<void>;
  onClaim?: (listingId: string) => Promise<void>;
  onUnclaim?: (listingId: string) => Promise<void>;
  onApprove?: (listingId: string) => Promise<void>;
  onReject?: (listingId: string) => Promise<void>;
  showMarketplaceView?: boolean;
}

export const ShiftCard: React.FC<ShiftCardProps> = ({
  shift,
  onPostSwap,
  onWithdraw,
  onClaim,
  onUnclaim,
  onApprove,
  onReject,
  showMarketplaceView = false,
}) => {
  const { currentUser } = useUser();
  const [isActing, setIsActing] = useState(false);

  const isOwner = currentUser?.id === shift.assigned_to;
  const isOvernight = isCrossMidnight(shift.start, shift.end);
  const listing = shift.listing;
  const isClaimedByMe = listing?.status === 'CLAIMED' && listing.claimed_by === currentUser?.id;

  const handleAction = async (actionPromise?: Promise<void>) => {
    if (!actionPromise) return;
    setIsActing(true);
    try {
      await actionPromise;
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl border transition-all duration-150 shadow-sm hover:shadow-md overflow-hidden flex flex-col justify-between ${
        listing?.status === 'OPEN'
          ? 'border-clinic-300 ring-1 ring-clinic-100'
          : listing?.status === 'CLAIMED'
          ? 'border-amber-300 ring-1 ring-amber-100'
          : 'border-slate-200'
      }`}
    >
      <div className="p-4 sm:p-5">
        {/* Header: Date & Status Badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2 text-slate-800">
            <Calendar className="w-4 h-4 text-clinic-600 flex-shrink-0" />
            <span className="font-semibold text-sm sm:text-base">
              {formatDate(shift.start)}
            </span>
          </div>

          {/* Status Badge */}
          {listing ? (
            <span
              className={`text-[11px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                listing.status === 'OPEN'
                  ? 'bg-clinic-100 text-clinic-800 border border-clinic-300'
                  : listing.status === 'CLAIMED'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-purple-100 text-purple-900 border border-purple-300'
              }`}
            >
              {listing.status === 'OPEN' ? 'Listed (Open)' : `Claimed`}
            </span>
          ) : (
            <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Scheduled
            </span>
          )}
        </div>

        {/* Time and Duration */}
        <div className="space-y-1.5 mb-3.5">
          <div className="flex items-center space-x-2 text-slate-900 text-sm font-medium">
            <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>{formatTimeRange(shift.start, shift.end)}</span>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
              {formatDuration(shift.duration_hours)}
            </span>
          </div>

          {/* Overnight Pill */}
          {isOvernight && (
            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-medium">
              <Moon className="w-3 h-3 text-indigo-600" />
              <span>Crosses Midnight (Night Shift)</span>
            </div>
          )}
        </div>

        {/* Certification & Assigned To */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Certification Requirement */}
          <div className="flex items-center space-x-1.5">
            <Award className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Required:</span>
            {shift.required_certification ? (
              <span className="font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                {shift.required_certification}
              </span>
            ) : (
              <span className="text-slate-400 italic">None</span>
            )}
          </div>

          {/* Assigned Staff Member */}
          <div className="flex items-center space-x-1.5 text-slate-700">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Owner:</span>
            <span className={`font-semibold ${isOwner ? 'text-clinic-700' : 'text-slate-900'}`}>
              {isOwner ? 'You' : shift.assigned_to_name}
            </span>
          </div>
        </div>

        {/* Claimer Information if Claimed */}
        {listing?.status === 'CLAIMED' && listing.claimed_by && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <span className="font-medium">
              Claimed by: <strong>{isClaimedByMe ? 'You' : listing.claimed_by}</strong>
            </span>
            <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-200/60 px-1.5 py-0.5 rounded">
              Pending Approval
            </span>
          </div>
        )}

        {/* Real-Time Eligibility Display (for colleague open marketplace) */}
        {showMarketplaceView && shift.eligibility && (
          <div className="mt-3.5">
            <EligibilityBadge eligibility={shift.eligibility} />
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-2">
        {/* Owner Actions */}
        {currentUser?.role === 'STAFF' && isOwner && (
          <>
            {!listing && (
              <button
                onClick={() => handleAction(onPostSwap?.(shift.id))}
                disabled={isActing}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-clinic-600 hover:bg-clinic-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-clinic-500 disabled:opacity-50"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{isActing ? 'Posting...' : 'Post Swap'}</span>
              </button>
            )}

            {listing?.status === 'OPEN' && (
              <button
                onClick={() => handleAction(onWithdraw?.(listing.id))}
                disabled={isActing}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isActing ? 'Withdrawing...' : 'Withdraw Listing'}</span>
              </button>
            )}
          </>
        )}

        {/* Colleague Marketplace Actions */}
        {currentUser?.role === 'STAFF' && !isOwner && listing?.status === 'OPEN' && (
          <button
            onClick={() => handleAction(onClaim?.(listing.id))}
            disabled={isActing || !shift.eligibility?.eligible}
            className={`inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-colors focus:ring-2 disabled:cursor-not-allowed ${
              shift.eligibility?.eligible
                ? 'bg-clinic-600 hover:bg-clinic-700 text-white focus:ring-clinic-500'
                : 'bg-slate-200 text-slate-400 border border-slate-300'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>
              {isActing
                ? 'Claiming...'
                : shift.eligibility?.eligible
                ? 'Claim This Shift'
                : 'Ineligible to Claim'}
            </span>
          </button>
        )}

        {/* Claimer Actions (Unclaim) */}
        {currentUser?.role === 'STAFF' && isClaimedByMe && listing?.status === 'CLAIMED' && (
          <button
            onClick={() => handleAction(onUnclaim?.(listing.id))}
            disabled={isActing}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>{isActing ? 'Unclaiming...' : 'Unclaim Shift'}</span>
          </button>
        )}

        {/* Manager Actions */}
        {currentUser?.role === 'MANAGER' && listing?.status === 'CLAIMED' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleAction(onReject?.(listing.id))}
              disabled={isActing}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>
            <button
              onClick={() => handleAction(onApprove?.(listing.id))}
              disabled={isActing}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Approve Swap</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
