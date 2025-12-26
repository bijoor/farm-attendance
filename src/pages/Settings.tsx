import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { exportToJson, shareViaWhatsApp, exportWorkersToExcel, exportAreasToExcel, exportActivitiesToExcel } from '../utils/exporters';
import { importAppDataFromJson, importWorkersFromExcel, importAreasFromExcel, importActivitiesFromExcel } from '../utils/importers';
import { getSyncUrl, setSyncUrl, checkServerStatus, syncData, pullData, getLastSync, formatLastSync } from '../utils/sync';
import { Download, Upload, Share2, FileSpreadsheet, RefreshCw, AlertTriangle, Cloud, CloudOff, Loader2 } from 'lucide-react';

const Settings: React.FC = () => {
  const { data, settings, setLanguage, importData, resetData, addWorker, addArea, addActivity } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  const jsonInputRef = useRef<HTMLInputElement>(null);
  const workersInputRef = useRef<HTMLInputElement>(null);
  const areasInputRef = useRef<HTMLInputElement>(null);
  const activitiesInputRef = useRef<HTMLInputElement>(null);

  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync state
  const [syncUrl, setSyncUrlState] = useState(getSyncUrl() || '');
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync] = useState(getLastSync());

  // Check server status on mount and when URL changes
  useEffect(() => {
    const checkStatus = async () => {
      if (syncUrl) {
        const online = await checkServerStatus(syncUrl);
        setIsServerOnline(online);
      } else {
        setIsServerOnline(null);
      }
    };
    checkStatus();
  }, [syncUrl]);

  const handleSaveSyncUrl = () => {
    setSyncUrl(syncUrl || null);
    setImportStatus({ type: 'success', message: isMarathi ? 'सिंक URL जतन केला' : 'Sync URL saved' });
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleSync = async () => {
    if (!syncUrl) {
      setImportStatus({ type: 'error', message: isMarathi ? 'सिंक URL सेट करा' : 'Please set sync URL first' });
      setTimeout(() => setImportStatus(null), 3000);
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncData(data);
      if (result.success && result.data) {
        // Import the merged data
        const importSuccess = importData(JSON.stringify(result.data));
        if (importSuccess) {
          setImportStatus({ type: 'success', message: isMarathi ? 'सिंक यशस्वी! पेज रीलोड होत आहे...' : 'Sync completed! Reloading...' });
          // Reload page to ensure all components get the new data
          setTimeout(() => window.location.reload(), 1000);
        } else {
          setImportStatus({ type: 'error', message: isMarathi ? 'डेटा इम्पोर्ट अयशस्वी' : 'Failed to import data' });
        }
      } else {
        setImportStatus({ type: 'error', message: result.message });
      }
    } catch (error) {
      setImportStatus({ type: 'error', message: isMarathi ? 'सिंक अयशस्वी' : 'Sync failed' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullFromServer = async () => {
    if (!syncUrl) {
      setImportStatus({ type: 'error', message: isMarathi ? 'सिंक URL सेट करा' : 'Please set sync URL first' });
      setTimeout(() => setImportStatus(null), 3000);
      return;
    }

    setIsSyncing(true);
    try {
      const result = await pullData();
      if (result.success && result.data) {
        const importSuccess = importData(JSON.stringify(result.data));
        if (importSuccess) {
          setImportStatus({ type: 'success', message: isMarathi ? 'सर्व्हरवरून डेटा आणला! पेज रीलोड होत आहे...' : 'Data pulled from server! Reloading...' });
          setTimeout(() => window.location.reload(), 1000);
        } else {
          setImportStatus({ type: 'error', message: isMarathi ? 'डेटा इम्पोर्ट अयशस्वी' : 'Failed to import data' });
        }
      } else if (result.success) {
        setImportStatus({ type: 'error', message: isMarathi ? 'सर्व्हरवर डेटा नाही' : 'No data on server yet' });
      } else {
        setImportStatus({ type: 'error', message: result.message });
      }
    } catch (error) {
      setImportStatus({ type: 'error', message: isMarathi ? 'पुल अयशस्वी' : 'Pull failed' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCheckConnection = async () => {
    const online = await checkServerStatus(syncUrl);
    setIsServerOnline(online);
    if (online) {
      setImportStatus({ type: 'success', message: isMarathi ? 'सर्व्हर ऑनलाइन आहे' : 'Server is online' });
    } else {
      setImportStatus({ type: 'error', message: isMarathi ? 'सर्व्हर ऑफलाइन आहे' : 'Server is offline' });
    }
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleExportJson = () => {
    exportToJson(data);
  };

  const handleShareWhatsApp = () => {
    shareViaWhatsApp(data);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importAppDataFromJson(file);
      const success = importData(JSON.stringify(imported));
      if (success) {
        setImportStatus({ type: 'success', message: 'Data imported successfully!' });
      } else {
        setImportStatus({ type: 'error', message: 'Failed to import data. Invalid format.' });
      }
    } catch {
      setImportStatus({ type: 'error', message: 'Failed to read file. Please check the format.' });
    }

    if (jsonInputRef.current) jsonInputRef.current.value = '';
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleImportWorkers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const workers = await importWorkersFromExcel(file);
      workers.forEach(worker => addWorker(worker));
      setImportStatus({ type: 'success', message: `${workers.length} workers imported!` });
    } catch {
      setImportStatus({ type: 'error', message: 'Failed to import workers. Check Excel format.' });
    }

    if (workersInputRef.current) workersInputRef.current.value = '';
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleImportAreas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const areas = await importAreasFromExcel(file);
      areas.forEach(area => addArea(area));
      setImportStatus({ type: 'success', message: `${areas.length} areas imported!` });
    } catch {
      setImportStatus({ type: 'error', message: 'Failed to import areas. Check Excel format.' });
    }

    if (areasInputRef.current) areasInputRef.current.value = '';
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleImportActivities = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const activities = await importActivitiesFromExcel(file);
      activities.forEach(activity => addActivity(activity));
      setImportStatus({ type: 'success', message: `${activities.length} activities imported!` });
    } catch {
      setImportStatus({ type: 'error', message: 'Failed to import activities. Check Excel format.' });
    }

    if (activitiesInputRef.current) activitiesInputRef.current.value = '';
    setTimeout(() => setImportStatus(null), 3000);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone!')) {
      resetData();
      setImportStatus({ type: 'success', message: 'Data reset to defaults.' });
      setTimeout(() => setImportStatus(null), 3000);
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={t('settings')}
        subtitle="Manage app settings and data"
      />

      {/* Status Message */}
      {importStatus && (
        <div
          className={`mb-4 p-4 rounded-xl ${
            importStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {importStatus.message}
        </div>
      )}

      {/* Language Settings */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">{t('language')}</h2>
        <Select
          value={settings.language}
          onChange={e => setLanguage(e.target.value as 'en' | 'mr')}
          options={[
            { value: 'en', label: t('english') },
            { value: 'mr', label: t('marathi') },
          ]}
          className="max-w-xs"
        />
      </div>

      {/* P2P Sync */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center gap-2 mb-4">
          {isServerOnline === true && <Cloud size={20} className="text-green-600" />}
          {isServerOnline === false && <CloudOff size={20} className="text-red-500" />}
          {isServerOnline === null && <Cloud size={20} className="text-slate-400" />}
          <h2 className="text-lg font-semibold text-slate-800">
            {isMarathi ? 'डेटा सिंक' : 'Data Sync'}
          </h2>
          {isServerOnline === true && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {isMarathi ? 'ऑनलाइन' : 'Online'}
            </span>
          )}
        </div>

        <p className="text-slate-600 text-sm mb-4">
          {isMarathi
            ? 'नवीन डिव्हाइसवर प्रथम "सर्व्हरवरून लोड करा" वापरा. बदल केल्यानंतर "सर्व्हरवर सेव्ह करा" वापरा.'
            : 'On a new device, first use "Load from Server". After making changes, use "Save to Server".'}
        </p>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="url"
              value={syncUrl}
              onChange={e => setSyncUrlState(e.target.value)}
              placeholder={isMarathi ? 'https://your-tunnel.domain.com' : 'https://your-tunnel.domain.com'}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-graminno-500"
            />
            <Button variant="secondary" onClick={handleSaveSyncUrl}>
              {isMarathi ? 'जतन' : 'Save'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={handlePullFromServer}
              disabled={!syncUrl || isSyncing}
              className="flex items-center justify-center gap-2 py-4 text-base"
            >
              <Download size={20} />
              {isSyncing
                ? (isMarathi ? 'लोड होत आहे...' : 'Loading...')
                : (isMarathi ? 'सर्व्हरवरून लोड करा' : 'Load from Server')}
            </Button>

            <Button
              onClick={handleSync}
              disabled={!syncUrl || isSyncing}
              className="flex items-center justify-center gap-2 py-4 text-base"
            >
              {isSyncing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Upload size={20} />
              )}
              {isSyncing
                ? (isMarathi ? 'सेव्ह होत आहे...' : 'Saving...')
                : (isMarathi ? 'सर्व्हरवर सेव्ह करा' : 'Save to Server')}
            </Button>
          </div>

          <div className="flex justify-center">
            <Button variant="secondary" size="sm" onClick={handleCheckConnection} disabled={!syncUrl}>
              {isMarathi ? 'कनेक्शन तपासा' : 'Check Connection'}
            </Button>
          </div>

          {lastSync && (
            <p className="text-sm text-slate-500">
              {isMarathi ? 'शेवटचे सिंक: ' : 'Last synced: '}
              {formatLastSync(lastSync, isMarathi)}
            </p>
          )}

          <div className="bg-slate-50 rounded-lg p-4 text-sm">
            <h4 className="font-medium text-slate-700 mb-2">
              {isMarathi ? 'प्राथमिक डिव्हाइसवर सर्व्हर कसे चालवायचे:' : 'How to run server on primary device:'}
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li><code className="bg-slate-200 px-1 rounded">npm run build</code></li>
              <li><code className="bg-slate-200 px-1 rounded">node server.js</code></li>
              <li><code className="bg-slate-200 px-1 rounded">cloudflared tunnel run --url http://localhost:3001</code></li>
            </ol>
          </div>
        </div>
      </div>

      {/* Export Data */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">{t('exportData')}</h2>
        <p className="text-slate-600 text-sm mb-4">
          Export your data for backup or sharing. JSON includes all data, Excel exports individual master lists.
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-slate-700 mb-2">Full Backup (JSON)</h3>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExportJson}>
                <Download size={18} />
                {t('downloadBackup')}
              </Button>
              <Button variant="secondary" onClick={handleShareWhatsApp}>
                <Share2 size={18} />
                {t('shareWhatsApp')}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-slate-700 mb-2">Export Masters (Excel)</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => exportWorkersToExcel(data.workers)}>
                <FileSpreadsheet size={18} />
                {t('workers')}
              </Button>
              <Button variant="secondary" onClick={() => exportAreasToExcel(data.areas)}>
                <FileSpreadsheet size={18} />
                {t('areas')}
              </Button>
              <Button variant="secondary" onClick={() => exportActivitiesToExcel(data.activities)}>
                <FileSpreadsheet size={18} />
                {t('activities')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Data */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">{t('importData')}</h2>
        <p className="text-slate-600 text-sm mb-4">
          Import data from backup files. JSON will replace all data, Excel will add to existing.
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-slate-700 mb-2">Full Restore (JSON)</h3>
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
            <Button variant="secondary" onClick={() => jsonInputRef.current?.click()}>
              <Upload size={18} />
              Import JSON Backup
            </Button>
          </div>

          <div>
            <h3 className="font-medium text-slate-700 mb-2">Import Masters (Excel)</h3>
            <div className="flex flex-wrap gap-3">
              <input
                ref={workersInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportWorkers}
                className="hidden"
              />
              <Button variant="secondary" onClick={() => workersInputRef.current?.click()}>
                <Upload size={18} />
                {t('workers')}
              </Button>

              <input
                ref={areasInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportAreas}
                className="hidden"
              />
              <Button variant="secondary" onClick={() => areasInputRef.current?.click()}>
                <Upload size={18} />
                {t('areas')}
              </Button>

              <input
                ref={activitiesInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportActivities}
                className="hidden"
              />
              <Button variant="secondary" onClick={() => activitiesInputRef.current?.click()}>
                <Upload size={18} />
                {t('activities')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Data Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">{data.workers.length}</div>
            <div className="text-sm text-slate-500">{t('workers')}</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">{data.areas.length}</div>
            <div className="text-sm text-slate-500">{t('areas')}</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">{data.activities.length}</div>
            <div className="text-sm text-slate-500">{t('activities')}</div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-800">{data.months.length}</div>
            <div className="text-sm text-slate-500">Months</div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={20} className="text-red-600" />
          <h2 className="text-lg font-semibold text-red-800">Danger Zone</h2>
        </div>
        <p className="text-red-700 text-sm mb-4">
          Reset all data to defaults. This will delete all workers, areas, activities, and attendance data.
        </p>
        <Button variant="danger" onClick={handleReset}>
          <RefreshCw size={18} />
          Reset All Data
        </Button>
      </div>
    </div>
  );
};

export default Settings;
