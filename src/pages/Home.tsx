import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getSyncUrl, setSyncUrl, pullData, pushData, checkServerStatus, hasDirtyFiles } from '../utils/sync';
import Button from '../components/ui/Button';
import { Loader2, Wifi, WifiOff, Play, Globe, AlertCircle } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { data, importData, settings, setLanguage } = useApp();
  const isMarathi = settings.language === 'mr';

  const toggleLanguage = () => {
    setLanguage(isMarathi ? 'en' : 'mr');
  };

  const [syncUrl, setSyncUrlState] = useState(getSyncUrl() || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [serverStatus, setServerStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Check for unsaved changes on mount
  useEffect(() => {
    setPendingChanges(hasDirtyFiles());
  }, []);

  const handleCheckConnection = async () => {
    if (!syncUrl) {
      setError(isMarathi ? 'कृपया सर्व्हर URL प्रविष्ट करा' : 'Please enter server URL');
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const online = await checkServerStatus(syncUrl);
      setServerStatus(online ? 'online' : 'offline');
      if (!online) {
        setError(isMarathi ? 'सर्व्हरशी कनेक्ट होऊ शकत नाही' : 'Cannot connect to server');
      }
    } catch {
      setServerStatus('offline');
      setError(isMarathi ? 'कनेक्शन तपासणी अयशस्वी' : 'Connection check failed');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveUrl = () => {
    setSyncUrl(syncUrl || null);
    setServerStatus('unknown');
  };

  const handleStartSession = async () => {
    if (!syncUrl) {
      setError(isMarathi ? 'कृपया सर्व्हर URL प्रविष्ट करा' : 'Please enter server URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatusMessage(null);

    try {
      // First check if server is online
      const online = await checkServerStatus(syncUrl);
      if (!online) {
        setError(isMarathi ? 'सर्व्हर ऑफलाइन आहे' : 'Server is offline');
        setServerStatus('offline');
        setIsLoading(false);
        return;
      }

      setServerStatus('online');

      // If there are pending changes, push them first
      if (pendingChanges) {
        setStatusMessage(isMarathi ? 'जतन न केलेले बदल सेव्ह करत आहे...' : 'Saving unsaved changes...');
        const pushResult = await pushData(data);
        if (pushResult.success) {
          // Dirty flags are cleared by pushData itself
          setPendingChanges(false);
          setStatusMessage(isMarathi ? 'बदल सेव्ह झाले. डेटा लोड करत आहे...' : 'Changes saved. Loading data...');
        } else {
          // Push failed, but we can still try to pull and merge
          setStatusMessage(isMarathi ? 'सेव्ह अयशस्वी, पण पुढे जात आहे...' : 'Save failed, but continuing...');
        }
      }

      // Pull data from server (this will merge if we just pushed)
      setStatusMessage(isMarathi ? 'सर्व्हरवरून डेटा लोड करत आहे...' : 'Loading data from server...');
      const result = await pullData();

      if (result.success && result.data) {
        // Import the data
        const importSuccess = importData(JSON.stringify(result.data));
        if (importSuccess) {
          // Navigate to dashboard
          navigate('/dashboard');
        } else {
          setError(isMarathi ? 'डेटा लोड अयशस्वी' : 'Failed to load data');
        }
      } else if (result.success) {
        // No data on server yet, proceed with local data
        navigate('/dashboard');
      } else {
        setError(result.message);
      }
    } catch {
      setError(isMarathi ? 'सत्र सुरू करण्यात अयशस्वी' : 'Failed to start session');
    } finally {
      setIsLoading(false);
      setStatusMessage(null);
    }
  };

  const handleOfflineMode = () => {
    // Start without syncing
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-graminno-50 to-graminno-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md relative">
        {/* Language Toggle - Top Right */}
        <button
          onClick={toggleLanguage}
          className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-graminno-100 hover:bg-graminno-200 text-graminno-700 rounded-full transition-colors"
        >
          <Globe size={16} />
          <span className="text-sm font-medium">{isMarathi ? 'EN' : 'मराठी'}</span>
        </button>

        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-graminno-700 mb-2">
            {isMarathi ? 'ग्रामीनो' : 'Graminno'}
          </h1>
          <p className="text-slate-600">
            {isMarathi ? 'शेत हजेरी व्यवस्थापन' : 'Farm Attendance Management'}
          </p>
        </div>

        {/* Server URL Input */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {isMarathi ? 'सर्व्हर URL' : 'Server URL'}
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={syncUrl}
                onChange={e => setSyncUrlState(e.target.value)}
                onBlur={handleSaveUrl}
                placeholder="https://your-server.ts.net"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-graminno-500"
              />
              <button
                onClick={handleCheckConnection}
                disabled={isChecking || !syncUrl}
                className="px-3 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
              >
                {isChecking ? (
                  <Loader2 size={20} className="animate-spin text-slate-600" />
                ) : serverStatus === 'online' ? (
                  <Wifi size={20} className="text-green-600" />
                ) : serverStatus === 'offline' ? (
                  <WifiOff size={20} className="text-red-500" />
                ) : (
                  <Wifi size={20} className="text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {serverStatus === 'online' && (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Wifi size={14} />
              {isMarathi ? 'सर्व्हर ऑनलाइन आहे' : 'Server is online'}
            </p>
          )}
        </div>

        {/* Pending Changes Warning */}
        {pendingChanges && (
          <div className="mb-4 p-3 bg-amber-50 text-amber-700 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle size={18} />
            <span>
              {isMarathi
                ? 'जतन न केलेले बदल आहेत. सत्र सुरू केल्यावर ते प्रथम सेव्ह होतील.'
                : 'You have unsaved changes. They will be saved first when you start session.'}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            {statusMessage}
          </div>
        )}

        {/* Start Session Button */}
        <Button
          onClick={handleStartSession}
          disabled={isLoading || !syncUrl}
          className="w-full py-4 text-lg flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              {statusMessage || (isMarathi ? 'लोड होत आहे...' : 'Loading...')}
            </>
          ) : (
            <>
              <Play size={24} />
              {isMarathi ? 'सत्र सुरू करा' : 'Start Session'}
            </>
          )}
        </Button>

        {/* Offline Mode Link */}
        <div className="mt-4 text-center">
          <button
            onClick={handleOfflineMode}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            {isMarathi ? 'ऑफलाइन मोडमध्ये सुरू करा' : 'Start in offline mode'}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <h3 className="text-sm font-medium text-slate-700 mb-2">
            {isMarathi ? 'सूचना:' : 'Instructions:'}
          </h3>
          <ul className="text-xs text-slate-500 space-y-1">
            <li>• {isMarathi ? 'प्राथमिक डिव्हाइसवर सर्व्हर चालवा' : 'Run the server on your primary device'}</li>
            <li>• {isMarathi ? 'Tailscale/ngrok URL येथे प्रविष्ट करा' : 'Enter the Tailscale/ngrok URL here'}</li>
            <li>• {isMarathi ? 'बदल स्वयंचलितपणे सर्व्हरवर सेव्ह होतील' : 'Changes will auto-save to server'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;
