import React, { useState } from 'react';
import type { EligibilityResult } from '../types';
import { CheckCircle2, AlertOctagon, ChevronDown, ChevronUp, Clock, Info } from 'lucide-react';

interface EligibilityBadgeProps {
  eligibility: EligibilityResult | null;
}

export const EligibilityBadge: React.FC<EligibilityBadgeProps> = ({
  eligibility,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!eligibility) {
    return null;
  }

  const { eligible, violations, weekly_hours_before, shift_hours, weekly_hours_after } = eligibility;

  return (
    <div className="w-full">
      {/* Badge Header / Clickable Toggle */}
      <div
        onClick={() => {
          if (!eligible) setIsExpanded(!isExpanded);
        }}
        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
          eligible
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : 'bg-rose-50 text-rose-800 border border-rose-200 cursor-pointer hover:bg-rose-100/70'
        }`}
      >
        <div className="flex items-center space-x-2">
          {eligible ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertOctagon className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>
            {eligible
              ? 'Eligible to Claim'
              : `Ineligible (${violations.length} Rule Violation${violations.length > 1 ? 's' : ''})`}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Hours pill */}
          <span className="text-[11px] font-normal text-slate-500 hidden sm:inline">
            Week: {weekly_hours_before}h + {shift_hours}h ={' '}
            <strong className={weekly_hours_after > 40 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
              {weekly_hours_after}h / 40h
            </strong>
          </span>

          {!eligible && (
            <button
              type="button"
              className="text-rose-700 hover:text-rose-900 focus:outline-none ml-1"
            >
              {isExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Violations Breakdown */}
      {!eligible && isExpanded && (
        <div className="mt-2 p-3 bg-white rounded-lg border border-rose-200 shadow-sm animate-in fade-in-50 duration-150">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-rose-900 mb-2">
            <Info className="w-3.5 h-3.5 text-rose-600" />
            <span>Compliance Refusal Reasons:</span>
          </div>

          <div className="space-y-2">
            {violations.map((v, index) => (
              <div
                key={index}
                className="p-2.5 bg-rose-50/50 rounded-md border border-rose-100 text-xs text-rose-900 flex items-start space-x-2"
              >
                <span className="bg-rose-200 text-rose-900 font-bold px-1.5 py-0.5 rounded text-[10px] mt-0.5">
                  {v.rule_number > 0 ? `Rule ${v.rule_number}` : 'Status'}
                </span>
                <div className="flex-1">
                  <div className="font-semibold text-rose-950">{v.rule_name}</div>
                  <p className="mt-0.5 text-rose-800 leading-relaxed font-normal">{v.message}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Hours Summary */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Weekly Cap Limit: 40.0h</span>
            </span>
            <span>
              Your week after swap:{' '}
              <strong className={weekly_hours_after > 40 ? 'text-rose-600 font-bold' : 'text-slate-800'}>
                {weekly_hours_after} hrs
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
