import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Staff } from '../types';
import { fetchStaff } from '../api/client';

interface AlertNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  violations?: string[];
}

interface UserContextType {
  currentUser: Staff | null;
  staffList: Staff[];
  setCurrentUser: (user: Staff) => void;
  isLoading: boolean;
  refreshStaff: () => Promise<void>;
  alert: AlertNotification | null;
  showAlert: (alert: Omit<AlertNotification, 'id'>) => void;
  clearAlert: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Staff | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [alert, setAlert] = useState<AlertNotification | null>(null);

  const refreshStaff = async () => {
    try {
      const data = await fetchStaff();
      setStaffList(data);
      if (!currentUser && data.length > 0) {
        // Default to first staff member (Alice)
        const defaultStaff = data.find(s => s.role === 'STAFF') || data[0];
        setCurrentUser(defaultStaff);
      } else if (currentUser) {
        // Update current user data in case certifications or role changed
        const updated = data.find(s => s.id === currentUser.id);
        if (updated) setCurrentUser(updated);
      }
    } catch (err) {
      console.error('Error fetching staff list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStaff();
  }, []);

  const showAlert = (newAlert: Omit<AlertNotification, 'id'>) => {
    setAlert({ ...newAlert, id: Math.random().toString() });
  };

  const clearAlert = () => {
    setAlert(null);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        staffList,
        setCurrentUser,
        isLoading,
        refreshStaff,
        alert,
        showAlert,
        clearAlert,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
