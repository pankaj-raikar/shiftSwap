import React, { useState, useEffect, useCallback } from 'react';
import { useUser, UserProvider } from './context/UserContext';
import type { ShiftWithListing, ActionHistoryItem } from './types';
import {
  fetchShifts,
  fetchHistory,
  postListing,
  withdrawListing,
  claimListing,
  unclaimListing,
  approveListing,
  rejectListing,
} from './api/client';
import { Navbar } from './components/Navbar';
import { StaffDashboard } from './components/StaffDashboard';
import { ManagerDashboard } from './components/ManagerDashboard';
import { ActionHistoryTable } from './components/ActionHistoryTable';
import { RosterView } from './components/RosterView';
import { Loader2 } from 'lucide-react';

const ShiftSwapMain: React.FC = () => {
  const { currentUser, showAlert, refreshStaff } = useUser();
  const [activeTab, setActiveTab] = useState<string>('staff');
  const [shifts, setShifts] = useState<ShiftWithListing[]>([]);
  const [history, setHistory] = useState<ActionHistoryItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Synchronize tab if user role changes
  useEffect(() => {
    if (currentUser?.role === 'MANAGER' && activeTab === 'staff') {
      setActiveTab('manager');
    } else if (currentUser?.role === 'STAFF' && activeTab === 'manager') {
      setActiveTab('staff');
    }
  }, [currentUser?.role]);

  // Load shifts and action history
  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [shiftsData, historyData] = await Promise.all([
        fetchShifts(currentUser?.id),
        fetchHistory(),
      ]);
      setShifts(shiftsData);
      setHistory(historyData);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setLoadingData(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Post Swap
  const handlePostSwap = async (shiftId: string) => {
    if (!currentUser) return;
    try {
      await postListing(currentUser.id, shiftId);
      showAlert({
        type: 'success',
        title: 'Shift Listed on Marketplace',
        message: `Shift ${shiftId} is now available for colleagues to claim.`,
      });
      await loadData();
    } catch (err: any) {
      const detail = err?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || 'Failed to post shift';
      const violations = detail?.violations?.map((v: any) => v.message) || [];
      showAlert({
        type: 'error',
        title: 'Unable to Post Shift',
        message,
        violations,
      });
      await loadData();
    }
  };

  // Handle Withdraw Listing
  const handleWithdraw = async (listingId: string) => {
    if (!currentUser) return;
    try {
      await withdrawListing(listingId, currentUser.id);
      showAlert({
        type: 'info',
        title: 'Listing Withdrawn',
        message: 'Your shift swap listing was withdrawn and returned to regular schedule.',
      });
      await loadData();
    } catch (err: any) {
      const detail = err?.detail;
      showAlert({
        type: 'error',
        title: 'Unable to Withdraw Listing',
        message: typeof detail === 'string' ? detail : detail?.message || 'Failed to withdraw listing',
      });
      await loadData();
    }
  };

  // Handle Claim Shift
  const handleClaim = async (listingId: string) => {
    if (!currentUser) return;
    try {
      await claimListing(listingId, currentUser.id);
      showAlert({
        type: 'success',
        title: 'Shift Claim Submitted!',
        message: 'Your claim has been submitted and is pending Manager approval.',
      });
      await loadData();
    } catch (err: any) {
      const detail = err?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || 'Claim refused';
      const violations = detail?.violations?.map((v: any) => v.message) || [];
      showAlert({
        type: 'error',
        title: 'Claim Refused by Compliance Engine',
        message,
        violations,
      });
      await loadData();
    }
  };

  // Handle Unclaim Shift
  const handleUnclaim = async (listingId: string) => {
    if (!currentUser) return;
    try {
      await unclaimListing(listingId, currentUser.id);
      showAlert({
        type: 'info',
        title: 'Claim Retracted',
        message: 'You have released your claim on this shift. It is now open on the marketplace again.',
      });
      await loadData();
    } catch (err: any) {
      const detail = err?.detail;
      showAlert({
        type: 'error',
        title: 'Unable to Unclaim Shift',
        message: typeof detail === 'string' ? detail : detail?.message || 'Failed to unclaim shift',
      });
      await loadData();
    }
  };

  // Handle Manager Approve
  const handleApprove = async (listingId: string) => {
    if (!currentUser) return;
    try {
      await approveListing(listingId, currentUser.id);
      showAlert({
        type: 'success',
        title: 'Shift Swap Approved & Reassigned!',
        message: 'Labour rules validated successfully. Shift has been reassigned to the claiming staff member.',
      });
      await refreshStaff();
      await loadData();
    } catch (err: any) {
      const detail = err?.detail;
      const message = typeof detail === 'string' ? detail : detail?.message || 'Approval refused';
      const violations = detail?.violations?.map((v: any) => v.message) || [];
      showAlert({
        type: 'error',
        title: 'Approval Refused: Labour Rule Violation',
        message: `${message}. The shift listing remains in CLAIMED status.`,
        violations,
      });
      await loadData();
    }
  };

  // Handle Manager Reject
  const handleReject = async (listingId: string) => {
    if (!currentUser) return;
    try {
      await rejectListing(listingId, currentUser.id);
      showAlert({
        type: 'info',
        title: 'Claim Rejected',
        message: 'The claim was rejected. Shift has returned to OPEN status on the marketplace.',
      });
      await loadData();
    } catch (err: any) {
      const detail = err?.detail;
      showAlert({
        type: 'error',
        title: 'Unable to Reject Claim',
        message: typeof detail === 'string' ? detail : detail?.message || 'Failed to reject claim',
      });
      await loadData();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefreshData={() => {
          refreshStaff();
          loadData();
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-clinic-600 mb-2" />
            <p className="text-xs font-medium">Loading clinic schedule and compliance engine...</p>
          </div>
        ) : (
          <>
            {activeTab === 'staff' && (
              <StaffDashboard
                shifts={shifts}
                onPostSwap={handlePostSwap}
                onWithdraw={handleWithdraw}
                onClaim={handleClaim}
                onUnclaim={handleUnclaim}
              />
            )}

            {activeTab === 'manager' && (
              <ManagerDashboard
                shifts={shifts}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            )}

            {activeTab === 'roster' && <RosterView shifts={shifts} />}

            {activeTab === 'history' && (
              <ActionHistoryTable history={history} onRefresh={loadData} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        <p>ShiftSwap Clinic Compliance System • Autonomous Labour Rules Enforcement (Rules 1–5)</p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <UserProvider>
      <ShiftSwapMain />
    </UserProvider>
  );
}
