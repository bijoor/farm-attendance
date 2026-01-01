// Worker types
export interface Worker {
  id: string;
  name: string;           // English name
  marathiName?: string;   // Marathi name (मराठी नाव)
  dailyRate: number;
  status: 'active' | 'inactive';
  joinedDate?: string;
  notes?: string;
  deleted?: boolean;      // Soft delete flag for sync
  deletedAt?: string;     // Timestamp of deletion for sync conflict resolution
}

// Area types
export interface Area {
  id: string;
  code: string;           // English short code (e.g., "A1")
  marathiCode?: string;   // Marathi short code (e.g., "अ१")
  name: string;           // English name
  marathiName?: string;   // Marathi name
  description?: string;
  groupId?: string;       // Reference to the group/farm this area belongs to
  deleted?: boolean;      // Soft delete flag for sync
  deletedAt?: string;     // Timestamp of deletion for sync conflict resolution
}

// Activity types
export interface Activity {
  id: string;
  code: string;           // English short code (e.g., "WD")
  marathiCode?: string;   // Marathi short code (e.g., "नि")
  name: string;           // English name
  marathiName?: string;   // Marathi name
  category?: string;
  deleted?: boolean;      // Soft delete flag for sync
  deletedAt?: string;     // Timestamp of deletion for sync conflict resolution
}

// Group types (master data for reusable groups)
export interface Group {
  id: string;
  name: string;           // English name (e.g., "Team A", "Spraying Team")
  marathiName?: string;   // Marathi name (e.g., "गट अ")
  status: 'active' | 'inactive';
  order?: number;         // Display order (lower numbers appear first)
  deleted?: boolean;      // Soft delete flag for sync
  deletedAt?: string;     // Timestamp of deletion for sync conflict resolution
}

// Expense Category (master data for categorizing sundry expenses)
export interface ExpenseCategory {
  id: string;
  code: string;           // Short code (e.g., "FEED", "FUEL")
  marathiCode?: string;
  name: string;           // English name
  marathiName?: string;
  status: 'active' | 'inactive';
  deleted?: boolean;
  deletedAt?: string;
}

// Allocation for shared expenses
export interface GroupAllocation {
  groupId: string;
  amount?: number;        // Fixed amount OR
  percentage?: number;    // Percentage (0-100)
}

// Sundry Expense Entry
export interface SundryExpense {
  id: string;
  date: string;           // "YYYY-MM-DD"
  month: string;          // "YYYY-MM" for grouping
  categoryId?: string;    // Reference to ExpenseCategory
  description: string;
  amount: number;
  // Group assignment
  groupId?: string;       // Primary group (for single-group expenses)
  isShared?: boolean;     // If true, use allocations
  allocations?: GroupAllocation[];  // For shared expenses
  // Metadata
  notes?: string;
  createdAt: string;
  modifiedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
}

// Payment Entry
export interface Payment {
  id: string;
  date: string;           // "YYYY-MM-DD"
  month: string;          // "YYYY-MM" for grouping
  amount: number;
  // What is this payment for?
  paymentFor: 'labour' | 'expense';
  groupId: string;        // Which group this payment is for
  expenseId?: string;     // If paymentFor='expense', link to specific expense
  // Metadata
  description?: string;
  notes?: string;
  createdAt: string;
  modifiedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
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
  // Accounting
  expenseCategories: ExpenseCategory[];
  expenses: SundryExpense[];
  payments: Payment[];
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
