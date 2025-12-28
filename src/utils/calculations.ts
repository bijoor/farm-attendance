import type { AppData, MonthData, Worker, WorkerMonthlyCost, MonthlyReport, ActivityReport, AreaReport, GroupReport, GroupDayEntry } from '../types';
import { getDaysInMonth, parseISO, format } from 'date-fns';

// Helper to get all day entries from a month (supports both legacy and groups format)
const getAllDaysFromMonth = (monthData: MonthData): GroupDayEntry[] => {
  // New format: groups with days
  if (monthData.groups && monthData.groups.length > 0) {
    return monthData.groups.flatMap(g => g.days || []);
  }
  // Legacy format: days array
  if (monthData.days && monthData.days.length > 0) {
    return monthData.days;
  }
  return [];
};

export const calculateWorkerMonthlyCost = (
  worker: Worker,
  monthData: MonthData | undefined
): WorkerMonthlyCost => {
  let daysWorked = 0;
  let halfDays = 0;

  if (monthData) {
    const allDays = getAllDaysFromMonth(monthData);
    allDays.forEach(day => {
      const status = day.attendance[worker.id];
      if (status === 'P') {
        daysWorked++;
      } else if (status === 'H') {
        halfDays++;
      }
    });
  }

  const totalCost = (daysWorked * worker.dailyRate) + (halfDays * worker.dailyRate * 0.5);

  return {
    workerId: worker.id,
    workerName: worker.name,
    dailyRate: worker.dailyRate,
    daysWorked,
    halfDays,
    totalCost,
  };
};

export const calculateMonthlyReport = (
  workers: Worker[],
  monthData: MonthData | undefined
): MonthlyReport => {
  const workerCosts = workers
    .filter(w => w.status === 'active')
    .map(worker => calculateWorkerMonthlyCost(worker, monthData));

  const totalCost = workerCosts.reduce((sum, wc) => sum + wc.totalCost, 0);
  const totalDays = workerCosts.reduce((sum, wc) => sum + wc.daysWorked + (wc.halfDays * 0.5), 0);

  return {
    month: monthData?.month || '',
    workers: workerCosts,
    totalCost,
    totalDays,
  };
};

export const calculateCostByActivity = (
  data: AppData,
  startMonth: string,
  endMonth: string
): ActivityReport[] => {
  const activityCosts: { [code: string]: { totalCost: number; totalDays: number } } = {};

  // Initialize all activities
  data.activities.forEach(act => {
    activityCosts[act.code] = { totalCost: 0, totalDays: 0 };
  });

  // Filter months in range
  const monthsInRange = data.months.filter(m => m.month >= startMonth && m.month <= endMonth);

  monthsInRange.forEach(monthData => {
    const allDays = getAllDaysFromMonth(monthData);
    allDays.forEach(day => {
      if (day.activityCode && activityCosts[day.activityCode]) {
        // Count workers present on this day
        let dayTotal = 0;
        let dayCount = 0;

        Object.entries(day.attendance).forEach(([workerId, status]) => {
          const worker = data.workers.find(w => w.id === workerId);
          if (worker) {
            if (status === 'P') {
              dayTotal += worker.dailyRate;
              dayCount += 1;
            } else if (status === 'H') {
              dayTotal += worker.dailyRate * 0.5;
              dayCount += 0.5;
            }
          }
        });

        activityCosts[day.activityCode].totalCost += dayTotal;
        activityCosts[day.activityCode].totalDays += dayCount;
      }
    });
  });

  return data.activities.map(act => ({
    activityCode: act.code,
    activityName: act.name,
    totalCost: activityCosts[act.code]?.totalCost || 0,
    totalDays: activityCosts[act.code]?.totalDays || 0,
  }));
};

export const calculateCostByArea = (
  data: AppData,
  startMonth: string,
  endMonth: string
): AreaReport[] => {
  const areaCosts: { [code: string]: { totalCost: number; totalDays: number } } = {};

  // Initialize all areas
  data.areas.forEach(area => {
    areaCosts[area.code] = { totalCost: 0, totalDays: 0 };
  });

  // Filter months in range
  const monthsInRange = data.months.filter(m => m.month >= startMonth && m.month <= endMonth);

  monthsInRange.forEach(monthData => {
    const allDays = getAllDaysFromMonth(monthData);
    allDays.forEach(day => {
      if (day.areaCode && areaCosts[day.areaCode]) {
        let dayTotal = 0;
        let dayCount = 0;

        Object.entries(day.attendance).forEach(([workerId, status]) => {
          const worker = data.workers.find(w => w.id === workerId);
          if (worker) {
            if (status === 'P') {
              dayTotal += worker.dailyRate;
              dayCount += 1;
            } else if (status === 'H') {
              dayTotal += worker.dailyRate * 0.5;
              dayCount += 0.5;
            }
          }
        });

        areaCosts[day.areaCode].totalCost += dayTotal;
        areaCosts[day.areaCode].totalDays += dayCount;
      }
    });
  });

  return data.areas.map(area => ({
    areaCode: area.code,
    areaName: area.name,
    totalCost: areaCosts[area.code]?.totalCost || 0,
    totalDays: areaCosts[area.code]?.totalDays || 0,
  }));
};

export const calculateCostByWorkerForPeriod = (
  data: AppData,
  startMonth: string,
  endMonth: string
): WorkerMonthlyCost[] => {
  const monthsInRange = data.months.filter(m => m.month >= startMonth && m.month <= endMonth);

  return data.workers
    .filter(w => w.status === 'active')
    .map(worker => {
      let totalDaysWorked = 0;
      let totalHalfDays = 0;

      monthsInRange.forEach(monthData => {
        const allDays = getAllDaysFromMonth(monthData);
        allDays.forEach(day => {
          const status = day.attendance[worker.id];
          if (status === 'P') {
            totalDaysWorked++;
          } else if (status === 'H') {
            totalHalfDays++;
          }
        });
      });

      const totalCost = (totalDaysWorked * worker.dailyRate) + (totalHalfDays * worker.dailyRate * 0.5);

      return {
        workerId: worker.id,
        workerName: worker.name,
        dailyRate: worker.dailyRate,
        daysWorked: totalDaysWorked,
        halfDays: totalHalfDays,
        totalCost,
      };
    });
};

export const calculateCostByGroup = (
  data: AppData,
  startMonth: string,
  endMonth: string
): GroupReport[] => {
  const groupCosts: { [groupId: string]: { totalCost: number; totalDays: number } } = {};

  // Initialize all groups
  (data.groups || []).forEach(group => {
    groupCosts[group.id] = { totalCost: 0, totalDays: 0 };
  });

  // Filter months in range
  const monthsInRange = data.months.filter(m => m.month >= startMonth && m.month <= endMonth);

  monthsInRange.forEach(monthData => {
    // Process each group in the month
    if (monthData.groups) {
      monthData.groups.forEach(monthGroup => {
        const groupId = monthGroup.groupId;
        if (!groupId || !groupCosts[groupId]) return;

        // Sum up attendance for this group
        (monthGroup.days || []).forEach(day => {
          Object.entries(day.attendance).forEach(([workerId, status]) => {
            const worker = data.workers.find(w => w.id === workerId);
            if (worker) {
              if (status === 'P') {
                groupCosts[groupId].totalCost += worker.dailyRate;
                groupCosts[groupId].totalDays += 1;
              } else if (status === 'H') {
                groupCosts[groupId].totalCost += worker.dailyRate * 0.5;
                groupCosts[groupId].totalDays += 0.5;
              }
            }
          });
        });
      });
    }
  });

  // Sort by group order
  return (data.groups || [])
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(group => ({
      groupId: group.id,
      groupName: group.name,
      marathiName: group.marathiName,
      totalCost: groupCosts[group.id]?.totalCost || 0,
      totalDays: groupCosts[group.id]?.totalDays || 0,
    }));
};

export const calculateCostByGroupForMonth = (
  data: AppData,
  month: string
): GroupReport[] => {
  return calculateCostByGroup(data, month, month);
};

// Detailed worker costs within a group for a specific month
export interface GroupWorkerCost {
  workerId: string;
  workerName: string;
  marathiName?: string;
  dailyRate: number;
  daysWorked: number;
  halfDays: number;
  totalDays: number;  // daysWorked + halfDays * 0.5
  totalCost: number;
}

export interface GroupLabourCost {
  groupId: string;
  groupName: string;
  marathiName?: string;
  workers: GroupWorkerCost[];
  totalDays: number;
  totalCost: number;
}

export const calculateLabourCostByGroup = (
  data: AppData,
  month: string
): GroupLabourCost[] => {
  const monthData = data.months.find(m => m.month === month);
  if (!monthData || !monthData.groups) {
    return [];
  }

  const result: GroupLabourCost[] = [];

  // Process each group in the month
  monthData.groups.forEach(monthGroup => {
    const masterGroup = (data.groups || []).find(g => g.id === monthGroup.groupId && !g.deleted);
    if (!masterGroup) return;

    // Collect all unique worker IDs from attendance records in this group
    const workerIdsWithAttendance = new Set<string>();
    (monthGroup.days || []).forEach(day => {
      Object.keys(day.attendance || {}).forEach(workerId => {
        const status = day.attendance[workerId];
        if (status === 'P' || status === 'H') {
          workerIdsWithAttendance.add(workerId);
        }
      });
    });

    // Calculate cost for each worker with attendance
    const workerCosts: GroupWorkerCost[] = [];

    workerIdsWithAttendance.forEach(workerId => {
      const worker = data.workers.find(w => w.id === workerId);
      if (!worker) return;

      let daysWorked = 0;
      let halfDays = 0;

      // Count attendance for this worker in this group's days
      (monthGroup.days || []).forEach(day => {
        const status = day.attendance[workerId];
        if (status === 'P') {
          daysWorked++;
        } else if (status === 'H') {
          halfDays++;
        }
      });

      const totalDays = daysWorked + (halfDays * 0.5);
      const totalCost = (daysWorked * worker.dailyRate) + (halfDays * worker.dailyRate * 0.5);

      workerCosts.push({
        workerId: worker.id,
        workerName: worker.name,
        marathiName: worker.marathiName,
        dailyRate: worker.dailyRate,
        daysWorked,
        halfDays,
        totalDays,
        totalCost,
      });
    });

    // Sort workers by name
    workerCosts.sort((a, b) => a.workerName.localeCompare(b.workerName));

    const groupTotalDays = workerCosts.reduce((sum, w) => sum + w.totalDays, 0);
    const groupTotalCost = workerCosts.reduce((sum, w) => sum + w.totalCost, 0);

    // Only include groups with some attendance
    if (workerCosts.length > 0) {
      result.push({
        groupId: masterGroup.id,
        groupName: masterGroup.name,
        marathiName: masterGroup.marathiName,
        workers: workerCosts,
        totalDays: groupTotalDays,
        totalCost: groupTotalCost,
      });
    }
  });

  // Sort by group order
  result.sort((a, b) => {
    const groupA = (data.groups || []).find(g => g.id === a.groupId);
    const groupB = (data.groups || []).find(g => g.id === b.groupId);
    return (groupA?.order ?? 0) - (groupB?.order ?? 0);
  });

  return result;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const getMonthYearFromString = (monthStr: string): { year: number; month: number } => {
  const [year, month] = monthStr.split('-').map(Number);
  return { year, month };
};

export const formatMonthYear = (monthStr: string): string => {
  const date = parseISO(`${monthStr}-01`);
  return format(date, 'MMMM yyyy');
};

export const getDaysArrayForMonth = (monthStr: string): number[] => {
  const { year, month } = getMonthYearFromString(monthStr);
  const daysCount = getDaysInMonth(new Date(year, month - 1));
  return Array.from({ length: daysCount }, (_, i) => i + 1);
};
