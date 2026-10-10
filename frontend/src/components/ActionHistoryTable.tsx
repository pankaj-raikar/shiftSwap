import React, { useState } from 'react';
import type { ActionHistoryItem } from '../types';
import {
  History,
  CheckCircle,
  XCircle,
  Search,
} from 'lucide-react';

interface ActionHistoryTableProps {
  history: ActionHistoryItem[];
  onRefresh?: () => void;
}

export const ActionHistoryTable: React.FC<ActionHistoryTableProps> = ({
  history,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('ALL');

  const filteredHistory = history.filter((item) => {
    if (actionFilter !== 'ALL' && item.action_type !== actionFilter) return false;
    if (outcomeFilter !== 'ALL' && item.outcome !== outcomeFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        item.actor_name.toLowerCase().includes(q) ||
        item.action_type.toLowerCase().includes(q) ||
        item.shift_id.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case 'POST':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'WITHDRAW':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'CLAIM':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'UNCLAIM':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'APPROVE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REJECT':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'SEED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-clinic-600" />
            <h3 className="text-base font-bold text-slate-900">Compliance Audit Log & Action History</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all swap postings, claims, approvals, and refusals.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search actions or staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-clinic-500"
            />
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-clinic-500"
          >
            <option value="ALL">All Actions</option>
            <option value="POST">POST</option>
            <option value="WITHDRAW">WITHDRAW</option>
            <option value="CLAIM">CLAIM</option>
            <option value="UNCLAIM">UNCLAIM</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
            <option value="SEED">SEED</option>
          </select>

          {/* Outcome Filter */}
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-clinic-500"
          >
            <option value="ALL">All Outcomes</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="REFUSED">REFUSED</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No action history records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Shift ID</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Details / Refusal Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((item) => {
                  const isSuccess = item.outcome === 'SUCCESS';
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !isSuccess ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                        {item.timestamp.replace('T', ' ')}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                        {item.actor_name}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadgeClass(
                            item.action_type
                          )}`}
                        >
                          {item.action_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {item.shift_id}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          <span>{item.outcome}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-md break-words">
                        <span className={!isSuccess ? 'text-rose-900 font-medium' : ''}>
                          {item.details}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
