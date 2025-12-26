import { useEffect, useRef, useCallback } from 'react';
import {
  getSyncUrl,
  syncDirtyFiles,
  hasDirtyFiles,
  markFileDirty,
  markMonthDirty,
  getDirtyFiles,
} from '../utils/sync';
import type { AppData } from '../types';

const DEBOUNCE_MS = 2000; // Wait 2 seconds after last change before saving

// Re-export for convenience
export { hasDirtyFiles, getDirtyFiles, markFileDirty, markMonthDirty };

export function useAutoSync(data: AppData, enabled: boolean = true) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  // Track previous data to detect changes
  const prevWorkersRef = useRef<string>('');
  const prevAreasRef = useRef<string>('');
  const prevActivitiesRef = useRef<string>('');
  const prevMonthsRef = useRef<{ [key: string]: string }>({});

  const saveToServer = useCallback(async (dataToSave: AppData) => {
    const syncUrl = getSyncUrl();
    if (!syncUrl || isSavingRef.current) return;

    // Check if there are dirty files to sync
    if (!hasDirtyFiles()) {
      console.log('[AutoSync] No dirty files to sync');
      return;
    }

    isSavingRef.current = true;
    try {
      const result = await syncDirtyFiles(dataToSave, {
        onProgress: (msg) => console.log('[AutoSync]', msg),
      });

      if (result.success) {
        console.log('[AutoSync] Synced files:', result.syncedFiles);
      } else {
        console.error('[AutoSync] Failed files:', result.failedFiles);
      }
    } catch (error) {
      console.error('[AutoSync] Error:', error);
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const syncUrl = getSyncUrl();
    if (!syncUrl) return;

    // Detect which files have changed
    const workersStr = JSON.stringify(data.workers);
    const areasStr = JSON.stringify(data.areas);
    const activitiesStr = JSON.stringify(data.activities);

    let hasChanges = false;

    // Check workers
    if (workersStr !== prevWorkersRef.current && prevWorkersRef.current !== '') {
      markFileDirty('workers');
      hasChanges = true;
    }
    prevWorkersRef.current = workersStr;

    // Check areas
    if (areasStr !== prevAreasRef.current && prevAreasRef.current !== '') {
      markFileDirty('areas');
      hasChanges = true;
    }
    prevAreasRef.current = areasStr;

    // Check activities
    if (activitiesStr !== prevActivitiesRef.current && prevActivitiesRef.current !== '') {
      markFileDirty('activities');
      hasChanges = true;
    }
    prevActivitiesRef.current = activitiesStr;

    // Check each month
    for (const month of data.months) {
      if (!month.month) continue;
      const monthStr = JSON.stringify(month);
      if (monthStr !== prevMonthsRef.current[month.month] && prevMonthsRef.current[month.month] !== undefined) {
        markMonthDirty(month.month);
        hasChanges = true;
      }
      prevMonthsRef.current[month.month] = monthStr;
    }

    // If no changes detected, skip
    if (!hasChanges) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new debounced save
    timeoutRef.current = setTimeout(() => {
      saveToServer(data);
    }, DEBOUNCE_MS);

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, saveToServer]);

  // Force save function for manual triggering
  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    saveToServer(data);
  }, [data, saveToServer]);

  return { forceSave, hasDirtyFiles };
}
