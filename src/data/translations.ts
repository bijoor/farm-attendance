import type { Language } from '../types';

type TranslationKey =
  | 'appName'
  | 'dashboard'
  | 'workers'
  | 'areas'
  | 'activities'
  | 'attendance'
  | 'reports'
  | 'settings'
  | 'print'
  | 'export'
  | 'import'
  | 'add'
  | 'edit'
  | 'delete'
  | 'save'
  | 'cancel'
  | 'search'
  | 'name'
  | 'code'
  | 'dailyRate'
  | 'status'
  | 'active'
  | 'inactive'
  | 'description'
  | 'category'
  | 'present'
  | 'absent'
  | 'halfDay'
  | 'daysWorked'
  | 'total'
  | 'totalDays'
  | 'month'
  | 'year'
  | 'selectMonth'
  | 'noData'
  | 'confirmDelete'
  | 'exportData'
  | 'importData'
  | 'shareWhatsApp'
  | 'downloadBackup'
  | 'costByWorker'
  | 'costByActivity'
  | 'costByArea'
  | 'costByGroup'
  | 'customPeriod'
  | 'from'
  | 'to'
  | 'generate'
  | 'printSheet'
  | 'language'
  | 'english'
  | 'marathi'
  | 'notes'
  | 'joinDate'
  | 'hindiName'
  | 'marathiName'
  | 'worker'
  | 'area'
  | 'activity'
  | 'group'
  | 'groups'
  | 'all'
  | 'totalCost'
  | 'summary'
  | 'actions'
  | 'signature'
  | 'sr'
  | 'day'
  | 'labourCost'
  | 'groupTotal'
  | 'expenses'
  | 'payments'
  | 'expenseCategories'
  | 'sundryExpenses'
  | 'paymentsMade'
  | 'balanceDue'
  | 'sharedExpense'
  | 'allocation'
  | 'addExpense'
  | 'addPayment'
  | 'date'
  | 'amount';

type Translations = {
  [key in Language]: {
    [k in TranslationKey]: string;
  };
};

export const translations: Translations = {
  en: {
    appName: 'Graminno Attendance',
    dashboard: 'Dashboard',
    workers: 'Workers',
    areas: 'Areas',
    activities: 'Activities',
    attendance: 'Attendance',
    reports: 'Reports',
    settings: 'Settings',
    print: 'Print',
    export: 'Export',
    import: 'Import',
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    name: 'Name',
    code: 'Code',
    dailyRate: 'Daily Rate (₹)',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    description: 'Description',
    category: 'Category',
    present: 'Present',
    absent: 'Absent',
    halfDay: 'Half Day',
    daysWorked: 'Days Worked',
    total: 'Total',
    month: 'Month',
    year: 'Year',
    selectMonth: 'Select Month',
    noData: 'No data available',
    confirmDelete: 'Are you sure you want to delete?',
    exportData: 'Export Data',
    importData: 'Import Data',
    shareWhatsApp: 'Share via WhatsApp',
    downloadBackup: 'Download Backup',
    costByWorker: 'Cost by Worker',
    costByActivity: 'Cost by Activity',
    costByArea: 'Cost by Area',
    costByGroup: 'Cost by Group',
    customPeriod: 'Custom Period',
    from: 'From',
    to: 'To',
    generate: 'Generate',
    printSheet: 'Print Sheet',
    language: 'Language',
    english: 'English',
    marathi: 'Marathi',
    notes: 'Notes',
    joinDate: 'Join Date',
    hindiName: 'Marathi Name',
    marathiName: 'Marathi Name (मराठी नाव)',
    worker: 'Worker',
    area: 'Area',
    activity: 'Activity',
    group: 'Group',
    groups: 'Groups',
    all: 'All',
    totalCost: 'Total Cost',
    summary: 'Summary',
    actions: 'Actions',
    signature: 'Signature',
    sr: 'Sr.',
    day: 'Day',
    labourCost: 'Labour Cost',
    groupTotal: 'Group Total',
    totalDays: 'Total Days',
    expenses: 'Expenses',
    payments: 'Payments',
    expenseCategories: 'Expense Categories',
    sundryExpenses: 'Sundry Expenses',
    paymentsMade: 'Payments Made',
    balanceDue: 'Balance Due',
    sharedExpense: 'Shared Expense',
    allocation: 'Allocation',
    addExpense: 'Add Expense',
    addPayment: 'Add Payment',
    date: 'Date',
    amount: 'Amount',
  },
  mr: {
    appName: 'ग्रामीनो हजेरी',
    dashboard: 'डॅशबोर्ड',
    workers: 'कामगार',
    areas: 'क्षेत्रे',
    activities: 'कामे',
    attendance: 'हजेरी',
    reports: 'अहवाल',
    settings: 'सेटिंग्ज',
    print: 'प्रिंट',
    export: 'एक्सपोर्ट',
    import: 'इंपोर्ट',
    add: 'जोडा',
    edit: 'बदला',
    delete: 'काढा',
    save: 'जतन करा',
    cancel: 'रद्द करा',
    search: 'शोधा',
    name: 'नाव',
    code: 'कोड',
    dailyRate: 'दैनिक दर (₹)',
    status: 'स्थिती',
    active: 'सक्रिय',
    inactive: 'निष्क्रिय',
    description: 'वर्णन',
    category: 'वर्ग',
    present: 'हजर',
    absent: 'गैरहजर',
    halfDay: 'अर्धा दिवस',
    daysWorked: 'काम केलेले दिवस',
    total: 'एकूण',
    month: 'महिना',
    year: 'वर्ष',
    selectMonth: 'महिना निवडा',
    noData: 'माहिती उपलब्ध नाही',
    confirmDelete: 'तुम्हाला खात्री आहे का?',
    exportData: 'डेटा एक्सपोर्ट',
    importData: 'डेटा इंपोर्ट',
    shareWhatsApp: 'WhatsApp वर शेअर करा',
    downloadBackup: 'बॅकअप डाउनलोड',
    costByWorker: 'कामगारानुसार खर्च',
    costByActivity: 'कामानुसार खर्च',
    costByArea: 'क्षेत्रानुसार खर्च',
    costByGroup: 'गटानुसार खर्च',
    customPeriod: 'कस्टम कालावधी',
    from: 'पासून',
    to: 'पर्यंत',
    generate: 'तयार करा',
    printSheet: 'शीट प्रिंट करा',
    language: 'भाषा',
    english: 'इंग्रजी',
    marathi: 'मराठी',
    notes: 'नोट्स',
    joinDate: 'सामील तारीख',
    hindiName: 'मराठी नाव',
    marathiName: 'मराठी नाव',
    worker: 'कामगार',
    area: 'क्षेत्र',
    activity: 'काम',
    group: 'गट',
    groups: 'गट',
    all: 'सर्व',
    totalCost: 'एकूण खर्च',
    summary: 'सारांश',
    actions: 'क्रिया',
    signature: 'सही',
    sr: 'क्र.',
    day: 'दिवस',
    labourCost: 'मजूर खर्च',
    groupTotal: 'गट एकूण',
    totalDays: 'एकूण दिवस',
    expenses: 'खर्च',
    payments: 'पेमेंट',
    expenseCategories: 'खर्च प्रकार',
    sundryExpenses: 'इतर खर्च',
    paymentsMade: 'केलेले पेमेंट',
    balanceDue: 'बाकी रक्कम',
    sharedExpense: 'सामायिक खर्च',
    allocation: 'वाटप',
    addExpense: 'खर्च जोडा',
    addPayment: 'पेमेंट जोडा',
    date: 'तारीख',
    amount: 'रक्कम',
  },
};

export const useTranslation = (language: Language) => {
  return (key: TranslationKey): string => {
    return translations[language][key] || key;
  };
};
