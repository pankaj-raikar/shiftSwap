import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { resetDatabase } from '../api/client';
import {
  Users,
  ShieldAlert,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  X,
  Stethoscope,
  ChevronDown,
  Calendar,
  History,
  Briefcase
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefreshData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onRefreshData }) => {
  const { currentUser, staffList, setCurrentUser, alert, clearAlert, showAlert } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetData = async () => {
    if (!window.confirm('Reset database to pristine seed data? All custom swaps will be reloaded.')) {
      return;
    }
    setIsResetting(true);
    try {
      await resetDatabase();
      showAlert({
        type: 'success',
        title: 'Database Reset',
        message: 'Loaded pristine clinic roster and initial seed state successfully.',
      });
      onRefreshData();
    } catch (err) {
      showAlert({
        type: 'error',
        title: 'Reset Failed',
        message: 'Failed to reset database.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* Top Clinic Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Clinic Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-clinic-600 text-white p-2 rounded-xl shadow-sm flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl text-slate-900 tracking-tight">ShiftSwap</span>
                <span className="bg-clinic-100 text-clinic-800 text-xs px-2 py-0.5 rounded-full font-medium border border-clinic-200">
                  CityCare Clinic
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Shift Swapping & Labour Rule Compliance System
              </p>
            </div>
          </div>

          {/* Persona Switcher & Admin Actions */}
          <div className="flex items-center space-x-3">
            {/* Reset to Seed Button */}
            <button
              onClick={handleResetData}
              disabled={isResetting}
              title="Reset database to seed data"
              className="inline-flex items-center px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-lg text-slate-600 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none"
            >
              <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Reset Seed</span>
            </button>

            {/* Persona Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-3 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all text-left focus:outline-none focus:ring-2 focus:ring-clinic-500"
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-semibold text-sm">
                  {currentUser?.name.charAt(0) || '?'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-semibold text-slate-900">{currentUser?.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                        currentUser?.role === 'MANAGER'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {currentUser?.role}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate max-w-[180px]">
                    {currentUser?.role === 'MANAGER' ? (
                      <span className="text-purple-600 font-medium">Full Manager Approver</span>
                    ) : currentUser?.certifications && currentUser.certifications.length > 0 ? (
                      `Certs: ${currentUser.certifications.join(', ')}`
                    ) : (
                      'No Certifications'
                    )}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Switch Acting Persona
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Select any staff member or clinic manager
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto py-1 divide-y divide-slate-50">
                    {staffList.map((staff) => {
                      const isSelected = staff.id === currentUser?.id;
                      return (
                        <button
                          key={staff.id}
                          onClick={() => {
                            setCurrentUser(staff);
                            setDropdownOpen(false);
                            // If switching to manager while on staff tab or vice versa, adjust active tab
                            if (staff.role === 'MANAGER' && activeTab === 'staff') {
                              setActiveTab('manager');
                            } else if (staff.role === 'STAFF' && activeTab === 'manager') {
                              setActiveTab('staff');
                            }
                          }}
                          className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-clinic-50/70' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                staff.role === 'MANAGER'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-clinic-100 text-clinic-700'
                              }`}
                            >
                              {staff.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className={`text-sm font-medium ${isSelected ? 'text-clinic-900 font-semibold' : 'text-slate-800'}`}>
                                  {staff.name}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                    staff.role === 'MANAGER'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {staff.role}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {staff.role === 'MANAGER'
                                  ? 'Clinic Approver'
                                  : staff.certifications.length > 0
                                  ? staff.certifications.join(', ')
                                  : 'General Staff'}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-clinic-600"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-t border-slate-100 pt-2 pb-2">
          {currentUser?.role === 'STAFF' && (
            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'staff'
                  ? 'bg-clinic-50 text-clinic-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Staff Marketplace & Shifts</span>
            </button>
          )}

          {currentUser?.role === 'MANAGER' && (
            <button
              onClick={() => setActiveTab('manager')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'manager'
                  ? 'bg-purple-50 text-purple-700 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Manager Approvals Queue</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'roster'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Clinic Weekly Roster</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-slate-100 text-slate-900 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Action History & Audit</span>
          </button>
        </div>
      </div>

      {/* Global Alert / Refusal Banner */}
      {alert && (
        <div
          className={`border-t px-4 py-3 sm:px-6 animate-in slide-in-from-top-2 duration-150 ${
            alert.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : alert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="max-w-7xl mx-auto flex items-start justify-between">
            <div className="flex items-start space-x-3">
              {alert.type === 'error' ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
              ) : alert.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <Users className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <h4 className="text-sm font-semibold">{alert.title}</h4>
                {alert.message && <p className="text-sm mt-0.5">{alert.message}</p>}
                {alert.violations && alert.violations.length > 0 && (
                  <ul className="mt-2 space-y-1 list-disc list-inside text-xs font-medium">
                    {alert.violations.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <button
              onClick={clearAlert}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
