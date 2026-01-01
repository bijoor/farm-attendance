/**
 * Multi-file P2P Sync Service
 *
 * Syncs data with a remote server using per-file sync for efficiency.
 * Each data type (workers, areas, activities, months) is synced separately.
 */

import type { AppData, Worker, Area, Activity, Group, MonthData, ExpenseCategory, SundryExpense, Payment } from '../types';

const SYNC_URL_KEY = 'graminno-sync-url';
const SYNC_STATUS_KEY = 'graminno-sync-status';

export interface SyncResult {
  success: boolean;
  message: string;
  data?: AppData;
  timestamp?: string;
}

export interface FileSyncStatus {
  lastModified: string | null;  // Local modification time
  lastSynced: string | null;    // Last successful sync time
  dirty: boolean;               // Has unsaved changes
}

export interface SyncStatus {
  workers: FileSyncStatus;
  areas: FileSyncStatus;
  activities: FileSyncStatus;
  groups: FileSyncStatus;
  expenseCategories: FileSyncStatus;
  expenses: FileSyncStatus;
  payments: FileSyncStatus;
  months: { [month: string]: FileSyncStatus };
  lastFullSync: string | null;
}

const defaultFileSyncStatus: FileSyncStatus = {
  lastModified: null,
  lastSynced: null,
  dirty: false,
};

const defaultSyncStatus: SyncStatus = {
  workers: { ...defaultFileSyncStatus },
  areas: { ...defaultFileSyncStatus },
  activities: { ...defaultFileSyncStatus },
  groups: { ...defaultFileSyncStatus },
  expenseCategories: { ...defaultFileSyncStatus },
  expenses: { ...defaultFileSyncStatus },
  payments: { ...defaultFileSyncStatus },
  months: {},
  lastFullSync: null,
};

// ============ Sync Status Management ============

export function getSyncStatus(): SyncStatus {
  try {
    const stored = localStorage.getItem(SYNC_STATUS_KEY);
    if (stored) {
      return { ...defaultSyncStatus, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore parse errors
  }
  return { ...defaultSyncStatus };
}

export function saveSyncStatus(status: SyncStatus): void {
  localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
}

export function markFileDirty(fileType: 'workers' | 'areas' | 'activities' | 'groups' | 'expenseCategories' | 'expenses' | 'payments', status?: SyncStatus): SyncStatus {
  const current = status || getSyncStatus();
  current[fileType] = {
    ...current[fileType],
    lastModified: new Date().toISOString(),
    dirty: true,
  };
  saveSyncStatus(current);
  return current;
}

export function markMonthDirty(month: string, status?: SyncStatus): SyncStatus {
  const current = status || getSyncStatus();
  current.months[month] = {
    lastModified: new Date().toISOString(),
    lastSynced: current.months[month]?.lastSynced || null,
    dirty: true,
  };
  saveSyncStatus(current);
  return current;
}

export function markFileSynced(fileType: 'workers' | 'areas' | 'activities' | 'groups' | 'expenseCategories' | 'expenses' | 'payments', status?: SyncStatus): SyncStatus {
  const current = status || getSyncStatus();
  const now = new Date().toISOString();
  current[fileType] = {
    ...current[fileType],
    lastSynced: now,
    dirty: false,
  };
  saveSyncStatus(current);
  return current;
}

export function markMonthSynced(month: string, status?: SyncStatus): SyncStatus {
  const current = status || getSyncStatus();
  const now = new Date().toISOString();
  current.months[month] = {
    ...current.months[month],
    lastSynced: now,
    dirty: false,
  };
  saveSyncStatus(current);
  return current;
}

export function hasDirtyFiles(): boolean {
  const status = getSyncStatus();
  if (status.workers.dirty || status.areas.dirty || status.activities.dirty || status.groups.dirty ||
      status.expenseCategories.dirty || status.expenses.dirty || status.payments.dirty) {
    return true;
  }
  for (const month of Object.values(status.months)) {
    if (month.dirty) return true;
  }
  return false;
}

export function clearAllDirtyFlags(): void {
  const status = getSyncStatus();
  const now = new Date().toISOString();
  status.workers = { ...status.workers, dirty: false, lastSynced: now };
  status.areas = { ...status.areas, dirty: false, lastSynced: now };
  status.activities = { ...status.activities, dirty: false, lastSynced: now };
  status.groups = { ...status.groups, dirty: false, lastSynced: now };
  status.expenseCategories = { ...status.expenseCategories, dirty: false, lastSynced: now };
  status.expenses = { ...status.expenses, dirty: false, lastSynced: now };
  status.payments = { ...status.payments, dirty: false, lastSynced: now };
  status.lastFullSync = now;
  for (const month of Object.keys(status.months)) {
    status.months[month] = { ...status.months[month], dirty: false, lastSynced: now };
  }
  saveSyncStatus(status);
}

export function getDirtyFiles(): string[] {
  const status = getSyncStatus();
  const dirty: string[] = [];
  if (status.workers.dirty) dirty.push('workers');
  if (status.areas.dirty) dirty.push('areas');
  if (status.activities.dirty) dirty.push('activities');
  if (status.groups.dirty) dirty.push('groups');
  if (status.expenseCategories.dirty) dirty.push('expenseCategories');
  if (status.expenses.dirty) dirty.push('expenses');
  if (status.payments.dirty) dirty.push('payments');
  for (const [month, monthStatus] of Object.entries(status.months)) {
    if (monthStatus.dirty) dirty.push(`months/${month}`);
  }
  return dirty;
}

// ============ URL Management ============

export function getSyncUrl(): string | null {
  return localStorage.getItem(SYNC_URL_KEY);
}

export function setSyncUrl(url: string | null): void {
  if (url) {
    const cleanUrl = url.replace(/\/+$/, '');
    localStorage.setItem(SYNC_URL_KEY, cleanUrl);
  } else {
    localStorage.removeItem(SYNC_URL_KEY);
  }
}

// ============ Server Communication ============

export async function checkServerStatus(url?: string): Promise<boolean> {
  const syncUrl = url || getSyncUrl();
  if (!syncUrl) return false;

  try {
    const response = await fetch(`${syncUrl}/api/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    const result = await response.json();
    return result.status === 'online';
  } catch (error) {
    console.error('Server status check failed:', error);
    return false;
  }
}

// ============ Per-File Sync Functions ============

async function syncFile<T>(
  fileType: 'workers' | 'areas' | 'activities' | 'groups' | 'expenseCategories' | 'expenses' | 'payments',
  localData: T[],
  onSuccess: (data: T[]) => void
): Promise<{ success: boolean; message: string }> {
  const syncUrl = getSyncUrl();
  if (!syncUrl) return { success: false, message: 'No sync URL' };

  try {
    // Push local data
    const response = await fetch(`${syncUrl}/api/data/${fileType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: localData }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();
    if (result.success && result.data?.items) {
      onSuccess(result.data.items);
      markFileSynced(fileType);
      return { success: true, message: `${fileType} synced` };
    }

    return { success: false, message: result.error || 'Sync failed' };
  } catch (error) {
    console.error(`[Sync] ${fileType} failed:`, error);
    return { success: false, message: error instanceof Error ? error.message : 'Sync failed' };
  }
}

async function syncMonth(
  month: string,
  monthData: MonthData,
  onSuccess: (data: MonthData) => void
): Promise<{ success: boolean; message: string }> {
  const syncUrl = getSyncUrl();
  if (!syncUrl) return { success: false, message: 'No sync URL' };

  try {
    const response = await fetch(`${syncUrl}/api/data/months/${month}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(monthData),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();
    if (result.success && result.data) {
      onSuccess(result.data);
      markMonthSynced(month);
      return { success: true, message: `Month ${month} synced` };
    }

    return { success: false, message: result.error || 'Sync failed' };
  } catch (error) {
    console.error(`[Sync] Month ${month} failed:`, error);
    return { success: false, message: error instanceof Error ? error.message : 'Sync failed' };
  }
}

// ============ Pull Functions ============

export async function pullFile<T>(
  fileType: 'workers' | 'areas' | 'activities' | 'groups' | 'expenseCategories' | 'expenses' | 'payments'
): Promise<{ success: boolean; data?: T[]; message: string }> {
  const syncUrl = getSyncUrl();
  if (!syncUrl) return { success: false, message: 'No sync URL' };

  try {
    const response = await fetch(`${syncUrl}/api/data/${fileType}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return { success: true, data: result.data?.items || [], message: 'OK' };
    }

    return { success: false, message: result.error || 'Pull failed' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Pull failed' };
  }
}

export async function pullMonth(month: string): Promise<{ success: boolean; data?: MonthData; message: string }> {
  const syncUrl = getSyncUrl();
  if (!syncUrl) return { success: false, message: 'No sync URL' };

  try {
    const response = await fetch(`${syncUrl}/api/data/months/${month}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return { success: true, data: result.data, message: 'OK' };
    }

    return { success: false, message: result.error || 'Pull failed' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Pull failed' };
  }
}

// ============ Smart Sync (only dirty files) ============

export interface SmartSyncCallbacks {
  onWorkersSync?: (workers: Worker[]) => void;
  onAreasSync?: (areas: Area[]) => void;
  onActivitiesSync?: (activities: Activity[]) => void;
  onGroupsSync?: (groups: Group[]) => void;
  onExpenseCategoriesSync?: (categories: ExpenseCategory[]) => void;
  onExpensesSync?: (expenses: SundryExpense[]) => void;
  onPaymentsSync?: (payments: Payment[]) => void;
  onMonthSync?: (month: string, data: MonthData) => void;
  onProgress?: (message: string) => void;
}

export async function syncDirtyFiles(
  data: AppData,
  callbacks: SmartSyncCallbacks = {}
): Promise<{ success: boolean; syncedFiles: string[]; failedFiles: string[] }> {
  const syncUrl = getSyncUrl();
  if (!syncUrl) return { success: false, syncedFiles: [], failedFiles: ['No sync URL'] };

  const status = getSyncStatus();
  const syncedFiles: string[] = [];
  const failedFiles: string[] = [];

  // Sync workers if dirty
  if (status.workers.dirty) {
    callbacks.onProgress?.('Syncing workers...');
    const result = await syncFile('workers', data.workers, (synced) => {
      callbacks.onWorkersSync?.(synced);
    });
    if (result.success) {
      syncedFiles.push('workers');
    } else {
      failedFiles.push('workers');
    }
  }

  // Sync areas if dirty
  if (status.areas.dirty) {
    callbacks.onProgress?.('Syncing areas...');
    const result = await syncFile('areas', data.areas, (synced) => {
      callbacks.onAreasSync?.(synced);
    });
    if (result.success) {
      syncedFiles.push('areas');
    } else {
      failedFiles.push('areas');
    }
  }

  // Sync activities if dirty
  if (status.activities.dirty) {
    callbacks.onProgress?.('Syncing activities...');
    const result = await syncFile('activities', data.activities, (synced) => {
      callbacks.onActivitiesSync?.(synced);
    });
    if (result.success) {
      syncedFiles.push('activities');
    } else {
      failedFiles.push('activities');
    }
  }

  // Sync groups if dirty
  if (status.groups.dirty) {
    callbacks.onProgress?.('Syncing groups...');
    const result = await syncFile('groups', data.groups || [], (synced) => {
      callbacks.onGroupsSync?.(synced);
    });
    if (result.success) {
      syncedFiles.push('groups');
    } else {
      failedFiles.push('groups');
    }
  }

  // Sync expense categories if dirty
  if (status.expenseCategories.dirty) {
    callbacks.onProgress?.('Syncing expense categories...');
    const result = await syncFile('expenseCategories', data.expenseCategories || [], (synced) => {
      callbacks.onExpenseCategoriesSync?.(synced);
    });
    if (result.success) {
      syncedFiles.push('expenseCategories');
    } else {
      failedFiles.push('expenseCategories');
    }
  }

  // Sync expenses if dirty
  if (status.expenses.dirty) {
    callbacks.onProgress?.('Syncing expenses...');
    const result = await syncFile('expenses', data.expenses || [], (synced) => {
      callbacks.onExpensesSync?.(synced);
    });
    if (result.success) {
      syncedFiles.push('expenses');
    } else {
      failedFiles.push('expenses');
    }
  }

  // Sync payments if dirty
  if (status.payments.dirty) {
    callbacks.onProgress?.('Syncing payments...');
    const result = await syncFile('payments', data.payments || [], (synced) => {
      callbacks.onPaymentsSync?.(synced);
    });
    if (result.success) {
      syncedFiles.push('payments');
    } else {
      failedFiles.push('payments');
    }
  }

  // Sync dirty months
  for (const [month, monthStatus] of Object.entries(status.months)) {
    if (monthStatus.dirty) {
      const monthData = data.months.find(m => m.month === month);
      if (monthData) {
        callbacks.onProgress?.(`Syncing ${month}...`);
        const result = await syncMonth(month, monthData, (synced) => {
          callbacks.onMonthSync?.(month, synced);
        });
        if (result.success) {
          syncedFiles.push(`months/${month}`);
        } else {
          failedFiles.push(`months/${month}`);
        }
      }
    }
  }

  return {
    success: failedFiles.length === 0,
    syncedFiles,
    failedFiles,
  };
}

// ============ Full Sync (for initial load) ============

export async function pullData(): Promise<SyncResult> {
  const syncUrl = getSyncUrl();
  if (!syncUrl) {
    return { success: false, message: 'No sync URL configured' };
  }

  try {
    const response = await fetch(`${syncUrl}/api/data`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.data) {
      // Mark all files as synced
      const status = getSyncStatus();
      const now = new Date().toISOString();
      status.workers = { lastModified: null, lastSynced: now, dirty: false };
      status.areas = { lastModified: null, lastSynced: now, dirty: false };
      status.activities = { lastModified: null, lastSynced: now, dirty: false };
      status.groups = { lastModified: null, lastSynced: now, dirty: false };
      status.expenseCategories = { lastModified: null, lastSynced: now, dirty: false };
      status.expenses = { lastModified: null, lastSynced: now, dirty: false };
      status.payments = { lastModified: null, lastSynced: now, dirty: false };
      status.lastFullSync = now;

      // Mark all months as synced
      for (const month of result.data.months || []) {
        if (month.month) {
          status.months[month.month] = { lastModified: null, lastSynced: now, dirty: false };
        }
      }
      saveSyncStatus(status);

      return {
        success: true,
        message: 'Data pulled successfully',
        data: result.data,
        timestamp: result.timestamp,
      };
    }

    return {
      success: true,
      message: 'No data on server yet',
      data: undefined,
    };
  } catch (error) {
    console.error('Pull failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Pull failed',
    };
  }
}

export async function pushData(data: AppData): Promise<SyncResult> {
  const syncUrl = getSyncUrl();
  if (!syncUrl) {
    return { success: false, message: 'No sync URL configured' };
  }

  try {
    const response = await fetch(`${syncUrl}/api/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      // Mark all files as synced
      const status = getSyncStatus();
      const now = new Date().toISOString();
      status.workers = { lastModified: null, lastSynced: now, dirty: false };
      status.areas = { lastModified: null, lastSynced: now, dirty: false };
      status.activities = { lastModified: null, lastSynced: now, dirty: false };
      status.groups = { lastModified: null, lastSynced: now, dirty: false };
      status.expenseCategories = { lastModified: null, lastSynced: now, dirty: false };
      status.expenses = { lastModified: null, lastSynced: now, dirty: false };
      status.payments = { lastModified: null, lastSynced: now, dirty: false };
      status.lastFullSync = now;

      // Mark all months as synced
      for (const month of data.months || []) {
        if (month.month) {
          status.months[month.month] = { lastModified: null, lastSynced: now, dirty: false };
        }
      }
      saveSyncStatus(status);

      return {
        success: true,
        message: result.message || 'Data pushed successfully',
        data: result.data,
        timestamp: result.timestamp,
      };
    }

    return {
      success: false,
      message: result.error || 'Push failed',
    };
  } catch (error) {
    console.error('Push failed:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Push failed',
    };
  }
}

export async function syncData(localData: AppData): Promise<SyncResult> {
  const pushResult = await pushData(localData);

  if (pushResult.success && pushResult.data) {
    return {
      success: true,
      message: 'Sync completed successfully',
      data: pushResult.data,
      timestamp: pushResult.timestamp,
    };
  }

  return pushResult;
}

// ============ Utilities ============

export function getLastSync(): string | null {
  const status = getSyncStatus();
  return status.lastFullSync;
}

export function formatLastSync(isoString: string | null, isMarathi: boolean): string {
  if (!isoString) {
    return isMarathi ? 'कधीही नाही' : 'Never';
  }

  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return isMarathi ? 'आत्ताच' : 'Just now';
  } else if (diffMins < 60) {
    return isMarathi ? `${diffMins} मिनिटे पूर्वी` : `${diffMins} min ago`;
  } else if (diffHours < 24) {
    return isMarathi ? `${diffHours} तास पूर्वी` : `${diffHours} hours ago`;
  } else {
    return isMarathi ? `${diffDays} दिवस पूर्वी` : `${diffDays} days ago`;
  }
}
