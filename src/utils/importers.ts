import * as XLSX from 'xlsx';
import type { Worker, Area, Activity, AppData } from '../types';

export const importWorkersFromExcel = (file: File): Promise<Omit<Worker, 'id'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        // Skip header row
        const workers: Omit<Worker, 'id'>[] = jsonData.slice(1)
          .filter(row => row[1]) // Must have a name
          .map(row => ({
            name: String(row[1] || ''),
            dailyRate: Number(row[2]) || 300,
            status: (String(row[3] || 'active').toLowerCase() === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
            joinedDate: row[4] ? String(row[4]) : undefined,
            notes: row[5] ? String(row[5]) : undefined,
          }));

        resolve(workers);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const importAreasFromExcel = (file: File): Promise<Omit<Area, 'id'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        const areas: Omit<Area, 'id'>[] = jsonData.slice(1)
          .filter(row => row[1]) // Must have a code
          .map(row => ({
            code: String(row[1] || ''),
            name: String(row[2] || ''),
            description: row[3] ? String(row[3]) : undefined,
          }));

        resolve(areas);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const importActivitiesFromExcel = (file: File): Promise<Omit<Activity, 'id'>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

        const activities: Omit<Activity, 'id'>[] = jsonData.slice(1)
          .filter(row => row[1]) // Must have a code
          .map(row => ({
            code: String(row[1] || ''),
            name: String(row[2] || ''),
            hindiName: row[3] ? String(row[3]) : undefined,
            category: row[4] ? String(row[4]) : undefined,
          }));

        resolve(activities);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

export const importAppDataFromJson = (file: File): Promise<AppData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const data = JSON.parse(jsonString) as AppData;

        // Validate structure
        if (!data.workers || !data.areas || !data.activities) {
          throw new Error('Invalid data structure');
        }

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
