#!/usr/bin/env node
/**
 * Multi-file P2P Sync Server for Farm Attendance
 *
 * Data is stored in separate files for better modularity:
 * - data/workers.json
 * - data/areas.json
 * - data/activities.json
 * - data/settings.json
 * - data/months/YYYY-MM.json
 *
 * Run on the primary device (laptop):
 *   node server.js
 *
 * Then expose via Cloudflare Tunnel or Tailscale Funnel
 */

import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Version tracking for auto-update
const packageJson = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
const CURRENT_VERSION = packageJson.version;
const UPDATE_CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/bijoor/farm-attendance/main/package.json';

let lastUpdateCheck = null;
let updateAvailable = null;

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = join(__dirname, 'data');
const MONTHS_DIR = join(DATA_DIR, 'months');

// Ensure data directories exist
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(MONTHS_DIR)) mkdirSync(MONTHS_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static files from dist folder (production build)
app.use(express.static(join(__dirname, 'dist')));

// ============ File Operations ============

function loadFile(filePath) {
  if (existsSync(filePath)) {
    try {
      return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error(`Error loading ${filePath}:`, e);
    }
  }
  return null;
}

function saveFile(filePath, data) {
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getFileTimestamp(filePath) {
  if (existsSync(filePath)) {
    try {
      const data = loadFile(filePath);
      return data?.lastModified || null;
    } catch {
      return null;
    }
  }
  return null;
}

// ============ Merge Functions ============

// Get the effective timestamp for an item (latest of modifiedAt or deletedAt)
function getItemTimestamp(item) {
  const modifiedTime = item.modifiedAt ? new Date(item.modifiedAt).getTime() : 0;
  const deletedTime = item.deletedAt ? new Date(item.deletedAt).getTime() : 0;
  return Math.max(modifiedTime, deletedTime);
}

// Merge arrays by ID, preferring item with later timestamp
// Handles soft deletes: deleted items are kept with their deleted flag
function mergeArray(localArr = [], remoteArr = [], idField = 'id') {
  const map = new Map();

  for (const item of localArr) {
    map.set(item[idField], { ...item });
  }

  for (const item of remoteArr) {
    const existing = map.get(item[idField]);
    if (!existing) {
      map.set(item[idField], { ...item });
    } else {
      // Compare timestamps - latest wins (including deletedAt)
      const localTime = getItemTimestamp(existing);
      const remoteTime = getItemTimestamp(item);
      if (remoteTime >= localTime) {
        map.set(item[idField], { ...item });
      }
    }
  }

  return Array.from(map.values());
}

// Merge month data (groups with attendance)
function mergeMonthData(local, remote) {
  if (!local) return remote;
  if (!remote) return local;

  const merged = { ...local, ...remote };
  merged.groups = mergeGroups(local.groups || [], remote.groups || []);
  merged.lastModified = new Date().toISOString();
  return merged;
}

function mergeGroups(localGroups = [], remoteGroups = []) {
  const map = new Map();

  for (const group of localGroups) {
    map.set(group.id, { ...group });
  }

  for (const remoteGroup of remoteGroups) {
    const existing = map.get(remoteGroup.id);
    if (!existing) {
      map.set(remoteGroup.id, { ...remoteGroup });
    } else {
      const mergedDays = mergeDays(existing.days || [], remoteGroup.days || []);
      // Merge workerIds arrays
      const workerIds = [...new Set([...(existing.workerIds || []), ...(remoteGroup.workerIds || [])])];
      map.set(remoteGroup.id, {
        ...existing,
        ...remoteGroup,
        workerIds,
        days: mergedDays,
      });
    }
  }

  return Array.from(map.values());
}

function mergeDays(localDays = [], remoteDays = []) {
  const map = new Map();

  for (const day of localDays) {
    map.set(day.date, { ...day });
  }

  for (const remoteDay of remoteDays) {
    const existing = map.get(remoteDay.date);
    if (!existing) {
      map.set(remoteDay.date, { ...remoteDay });
    } else {
      map.set(remoteDay.date, {
        ...existing,
        ...remoteDay,
        attendance: { ...existing.attendance, ...remoteDay.attendance },
      });
    }
  }

  return Array.from(map.values());
}

// ============ Auto-Update Functions ============

async function checkForUpdates() {
  console.log(`[${new Date().toISOString()}] Checking for updates...`);
  lastUpdateCheck = new Date().toISOString();

  try {
    const response = await fetch(GITHUB_RAW_URL);
    if (!response.ok) {
      console.error('Failed to fetch remote package.json:', response.status);
      return { hasUpdate: false, error: 'Failed to fetch remote version' };
    }

    const remotePackage = await response.json();
    const remoteVersion = remotePackage.version;

    if (remoteVersion !== CURRENT_VERSION) {
      console.log(`Update available: ${CURRENT_VERSION} → ${remoteVersion}`);
      updateAvailable = { from: CURRENT_VERSION, to: remoteVersion };
      return { hasUpdate: true, currentVersion: CURRENT_VERSION, newVersion: remoteVersion };
    }

    console.log(`No updates available. Current version: ${CURRENT_VERSION}`);
    updateAvailable = null;
    return { hasUpdate: false, currentVersion: CURRENT_VERSION };
  } catch (err) {
    console.error('Update check failed:', err.message);
    return { hasUpdate: false, error: err.message };
  }
}

async function performUpdate() {
  console.log(`[${new Date().toISOString()}] Starting update...`);

  try {
    // Check if we're in a git repository
    try {
      execSync('git status', { cwd: __dirname, stdio: 'pipe' });
    } catch {
      console.error('Not a git repository. Cannot auto-update.');
      return { success: false, error: 'Not a git repository' };
    }

    // Stash any local changes (to preserve data folder modifications)
    console.log('Stashing local changes...');
    try {
      execSync('git stash', { cwd: __dirname, stdio: 'pipe' });
    } catch {
      // Ignore if nothing to stash
    }

    // Pull latest code
    console.log('Pulling latest code from GitHub...');
    execSync('git pull origin main', { cwd: __dirname, stdio: 'inherit' });

    // Install dependencies if package.json changed
    console.log('Installing dependencies...');
    execSync('npm install --production', { cwd: __dirname, stdio: 'inherit' });

    // Build the frontend
    console.log('Building frontend...');
    try {
      execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
    } catch (buildErr) {
      console.error('Build failed, but continuing...', buildErr.message);
    }

    console.log('Update complete! Restarting server...');

    // Give a moment for the response to be sent, then exit
    // PM2 will auto-restart the process
    setTimeout(() => {
      process.exit(0);
    }, 2000);

    return { success: true, message: 'Update applied. Server restarting...' };
  } catch (err) {
    console.error('Update failed:', err.message);
    return { success: false, error: err.message };
  }
}

// ============ API Endpoints ============

// Get manifest (list of all files with timestamps)
app.get('/api/manifest', (req, res) => {
  const manifest = {
    workers: getFileTimestamp(join(DATA_DIR, 'workers.json')),
    areas: getFileTimestamp(join(DATA_DIR, 'areas.json')),
    activities: getFileTimestamp(join(DATA_DIR, 'activities.json')),
    groups: getFileTimestamp(join(DATA_DIR, 'groups.json')),
    expenseCategories: getFileTimestamp(join(DATA_DIR, 'expenseCategories.json')),
    expenses: getFileTimestamp(join(DATA_DIR, 'expenses.json')),
    payments: getFileTimestamp(join(DATA_DIR, 'payments.json')),
    settings: getFileTimestamp(join(DATA_DIR, 'settings.json')),
    months: {},
  };

  // Get all month files
  if (existsSync(MONTHS_DIR)) {
    const monthFiles = readdirSync(MONTHS_DIR).filter(f => f.endsWith('.json'));
    for (const file of monthFiles) {
      const month = file.replace('.json', '');
      manifest.months[month] = getFileTimestamp(join(MONTHS_DIR, file));
    }
  }

  res.json({ success: true, manifest, timestamp: new Date().toISOString() });
});

// Get specific master file
app.get('/api/data/:type', (req, res) => {
  const { type } = req.params;
  const validTypes = ['workers', 'areas', 'activities', 'groups', 'expenseCategories', 'expenses', 'payments', 'settings'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, error: 'Invalid data type' });
  }

  const filePath = join(DATA_DIR, `${type}.json`);
  const data = loadFile(filePath);

  res.json({ success: true, data, timestamp: new Date().toISOString() });
});

// Update specific master file
app.post('/api/data/:type', (req, res) => {
  const { type } = req.params;
  const validTypes = ['workers', 'areas', 'activities', 'groups', 'expenseCategories', 'expenses', 'payments', 'settings'];

  if (!validTypes.includes(type)) {
    return res.status(400).json({ success: false, error: 'Invalid data type' });
  }

  const remoteData = req.body;
  const filePath = join(DATA_DIR, `${type}.json`);
  const localData = loadFile(filePath);

  let mergedData;
  if (type === 'settings') {
    // Settings: simple merge, remote wins
    mergedData = { ...localData, ...remoteData, lastModified: new Date().toISOString() };
  } else {
    // Arrays: merge by ID
    const mergedItems = mergeArray(localData?.items || [], remoteData?.items || remoteData || [], 'id');
    mergedData = { items: mergedItems, lastModified: new Date().toISOString() };
  }

  saveFile(filePath, mergedData);
  res.json({ success: true, data: mergedData, timestamp: new Date().toISOString() });
});

// Get month attendance data
app.get('/api/data/months/:month', (req, res) => {
  const { month } = req.params;
  const filePath = join(MONTHS_DIR, `${month}.json`);
  const data = loadFile(filePath);

  res.json({ success: true, data, timestamp: new Date().toISOString() });
});

// Update month attendance data
app.post('/api/data/months/:month', (req, res) => {
  const { month } = req.params;
  const remoteData = req.body;
  const filePath = join(MONTHS_DIR, `${month}.json`);
  const localData = loadFile(filePath);

  const mergedData = mergeMonthData(localData, remoteData);
  saveFile(filePath, mergedData);

  res.json({ success: true, data: mergedData, timestamp: new Date().toISOString() });
});

// ============ Bulk Sync (for backward compatibility and initial load) ============

// Get all data at once
app.get('/api/data', (req, res) => {
  const workers = loadFile(join(DATA_DIR, 'workers.json'));
  const areas = loadFile(join(DATA_DIR, 'areas.json'));
  const activities = loadFile(join(DATA_DIR, 'activities.json'));
  const groups = loadFile(join(DATA_DIR, 'groups.json'));
  const expenseCategories = loadFile(join(DATA_DIR, 'expenseCategories.json'));
  const expenses = loadFile(join(DATA_DIR, 'expenses.json'));
  const payments = loadFile(join(DATA_DIR, 'payments.json'));
  const settings = loadFile(join(DATA_DIR, 'settings.json'));

  // Load all months
  const months = [];
  if (existsSync(MONTHS_DIR)) {
    const monthFiles = readdirSync(MONTHS_DIR).filter(f => f.endsWith('.json'));
    for (const file of monthFiles) {
      const monthData = loadFile(join(MONTHS_DIR, file));
      if (monthData) {
        months.push(monthData);
      }
    }
  }

  const data = {
    workers: workers?.items || [],
    areas: areas?.items || [],
    activities: activities?.items || [],
    groups: groups?.items || [],
    expenseCategories: expenseCategories?.items || [],
    expenses: expenses?.items || [],
    payments: payments?.items || [],
    months,
    version: settings?.version || '1.0.0',
    lastSyncedAt: new Date().toISOString(),
  };

  res.json({ success: true, data, timestamp: new Date().toISOString() });
});

// Sync all data at once
app.post('/api/data', (req, res) => {
  const remoteData = req.body;

  if (!remoteData) {
    return res.status(400).json({ success: false, error: 'No data provided' });
  }

  // Merge workers
  const localWorkers = loadFile(join(DATA_DIR, 'workers.json'));
  const mergedWorkers = mergeArray(localWorkers?.items || [], remoteData.workers || [], 'id');
  saveFile(join(DATA_DIR, 'workers.json'), { items: mergedWorkers, lastModified: new Date().toISOString() });

  // Merge areas
  const localAreas = loadFile(join(DATA_DIR, 'areas.json'));
  const mergedAreas = mergeArray(localAreas?.items || [], remoteData.areas || [], 'id');
  saveFile(join(DATA_DIR, 'areas.json'), { items: mergedAreas, lastModified: new Date().toISOString() });

  // Merge activities
  const localActivities = loadFile(join(DATA_DIR, 'activities.json'));
  const mergedActivities = mergeArray(localActivities?.items || [], remoteData.activities || [], 'id');
  saveFile(join(DATA_DIR, 'activities.json'), { items: mergedActivities, lastModified: new Date().toISOString() });

  // Merge groups
  const localGroups = loadFile(join(DATA_DIR, 'groups.json'));
  const mergedGroups = mergeArray(localGroups?.items || [], remoteData.groups || [], 'id');
  saveFile(join(DATA_DIR, 'groups.json'), { items: mergedGroups, lastModified: new Date().toISOString() });

  // Merge expense categories
  const localExpenseCategories = loadFile(join(DATA_DIR, 'expenseCategories.json'));
  const mergedExpenseCategories = mergeArray(localExpenseCategories?.items || [], remoteData.expenseCategories || [], 'id');
  saveFile(join(DATA_DIR, 'expenseCategories.json'), { items: mergedExpenseCategories, lastModified: new Date().toISOString() });

  // Merge expenses
  const localExpenses = loadFile(join(DATA_DIR, 'expenses.json'));
  const mergedExpenses = mergeArray(localExpenses?.items || [], remoteData.expenses || [], 'id');
  saveFile(join(DATA_DIR, 'expenses.json'), { items: mergedExpenses, lastModified: new Date().toISOString() });

  // Merge payments
  const localPayments = loadFile(join(DATA_DIR, 'payments.json'));
  const mergedPayments = mergeArray(localPayments?.items || [], remoteData.payments || [], 'id');
  saveFile(join(DATA_DIR, 'payments.json'), { items: mergedPayments, lastModified: new Date().toISOString() });

  // Merge months
  const mergedMonths = [];
  const remoteMonths = remoteData.months || [];

  // Get existing month files
  const existingMonths = new Map();
  if (existsSync(MONTHS_DIR)) {
    const monthFiles = readdirSync(MONTHS_DIR).filter(f => f.endsWith('.json'));
    for (const file of monthFiles) {
      const month = file.replace('.json', '');
      const data = loadFile(join(MONTHS_DIR, file));
      if (data) existingMonths.set(month, data);
    }
  }

  // Merge each remote month
  for (const remoteMonth of remoteMonths) {
    if (!remoteMonth.month) continue;
    const localMonth = existingMonths.get(remoteMonth.month);
    const merged = mergeMonthData(localMonth, remoteMonth);
    saveFile(join(MONTHS_DIR, `${remoteMonth.month}.json`), merged);
    existingMonths.set(remoteMonth.month, merged);
  }

  // Collect all months for response
  for (const [month, data] of existingMonths) {
    mergedMonths.push({ ...data, month });
  }

  // Save settings
  saveFile(join(DATA_DIR, 'settings.json'), {
    version: remoteData.version || '1.0.0',
    lastModified: new Date().toISOString(),
  });

  const responseData = {
    workers: mergedWorkers,
    areas: mergedAreas,
    activities: mergedActivities,
    groups: mergedGroups,
    expenseCategories: mergedExpenseCategories,
    expenses: mergedExpenses,
    payments: mergedPayments,
    months: mergedMonths,
    version: remoteData.version || '1.0.0',
    lastSyncedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: responseData,
    timestamp: new Date().toISOString(),
    message: 'Data synced successfully'
  });
});

// Server status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: CURRENT_VERSION,
    timestamp: new Date().toISOString(),
    dataExists: existsSync(DATA_DIR) && readdirSync(DATA_DIR).length > 0,
    multiFile: true,
    lastUpdateCheck,
    updateAvailable,
  });
});

// ============ Version & Update Endpoints ============

// Get current version
app.get('/api/version', (req, res) => {
  res.json({
    version: CURRENT_VERSION,
    lastUpdateCheck,
    updateAvailable,
  });
});

// Check for updates (manual trigger)
app.get('/api/check-update', async (req, res) => {
  const result = await checkForUpdates();
  res.json(result);
});

// Trigger update (manual)
app.post('/api/update', async (req, res) => {
  console.log('Manual update triggered via API');
  const checkResult = await checkForUpdates();

  if (!checkResult.hasUpdate) {
    return res.json({ success: false, message: 'No updates available', ...checkResult });
  }

  const updateResult = await performUpdate();
  res.json(updateResult);
});

// Force update (skip version check)
app.post('/api/force-update', async (req, res) => {
  console.log('Force update triggered via API');
  const updateResult = await performUpdate();
  res.json(updateResult);
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║     Farm Attendance Sync Server v${CURRENT_VERSION.padEnd(24)}║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Server running at: http://localhost:${PORT}                 ║
║                                                           ║
║  Data stored in: ./data/                                  ║
║    - workers.json                                         ║
║    - areas.json                                           ║
║    - activities.json                                      ║
║    - groups.json                                          ║
║    - expenseCategories.json                               ║
║    - expenses.json                                        ║
║    - payments.json                                        ║
║    - months/*.json                                        ║
║                                                           ║
║  Auto-update: Enabled (every 6 hours)                     ║
║  API endpoints:                                           ║
║    GET  /api/version      - Current version               ║
║    GET  /api/check-update - Check for updates             ║
║    POST /api/update       - Apply available update        ║
║                                                           ║
║  To expose via Tailscale Funnel:                          ║
║  tailscale funnel ${PORT}                                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Schedule auto-update checks
  console.log('Auto-update scheduler started. Checking every 6 hours.');

  // Check for updates 30 seconds after startup
  setTimeout(async () => {
    console.log('Running initial update check...');
    const result = await checkForUpdates();
    if (result.hasUpdate) {
      console.log(`\n*** UPDATE AVAILABLE: ${result.currentVersion} → ${result.newVersion} ***`);
      console.log('To update, run: curl -X POST http://localhost:' + PORT + '/api/update\n');
    }
  }, 30000);

  // Then check every 6 hours
  setInterval(async () => {
    const result = await checkForUpdates();
    if (result.hasUpdate) {
      console.log(`\n*** UPDATE AVAILABLE: ${result.currentVersion} → ${result.newVersion} ***`);
      // Auto-apply update
      console.log('Auto-applying update...');
      await performUpdate();
    }
  }, UPDATE_CHECK_INTERVAL);
});
