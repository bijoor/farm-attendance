import type { AppData, MonthData, Worker, WorkerMonthlyCost, MonthlyReport, ActivityReport, AreaReport, GroupDayEntry } from '../types';
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
