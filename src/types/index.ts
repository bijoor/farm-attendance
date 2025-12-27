// Worker types
export interface Worker {
  id: string;
  name: string;           // English name
  marathiName?: string;   // Marathi name (मराठी नाव)
  dailyRate: number;
  status: 'active' | 'inactive';
  joinedDate?: string;
  notes?: string;
}

// Area types
export interface Area {
  id: string;
  code: string;           // English short code (e.g., "A1")
  marathiCode?: string;   // Marathi short code (e.g., "अ१")
  name: string;           // English name
  marathiName?: string;   // Marathi name
  description?: string;
}

// Activity types
export interface Activity {
  id: string;
  code: string;           // English short code (e.g., "WD")
  marathiCode?: string;   // Marathi short code (e.g., "नि")
  name: string;           // English name
  marathiName?: string;   // Marathi name
  category?: string;
}

// Group types (master data for reusable groups)
export interface Group {
  id: string;
  name: string;           // English name (e.g., "Team A", "Spraying Team")
  marathiName?: string;   // Marathi name (e.g., "गट अ")
  status: 'active' | 'inactive';
  order?: number;         // Display order (lower numbers appear first)
}

// Attendance types
export type AttendanceStatus = 'P' | 'A' | 'H' | ''; // Present, Absent, Half-day, Empty

export interface DayAttendance {
  [workerId: string]: AttendanceStatus;
}

// Day entry within an activity group
export interface GroupDayEntry {
  date: string; // "2024-12-15"
  activityCode?: string;
  areaCode?: string;
  attendance: DayAttendance;
}

// Activity group at month level - each group has its own attendance matrix
export interface MonthActivityGroup {
  id: string;
  groupId: string;        // Reference to master Group
  name?: string;          // Legacy: inline name (deprecated, use groupId)
  workerIds?: string[];   // Workers in this group (if undefined, all month workers)
  days: GroupDayEntry[];
}

// Legacy DayEntry for backward compatibility
export interface LegacyDayEntry {
  date: string;
  areaCode?: string;
  activityCode?: string;
  attendance: DayAttendance;
}

export interface MonthData {
  month: string; // "2024-12"
  // New: Activity groups at month level
  groups?: MonthActivityGroup[];
  // Workers included in this month's sheet (if undefined, all active workers)
  workerIds?: string[];
  // Legacy: days array (for backward compatibility, migrated to groups on load)
  days?: LegacyDayEntry[];
}

// App data structure
export interface AppData {
  workers: Worker[];
  areas: Area[];
  activities: Activity[];
  groups: Group[];
  months: MonthData[];
  exportedAt?: string;
  version?: string;
}

// Language support
export type Language = 'en' | 'mr';

export interface AppSettings {
  language: Language;
  lastBackup?: string;
}

// Report types
export interface WorkerMonthlyCost {
  workerId: string;
  workerName: string;
  dailyRate: number;
  daysWorked: number;
  halfDays: number;
  totalCost: number;
}

export interface MonthlyReport {
  month: string;
  workers: WorkerMonthlyCost[];
  totalCost: number;
  totalDays: number;
}

export interface ActivityReport {
  activityCode: string;
  activityName: string;
  totalCost: number;
  totalDays: number;
}

export interface AreaReport {
  areaCode: string;
  areaName: string;
  totalCost: number;
  totalDays: number;
}

export interface GroupReport {
  groupId: string;
  groupName: string;
  marathiName?: string;
  totalCost: number;
  totalDays: number;
}
