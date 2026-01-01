import React, { createContext, useContext, type ReactNode, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { AppData, AppSettings, Worker, Area, Activity, Group, MonthData, MonthActivityGroup, GroupDayEntry, AttendanceStatus, Language, ExpenseCategory, SundryExpense, Payment } from '../types';
import { sampleExpenseCategories } from '../data/sampleData';
import { initialAppData, sampleGroups } from '../data/sampleData';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
  // Data
  data: AppData;
  settings: AppSettings;

  // Worker operations
  addWorker: (worker: Omit<Worker, 'id'>) => void;
  updateWorker: (id: string, worker: Partial<Worker>) => void;
  deleteWorker: (id: string) => void;

  // Area operations
  addArea: (area: Omit<Area, 'id'>) => void;
  updateArea: (id: string, area: Partial<Area>) => void;
  deleteArea: (id: string) => void;

  // Activity operations
  addActivity: (activity: Omit<Activity, 'id'>) => void;
  updateActivity: (id: string, activity: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;

  // Group operations (master data)
  addGroup: (group: Omit<Group, 'id'>) => void;
  updateGroup: (id: string, group: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  getGroupById: (id: string) => Group | undefined;
  reorderGroup: (id: string, direction: 'up' | 'down') => void;

  // Month & Group operations
  getMonthData: (month: string) => MonthData | undefined;
  getMonthGroups: (month: string) => MonthActivityGroup[];
  updateMonthWorkers: (month: string, workerIds: string[]) => void;
  addMonthGroup: (month: string, groupId: string) => string; // Returns new month-group instance ID
  removeMonthGroup: (month: string, monthGroupId: string) => void;
  updateGroupWorkers: (month: string, groupId: string, workerIds: string[]) => void;

  // Attendance operations (within groups)
  updateGroupAttendance: (month: string, groupId: string, date: string, workerId: string, status: AttendanceStatus) => void;
  updateGroupDayActivity: (month: string, groupId: string, date: string, activityCode?: string, areaCode?: string) => void;
  getWorkerDayTotal: (month: string, date: string, workerId: string) => number; // Returns 0, 0.5, or 1

  // Expense Category operations
  addExpenseCategory: (category: Omit<ExpenseCategory, 'id'>) => void;
  updateExpenseCategory: (id: string, category: Partial<ExpenseCategory>) => void;
  deleteExpenseCategory: (id: string) => void;

  // Expense operations
  addExpense: (expense: Omit<SundryExpense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, expense: Partial<SundryExpense>) => void;
  deleteExpense: (id: string) => void;
  getExpensesByMonth: (month: string) => SundryExpense[];
  getExpensesByGroup: (groupId: string, month?: string) => SundryExpense[];

  // Payment operations
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => void;
  updatePayment: (id: string, payment: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  getPaymentsByMonth: (month: string) => Payment[];
  getPaymentsByGroup: (groupId: string, month?: string) => Payment[];

  // Settings
  setLanguage: (language: Language) => void;

  // Data management
  exportData: () => string;
  importData: (jsonString: string) => boolean;
  resetData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useLocalStorage<AppData>('graminno-attendance-data', initialAppData);
  const [settings, setSettings] = useLocalStorage<AppSettings>('graminno-attendance-settings', {
    language: 'en',
  });

  // Migration: Ensure data has groups array (for existing users upgrading)
  useEffect(() => {
    if (!data.groups) {
      setData(prev => ({
        ...prev,
        groups: sampleGroups,
      }));
    } else {
      // Migration: Ensure all groups have order values
      const groupsNeedOrder = data.groups.some(g => g.order === undefined);
      if (groupsNeedOrder) {
        setData(prev => ({
          ...prev,
          groups: (prev.groups || []).map((g, index) => ({
            ...g,
            order: g.order ?? (index + 1),
          })),
        }));
      }
    }
  }, [data.groups, setData]);

  // Migration: Ensure data has accounting arrays (for existing users upgrading)
  useEffect(() => {
    const needsMigration = !data.expenseCategories || !data.expenses || !data.payments;
    if (needsMigration) {
      setData(prev => ({
        ...prev,
        expenseCategories: prev.expenseCategories || sampleExpenseCategories,
        expenses: prev.expenses || [],
        payments: prev.payments || [],
      }));
    }
  }, [data.expenseCategories, data.expenses, data.payments, setData]);

  // Worker operations
  const addWorker = (worker: Omit<Worker, 'id'>) => {
    const newWorker: Worker = { ...worker, id: uuidv4() };
    setData(prev => ({ ...prev, workers: [...prev.workers, newWorker] }));
  };

  const updateWorker = (id: string, workerUpdate: Partial<Worker>) => {
    setData(prev => ({
      ...prev,
      workers: prev.workers.map(w => (w.id === id ? { ...w, ...workerUpdate } : w)),
    }));
  };

  const deleteWorker = (id: string) => {
    setData(prev => ({
      ...prev,
      workers: prev.workers.map(w =>
        w.id === id ? { ...w, deleted: true, deletedAt: new Date().toISOString() } : w
      ),
    }));
  };

  // Area operations
  const addArea = (area: Omit<Area, 'id'>) => {
    const newArea: Area = { ...area, id: uuidv4() };
    setData(prev => ({ ...prev, areas: [...prev.areas, newArea] }));
  };

  const updateArea = (id: string, areaUpdate: Partial<Area>) => {
    setData(prev => ({
      ...prev,
      areas: prev.areas.map(a => (a.id === id ? { ...a, ...areaUpdate } : a)),
    }));
  };

  const deleteArea = (id: string) => {
    setData(prev => ({
      ...prev,
      areas: prev.areas.map(a =>
        a.id === id ? { ...a, deleted: true, deletedAt: new Date().toISOString() } : a
      ),
    }));
  };

  // Activity operations
  const addActivity = (activity: Omit<Activity, 'id'>) => {
    const newActivity: Activity = { ...activity, id: uuidv4() };
    setData(prev => ({ ...prev, activities: [...prev.activities, newActivity] }));
  };

  const updateActivity = (id: string, activityUpdate: Partial<Activity>) => {
    setData(prev => ({
      ...prev,
      activities: prev.activities.map(a => (a.id === id ? { ...a, ...activityUpdate } : a)),
    }));
  };

  const deleteActivity = (id: string) => {
    setData(prev => ({
      ...prev,
      activities: prev.activities.map(a =>
        a.id === id ? { ...a, deleted: true, deletedAt: new Date().toISOString() } : a
      ),
    }));
  };

  // Group operations (master data)
  const addGroup = (group: Omit<Group, 'id'>) => {
    setData(prev => {
      const existingGroups = prev.groups || [];
      // Auto-assign order: max existing order + 1
      const maxOrder = existingGroups.reduce((max, g) => Math.max(max, g.order ?? 0), 0);
      const newGroup: Group = { ...group, id: uuidv4(), order: maxOrder + 1 };
      return { ...prev, groups: [...existingGroups, newGroup] };
    });
  };

  const updateGroup = (id: string, groupUpdate: Partial<Group>) => {
    setData(prev => ({
      ...prev,
      groups: (prev.groups || []).map(g => (g.id === id ? { ...g, ...groupUpdate } : g)),
    }));
  };

  const deleteGroup = (id: string) => {
    // Soft delete for sync compatibility
    setData(prev => ({
      ...prev,
      groups: (prev.groups || []).map(g =>
        g.id === id ? { ...g, deleted: true, deletedAt: new Date().toISOString() } : g
      ),
    }));
  };

  const getGroupById = (id: string): Group | undefined => {
    return (data.groups || []).find(g => g.id === id);
  };

  const reorderGroup = (id: string, direction: 'up' | 'down') => {
    setData(prev => {
      const groups = [...(prev.groups || [])];
      // Sort by order to get current positions
      const sortedGroups = groups.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const currentIndex = sortedGroups.findIndex(g => g.id === id);

      if (currentIndex === -1) return prev;

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= sortedGroups.length) return prev;

      // Swap order values
      const currentGroup = sortedGroups[currentIndex];
      const targetGroup = sortedGroups[targetIndex];
      const currentOrder = currentGroup.order ?? currentIndex;
      const targetOrder = targetGroup.order ?? targetIndex;

      const updatedGroups = groups.map(g => {
        if (g.id === currentGroup.id) return { ...g, order: targetOrder };
        if (g.id === targetGroup.id) return { ...g, order: currentOrder };
        return g;
      });

      return { ...prev, groups: updatedGroups };
    });
  };

  // Expense Category operations
  const addExpenseCategory = (category: Omit<ExpenseCategory, 'id'>) => {
    const newCategory: ExpenseCategory = { ...category, id: uuidv4() };
    setData(prev => ({
      ...prev,
      expenseCategories: [...(prev.expenseCategories || []), newCategory],
    }));
  };

  const updateExpenseCategory = (id: string, categoryUpdate: Partial<ExpenseCategory>) => {
    setData(prev => ({
      ...prev,
      expenseCategories: (prev.expenseCategories || []).map(c =>
        c.id === id ? { ...c, ...categoryUpdate } : c
      ),
    }));
  };

  const deleteExpenseCategory = (id: string) => {
    // Soft delete for sync compatibility
    setData(prev => ({
      ...prev,
      expenseCategories: (prev.expenseCategories || []).map(c =>
        c.id === id ? { ...c, deleted: true, deletedAt: new Date().toISOString() } : c
      ),
    }));
  };

  // Expense operations
  const addExpense = (expense: Omit<SundryExpense, 'id' | 'createdAt'>) => {
    const newExpense: SundryExpense = {
      ...expense,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      expenses: [...(prev.expenses || []), newExpense],
    }));
  };

  const updateExpense = (id: string, expenseUpdate: Partial<SundryExpense>) => {
    setData(prev => ({
      ...prev,
      expenses: (prev.expenses || []).map(e =>
        e.id === id ? { ...e, ...expenseUpdate, modifiedAt: new Date().toISOString() } : e
      ),
    }));
  };

  const deleteExpense = (id: string) => {
    // Soft delete for sync compatibility
    setData(prev => ({
      ...prev,
      expenses: (prev.expenses || []).map(e =>
        e.id === id ? { ...e, deleted: true, deletedAt: new Date().toISOString() } : e
      ),
    }));
  };

  const getExpensesByMonth = (month: string): SundryExpense[] => {
    return (data.expenses || []).filter(e => e.month === month && !e.deleted);
  };

  const getExpensesByGroup = (groupId: string, month?: string): SundryExpense[] => {
    return (data.expenses || []).filter(e => {
      if (e.deleted) return false;
      if (month && e.month !== month) return false;
      // Check direct group assignment
      if (e.groupId === groupId) return true;
      // Check shared expense allocations
      if (e.isShared && e.allocations) {
        return e.allocations.some(a => a.groupId === groupId);
      }
      return false;
    });
  };

  // Payment operations
  const addPayment = (payment: Omit<Payment, 'id' | 'createdAt'>) => {
    const newPayment: Payment = {
      ...payment,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      payments: [...(prev.payments || []), newPayment],
    }));
  };

  const updatePayment = (id: string, paymentUpdate: Partial<Payment>) => {
    setData(prev => ({
      ...prev,
      payments: (prev.payments || []).map(p =>
        p.id === id ? { ...p, ...paymentUpdate, modifiedAt: new Date().toISOString() } : p
      ),
    }));
  };

  const deletePayment = (id: string) => {
    // Soft delete for sync compatibility
    setData(prev => ({
      ...prev,
      payments: (prev.payments || []).map(p =>
        p.id === id ? { ...p, deleted: true, deletedAt: new Date().toISOString() } : p
      ),
    }));
  };

  const getPaymentsByMonth = (month: string): Payment[] => {
    return (data.payments || []).filter(p => p.month === month && !p.deleted);
  };

  const getPaymentsByGroup = (groupId: string, month?: string): Payment[] => {
    return (data.payments || []).filter(p => {
      if (p.deleted) return false;
      if (month && p.month !== month) return false;
      return p.groupId === groupId;
    });
  };

  // Helper to get groups for a month (handles legacy data)
  const migrateMonthToGroups = (monthData: MonthData): MonthActivityGroup[] => {
    if (monthData.groups && monthData.groups.length > 0) {
      return monthData.groups;
    }
    // Legacy days format - return empty (will be handled by migration)
    return [];
  };

  // Month & Group operations
  const getMonthData = (month: string): MonthData | undefined => {
    return data.months.find(m => m.month === month);
  };

  const getMonthGroups = (month: string): MonthActivityGroup[] => {
    const monthData = data.months.find(m => m.month === month);
    if (!monthData) {
      return [];
    }
    return migrateMonthToGroups(monthData);
  };

  const updateMonthWorkers = (month: string, workerIds: string[]) => {
    setData(prev => {
      const monthIndex = prev.months.findIndex(m => m.month === month);

      if (monthIndex === -1) {
        return {
          ...prev,
          months: [...prev.months, { month, workerIds, groups: [] }],
        };
      }

      const newMonths = [...prev.months];
      newMonths[monthIndex] = { ...newMonths[monthIndex], workerIds };

      return { ...prev, months: newMonths };
    });
  };

  // Add a master group to a month's attendance
  const addMonthGroup = (month: string, groupId: string): string => {
    const newMonthGroupId = uuidv4();

    setData(prev => {
      const monthIndex = prev.months.findIndex(m => m.month === month);

      const newMonthGroup: MonthActivityGroup = {
        id: newMonthGroupId,
        groupId: groupId,
        days: [],
      };

      if (monthIndex === -1) {
        return {
          ...prev,
          months: [...prev.months, { month, groups: [newMonthGroup] }],
        };
      }

      const existingMonth = prev.months[monthIndex];
      const existingGroups = migrateMonthToGroups(existingMonth);

      const newMonths = [...prev.months];
      newMonths[monthIndex] = {
        ...existingMonth,
        groups: [...existingGroups, newMonthGroup],
        days: undefined, // Clear legacy days
      };

      return { ...prev, months: newMonths };
    });

    return newMonthGroupId;
  };

  const removeMonthGroup = (month: string, groupId: string) => {
    setData(prev => {
      const monthIndex = prev.months.findIndex(m => m.month === month);
      if (monthIndex === -1) return prev;

      const existingMonth = prev.months[monthIndex];
      const existingGroups = migrateMonthToGroups(existingMonth);

      // Don't remove if it's the last group
      if (existingGroups.length <= 1) return prev;

      const newGroups = existingGroups.filter(g => g.id !== groupId);

      const newMonths = [...prev.months];
      newMonths[monthIndex] = {
        ...existingMonth,
        groups: newGroups,
        days: undefined,
      };

      return { ...prev, months: newMonths };
    });
  };

  const updateGroupWorkers = (month: string, groupId: string, workerIds: string[]) => {
    setData(prev => {
      const monthIndex = prev.months.findIndex(m => m.month === month);
      if (monthIndex === -1) return prev;

      const existingMonth = prev.months[monthIndex];
      const existingGroups = migrateMonthToGroups(existingMonth);

      const newGroups = existingGroups.map(g =>
        g.id === groupId ? { ...g, workerIds } : g
      );

      const newMonths = [...prev.months];
      newMonths[monthIndex] = {
        ...existingMonth,
        groups: newGroups,
        days: undefined,
      };

      return { ...prev, months: newMonths };
    });
  };

  // Attendance operations (within groups)
  // Note: monthGroupId refers to MonthActivityGroup.id (the instance in a month), not the master Group.id
  const updateGroupAttendance = (month: string, monthGroupId: string, date: string, workerId: string, status: AttendanceStatus) => {
    setData(prev => {
      const monthIndex = prev.months.findIndex(m => m.month === month);
      if (monthIndex === -1) return prev; // Month must exist with groups

      const existingMonth = prev.months[monthIndex];
      const existingGroups = migrateMonthToGroups(existingMonth);

      const newGroups = existingGroups.map(g => {
        if (g.id !== monthGroupId) return g;

        const dayIndex = g.days.findIndex(d => d.date === date);
        let newDays: GroupDayEntry[];

        if (dayIndex === -1) {
          newDays = [...g.days, { date, attendance: { [workerId]: status } }];
        } else {
          newDays = g.days.map((d, i) =>
            i === dayIndex
              ? { ...d, attendance: { ...d.attendance, [workerId]: status } }
              : d
          );
        }

        return { ...g, days: newDays };
      });

      const newMonths = [...prev.months];
      newMonths[monthIndex] = {
        ...existingMonth,
        groups: newGroups,
        days: undefined,
      };

      return { ...prev, months: newMonths };
    });
  };

  const updateGroupDayActivity = (month: string, monthGroupId: string, date: string, activityCode?: string, areaCode?: string) => {
    setData(prev => {
      const monthIndex = prev.months.findIndex(m => m.month === month);
      if (monthIndex === -1) return prev; // Month must exist with groups

      const existingMonth = prev.months[monthIndex];
      const existingGroups = migrateMonthToGroups(existingMonth);

      const newGroups = existingGroups.map(g => {
        if (g.id !== monthGroupId) return g;

        const dayIndex = g.days.findIndex(d => d.date === date);
        let newDays: GroupDayEntry[];

        if (dayIndex === -1) {
          newDays = [...g.days, { date, activityCode, areaCode, attendance: {} }];
        } else {
          newDays = g.days.map((d, i) =>
            i === dayIndex ? { ...d, activityCode, areaCode } : d
          );
        }

        return { ...g, days: newDays };
      });

      const newMonths = [...prev.months];
      newMonths[monthIndex] = {
        ...existingMonth,
        groups: newGroups,
        days: undefined,
      };

      return { ...prev, months: newMonths };
    });
  };

  const getWorkerDayTotal = (month: string, date: string, workerId: string): number => {
    const groups = getMonthGroups(month);
    let total = 0;

    for (const group of groups) {
      const dayEntry = group.days.find(d => d.date === date);
      if (dayEntry?.attendance[workerId]) {
        const status = dayEntry.attendance[workerId];
        if (status === 'P') total += 1;
        else if (status === 'H') total += 0.5;
      }
    }

    return total;
  };

  // Settings
  const setLanguage = (language: Language) => {
    setSettings(prev => ({ ...prev, language }));
  };

  // Data management
  const exportData = (): string => {
    const exportPayload: AppData = {
      ...data,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(exportPayload, null, 2);
  };

  const importData = (jsonString: string): boolean => {
    try {
      const imported = JSON.parse(jsonString) as AppData;

      // Validate basic structure
      if (!imported.workers || !imported.areas || !imported.activities) {
        throw new Error('Invalid data structure');
      }

      setData(imported);
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  };

  const resetData = () => {
    setData(initialAppData);
  };

  const value: AppContextType = {
    data,
    settings,
    addWorker,
    updateWorker,
    deleteWorker,
    addArea,
    updateArea,
    deleteArea,
    addActivity,
    updateActivity,
    deleteActivity,
    addGroup,
    updateGroup,
    deleteGroup,
    getGroupById,
    reorderGroup,
    getMonthData,
    getMonthGroups,
    updateMonthWorkers,
    addMonthGroup,
    removeMonthGroup,
    updateGroupWorkers,
    updateGroupAttendance,
    updateGroupDayActivity,
    getWorkerDayTotal,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpensesByMonth,
    getExpensesByGroup,
    addPayment,
    updatePayment,
    deletePayment,
    getPaymentsByMonth,
    getPaymentsByGroup,
    setLanguage,
    exportData,
    importData,
    resetData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
