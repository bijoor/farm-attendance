import type { Worker, Area, Activity, Group, ExpenseCategory, AppData } from '../types';

export const sampleWorkers: Worker[] = [
  { id: 'w01', name: 'Babaram Karade', marathiName: 'बाबाराम कराडे', dailyRate: 500, status: 'active' },
  { id: 'w02', name: 'Garbhavat Bane', marathiName: 'गर्भवत बने', dailyRate: 400, status: 'active' },
  { id: 'w03', name: 'Dhikku Nimbale', marathiName: 'धिक्कू निंबाळे', dailyRate: 500, status: 'active' },
  { id: 'w04', name: 'Jhanteram Khabe', marathiName: 'झांतेराम खाबे', dailyRate: 400, status: 'active' },
  { id: 'w05', name: 'Surendu Kashi', marathiName: 'सुरेंदू कशी', dailyRate: 500, status: 'active' },
  { id: 'w06', name: 'Umi Karade', marathiName: 'ऊमि कराडे', dailyRate: 400, status: 'active' },
  { id: 'w07', name: 'Swapna Karade', marathiName: 'स्वप्ना कराडे', dailyRate: 300, status: 'active' },
  { id: 'w08', name: 'Gulab Anante', marathiName: 'गुलाब आनंते', dailyRate: 300, status: 'active' },
  { id: 'w09', name: 'Shanta Karade', marathiName: 'शांता कराडे', dailyRate: 300, status: 'active' },
  { id: 'w10', name: 'Sonaram Karadi', marathiName: 'सोनाराम कराडी', dailyRate: 500, status: 'active' },
  { id: 'w11', name: 'Mahavant Ko', marathiName: 'महावंत को', dailyRate: 400, status: 'active' },
  { id: 'w12', name: 'Vikat Sigavale', marathiName: 'विकट सिगावले', dailyRate: 500, status: 'active' },
  { id: 'w13', name: 'Shantaram Khabe', marathiName: 'शांताराम खाबे', dailyRate: 400, status: 'active' },
  { id: 'w14', name: 'Prakash Sagari', marathiName: 'प्रकाश सगारी', dailyRate: 500, status: 'active' },
  { id: 'w15', name: 'Ravi Kashi', marathiName: 'रवि कशी', dailyRate: 400, status: 'active' },
  { id: 'w16', name: 'Rama', marathiName: 'रामा', dailyRate: 300, status: 'active' },
  { id: 'w17', name: 'Mani Baslole', marathiName: 'मनी बसलोले', dailyRate: 400, status: 'active' },
  { id: 'w18', name: 'Pradnya Prakash', marathiName: 'प्रज्ञा प्रकाश', dailyRate: 400, status: 'active' },
  { id: 'w19', name: 'Vimala Ko', marathiName: 'विमला को', dailyRate: 400, status: 'active' },
  { id: 'w20', name: 'Limbi Misale', marathiName: 'लिंबी मिसाळे', dailyRate: 700, status: 'active', notes: 'Supervisor' },
];

export const sampleAreas: Area[] = [
  { id: 'a1', code: 'A1', marathiCode: 'अ१', name: 'Area 1', marathiName: 'क्षेत्र १', description: 'Main field area' },
  { id: 'a2', code: 'A2', marathiCode: 'अ२', name: 'Area 2', marathiName: 'क्षेत्र २', description: 'Secondary field' },
  { id: 'a3', code: 'A3', marathiCode: 'अ३', name: 'Area 3', marathiName: 'क्षेत्र ३', description: 'Third section' },
  { id: 'b1', code: 'B1', marathiCode: 'ब१', name: 'Block 1', marathiName: 'ब्लॉक १', description: 'Block area 1' },
  { id: 'b2', code: 'B2', marathiCode: 'ब२', name: 'Block 2', marathiName: 'ब्लॉक २', description: 'Block area 2' },
  { id: 'c1', code: 'C1', marathiCode: 'क१', name: 'Section C1', marathiName: 'विभाग क१', description: 'Section C area' },
];

export const sampleActivities: Activity[] = [
  { id: 'act1', code: 'WD', marathiCode: 'नि', name: 'Weeding', marathiName: 'निंदणी', category: 'Field Work' },
  { id: 'act2', code: 'PL', marathiCode: 'ला', name: 'Planting', marathiName: 'लागवड', category: 'Field Work' },
  { id: 'act3', code: 'HR', marathiCode: 'का', name: 'Harvesting', marathiName: 'कापणी', category: 'Field Work' },
  { id: 'act4', code: 'SP', marathiCode: 'फव', name: 'Spraying', marathiName: 'फवारणी', category: 'Field Work' },
  { id: 'act5', code: 'WT', marathiCode: 'पा', name: 'Watering', marathiName: 'पाणी देणे', category: 'Field Work' },
  { id: 'act6', code: 'PR', marathiCode: 'छा', name: 'Pruning', marathiName: 'छाटणी', category: 'Field Work' },
  { id: 'act7', code: 'FT', marathiCode: 'खत', name: 'Fertilizing', marathiName: 'खत घालणे', category: 'Field Work' },
  { id: 'act8', code: 'MU', marathiCode: 'आच', name: 'Mulching', marathiName: 'आच्छादन', category: 'Field Work' },
  { id: 'act9', code: 'CL', marathiCode: 'सा', name: 'Cleaning', marathiName: 'साफसफाई', category: 'Maintenance' },
  { id: 'act10', code: 'FN', marathiCode: 'कुं', name: 'Fencing', marathiName: 'कुंपण', category: 'Maintenance' },
  { id: 'act11', code: 'GN', marathiCode: 'सा', name: 'General Work', marathiName: 'सामान्य काम', category: 'Other' },
];

export const sampleGroups: Group[] = [
  { id: 'grp1', name: 'Team A', marathiName: 'गट अ', status: 'active', order: 1 },
  { id: 'grp2', name: 'Team B', marathiName: 'गट ब', status: 'active', order: 2 },
  { id: 'grp3', name: 'Spraying Team', marathiName: 'फवारणी गट', status: 'active', order: 3 },
  { id: 'grp4', name: 'Harvesting Team', marathiName: 'कापणी गट', status: 'active', order: 4 },
];

export const sampleExpenseCategories: ExpenseCategory[] = [
  { id: 'exp1', code: 'FEED', marathiCode: 'खाद्य', name: 'Feed', marathiName: 'खाद्य', status: 'active' },
  { id: 'exp2', code: 'FUEL', marathiCode: 'इंधन', name: 'Fuel', marathiName: 'इंधन', status: 'active' },
  { id: 'exp3', code: 'SEED', marathiCode: 'बियाणे', name: 'Seeds', marathiName: 'बियाणे', status: 'active' },
  { id: 'exp4', code: 'FERT', marathiCode: 'खत', name: 'Fertilizer', marathiName: 'खत', status: 'active' },
  { id: 'exp5', code: 'PEST', marathiCode: 'कीटक', name: 'Pesticides', marathiName: 'कीटकनाशके', status: 'active' },
  { id: 'exp6', code: 'EQPT', marathiCode: 'साधने', name: 'Equipment', marathiName: 'साधने/उपकरणे', status: 'active' },
  { id: 'exp7', code: 'TRNS', marathiCode: 'वाहतूक', name: 'Transport', marathiName: 'वाहतूक', status: 'active' },
  { id: 'exp8', code: 'MISC', marathiCode: 'इतर', name: 'Miscellaneous', marathiName: 'इतर खर्च', status: 'active' },
];

export const initialAppData: AppData = {
  workers: sampleWorkers,
  areas: sampleAreas,
  activities: sampleActivities,
  groups: sampleGroups,
  months: [],
  expenseCategories: sampleExpenseCategories,
  expenses: [],
  payments: [],
  version: '1.2.0',
};
