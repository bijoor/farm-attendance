import React, { createContext, useContext, type ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { AppData, AppSettings, Worker, Area, Activity, MonthData, MonthActivityGroup, GroupDayEntry, AttendanceStatus, Language } from '../types';
import { initialAppData } from '../data/sampleData';
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

  // Month & Group operations
  getMonthData: (month: string) => MonthData | undefined;
  getMonthGroups: (month: string) => MonthActivityGroup[];
  updateMonthWorkers: (month: string, workerIds: string[]) => void;
  addMonthGroup: (month: string, name?: string) => string; // Returns new group ID
  removeMonthGroup: (month: string, groupId: string) => void;
  updateGroupName: (month: string, groupId: string, name: string) => void;
  updateGroupWorkers: (month: string, groupId: string, workerIds: string[]) => void;

  // Attendance operations (within groups)
  updateGroupAttendance: (month: string, groupId: string, date: string, workerId: string, status: AttendanceStatus) => void;
  updateGroupDayActivity: (month: string, groupId: string, date: string, activityCode?: string, areaCode?: string) => void;
  getWorkerDayTotal: (month: string, date: string, workerId: string) => number; // Returns 0, 0.5, or 1

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
      workers: prev.workers.filter(w => w.id !== id),
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
      areas: prev.areas.filter(a => a.id !== id),
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
      activities: prev.activities.filter(a => a.id !== id),
    }));
  };

  // Helper to migrate legacy data to new group format
  const migrateMonthToGroups = (monthData: MonthData): MonthActivityGroup[] => {
    if (monthData.groups && monthData.groups.length > 0) {
      return monthData.groups;
    }
    // Migrate legacy days to a single default group
    if (monthData.days && monthData.days.length > 0) {
      const defaultGroup: MonthActivityGroup = {
        id: uuidv4(),
        name: 'Group 1',
        days: monthData.days.map(d => ({
          date: d.date,
          activityCode: d.activityCode,
          areaCode: d.areaCode,
          attendance: d.attendance,
        })),
      };
      return [defaultGroup];
    }
    // No data - return empty default group
    return [{
      id: uuidv4(),
      name: 'Group 1',
      days: [],
    }];
  };

  // Month & Group operations
  const getMonthData = (month: string): MonthData | undefined => {
    return data.months.find(m => m.month === month);
  };

  const getMonthGroups = (month: string): MonthActivityGroup[] => {
    const monthData = data.months.find(m => m.month === month);
    if (!monthData) {
      return [{
        id: uuidv4(),
        name: 'Group 1',
        days: [],
      }];
    }
    return migrateMonthToGroups(monthData);
  };

  const updateMonthWorkers = (month: string, workerIds: string[]) => {
    setData(prev => {
      const monthIndex = prev.months.findIndex(m => m.month === month);

      if (monthIndex === -1) {
        return {
          ...prev,
          months: [...prev.months, { month, workerIds, groups: [{ id: uuidv4(), name: 'Group 1', days: [] }] }],
        };
      }

      const newMonths = [...prev.months];
      newMonths[monthIndex] = { ...newMonths[monthIndex], workerIds };

      return { ...prev, months: newMonths };
    });
  };

  const addMonthGroup = (month: string, name?: string): string => {
    const newGroupId = uuidv4();
    const groupName = name || `Group ${getMonthGroups(month).length + 1}`;

    setData(prev => {
      const monthIndex = prev.months.findIndex(m => m.month === month);

      const newGroup: MonthActivityGroup = {
        id: newGroupId,
        name: groupName,
        days: [],
      };

      if (monthIndex === -1) {
        return {
          ...prev,
          months: [...prev.months, { month, groups: [{ id: uuidv4(), name: 'Group 1', days: [] }, newGroup] }],
        };
      }

      const existingMonth = prev.months[monthIndex];
      const existingGroups = migrateMonthToGroups(existingMonth);

      const newMonths = [...prev.months];
      newMonths[monthIndex] = {
        ...existingMonth,
        groups: [...existingGroups, newGroup],
        days: undefined, // Clear legacy days
      };

      return { ...prev, months: newMonths };
    });

    return newGroupId;
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

  const updateGroupName = (month: string, groupId: string, name: string) => {
    setData(prev => {
      const monthIndex = prev.months.findIndex(m => m.month === month);
      if (monthIndex === -1) return prev;

      const existingMonth = prev.months[monthIndex];
      const existingGroups = migrateMonthToGroups(existingMonth);

      const newGroups = existingGroups.map(g =>
        g.id === groupId ? { ...g, name } : g
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
  const updateGroupAttendance = (month: string, groupId: string, date: string, workerId: string, status: AttendanceStatus) => {
    setData(prev => {
      const monthIndex = prev.months.findIndex(m => m.month === month);

      if (monthIndex === -1) {
        // Create new month with default group
        const newGroup: MonthActivityGroup = {
          id: groupId,
          name: 'Group 1',
          days: [{ date, attendance: { [workerId]: status } }],
        };
        return {
          ...prev,
          months: [...prev.months, { month, groups: [newGroup] }],
        };
      }

      const existingMonth = prev.months[monthIndex];
      const existingGroups = migrateMonthToGroups(existingMonth);

      const newGroups = existingGroups.map(g => {
        if (g.id !== groupId) return g;

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

  const updateGroupDayActivity = (month: string, groupId: string, date: string, activityCode?: string, areaCode?: string) => {
    setData(prev => {
      const monthIndex = prev.months.findIndex(m => m.month === month);

      if (monthIndex === -1) {
        const newGroup: MonthActivityGroup = {
          id: groupId,
          name: 'Group 1',
          days: [{ date, activityCode, areaCode, attendance: {} }],
        };
        return {
          ...prev,
          months: [...prev.months, { month, groups: [newGroup] }],
        };
      }

      const existingMonth = prev.months[monthIndex];
      const existingGroups = migrateMonthToGroups(existingMonth);

      const newGroups = existingGroups.map(g => {
        if (g.id !== groupId) return g;

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
    getMonthData,
    getMonthGroups,
    updateMonthWorkers,
    addMonthGroup,
    removeMonthGroup,
    updateGroupName,
    updateGroupWorkers,
    updateGroupAttendance,
    updateGroupDayActivity,
    getWorkerDayTotal,
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
