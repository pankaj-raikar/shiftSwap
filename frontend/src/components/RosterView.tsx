import React, { useState } from 'react';
import type { ShiftWithListing } from '../types';
import { useUser } from '../context/UserContext';
import { formatDate, formatTimeRange, formatDuration, isCrossMidnight } from '../utils/date';
import { Calendar as CalendarIcon, Clock, User, Moon } from 'lucide-react';

interface RosterViewProps {
  shifts: ShiftWithListing[];
}

export const RosterView: React.FC<RosterViewProps> = ({ shifts }) => {
  const { staffList, currentUser } = useUser();
  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');

  // Filter staff
  const staffMembers = staffList.filter((s) => s.role === 'STAFF');

  const filteredShifts = shifts.filter((s) => {
    if (selectedStaffId !== 'ALL' && s.assigned_to !== selectedStaffId) return false;
    return true;
  });

  // Group shifts by date
  const groupedByDate: { [dateStr: string]: ShiftWithListing[] } = {};
  for (const s of filteredShifts) {
    const [date] = s.start.split('T');
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(s);
  }

  // Sort dates
  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <div className="space-y-6">
      {/* Header and Staff Filter */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-clinic-600" />
            <h3 className="text-base font-bold text-slate-900">Clinic Weekly Roster & Schedule</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Full view of clinic staffing coverage across days and shifts.
          </p>
        </div>

        {/* Staff Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-slate-500">Filter Staff:</span>
          <select
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            className="text-xs py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-clinic-500"
          >
            <option value="ALL">All Staff ({staffMembers.length})</option>
            {staffMembers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.certifications.join(', ') || 'No Certs'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Roster Timeline / Date Cards */}
      <div className="space-y-6">
        {sortedDates.map((dateStr) => {
          const dayShifts = groupedByDate[dateStr];
          const formattedDate = formatDate(dayShifts[0].start);

          return (
            <div key={dateStr} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">{formattedDate}</span>
                <span className="text-xs bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                  {dayShifts.length} {dayShifts.length === 1 ? 'Shift' : 'Shifts'}
                </span>
              </div>

              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dayShifts.map((shift) => {
                  const isOwner = currentUser?.id === shift.assigned_to;
                  const isOvernight = isCrossMidnight(shift.start, shift.end);
                  const listing = shift.listing;

                  return (
                    <div
                      key={shift.id}
                      className={`p-3.5 rounded-lg border text-xs transition-all ${
                        isOwner
                          ? 'bg-clinic-50/50 border-clinic-300 ring-1 ring-clinic-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-slate-700">{shift.id}</span>
                        {listing ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              listing.status === 'OPEN'
                                ? 'bg-clinic-100 text-clinic-800 border border-clinic-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {listing.status === 'OPEN' ? 'Listed (Open)' : 'Claimed'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-semibold">
                            Scheduled
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 text-slate-800 font-medium">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatTimeRange(shift.start, shift.end)}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold">
                            {formatDuration(shift.duration_hours)}
                          </span>
                        </div>

                        {isOvernight && (
                          <div className="flex items-center space-x-1 text-indigo-700 text-[11px]">
                            <Moon className="w-3 h-3" />
                            <span>Overnight Shift</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-slate-600">
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className={isOwner ? 'font-bold text-clinic-700' : 'font-semibold'}>
                            {shift.assigned_to_name}
                          </span>
                        </div>

                        {shift.required_certification && (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-200">
                            {shift.required_certification}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
