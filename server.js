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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// ============ API Endpoints ============

// Get manifest (list of all files with timestamps)
app.get('/api/manifest', (req, res) => {
  const manifest = {
    workers: getFileTimestamp(join(DATA_DIR, 'workers.json')),
    areas: getFileTimestamp(join(DATA_DIR, 'areas.json')),
    activities: getFileTimestamp(join(DATA_DIR, 'activities.json')),
    groups: getFileTimestamp(join(DATA_DIR, 'groups.json')),
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
  const validTypes = ['workers', 'areas', 'activities', 'groups', 'settings'];

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
  const validTypes = ['workers', 'areas', 'activities', 'groups', 'settings'];

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
    timestamp: new Date().toISOString(),
    dataExists: existsSync(DATA_DIR) && readdirSync(DATA_DIR).length > 0,
    multiFile: true,
  });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║        Farm Attendance Sync Server (Multi-File)           ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Server running at: http://localhost:${PORT}                 ║
║                                                           ║
║  Data stored in: ./data/                                  ║
║    - workers.json                                         ║
║    - areas.json                                           ║
║    - activities.json                                      ║
║    - groups.json                                          ║
║    - months/*.json                                        ║
║                                                           ║
║  To expose via Tailscale Funnel:                          ║
║  tailscale funnel ${PORT}                                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
