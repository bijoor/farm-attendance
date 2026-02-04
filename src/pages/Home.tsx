import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getSyncUrl, setSyncUrl, pullData, pushData, checkServerStatus, hasDirtyFiles, clearAllDirtyFlags } from '../utils/sync';
import Button from '../components/ui/Button';
import { Loader2, Play, Globe, Download, Cloud } from 'lucide-react';

// PWA Install prompt interface
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { data, importData, settings, setLanguage } = useApp();
  const isMarathi = settings.language === 'mr';

  // Get first active group for default navigation (exclude soft-deleted)
  const activeGroups = (data.groups || [])
    .filter(g => g.status === 'active' && !g.deleted)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const firstGroupId = activeGroups.length > 0 ? activeGroups[0].id : null;
  const defaultPath = firstGroupId ? `/attendance/${firstGroupId}` : '/admin';

  const toggleLanguage = () => {
    setLanguage(isMarathi ? 'en' : 'mr');
  };

  const [isStarting, setIsStarting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncUrlInput, setSyncUrlInput] = useState(getSyncUrl() || '');

  // PWA Install state
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Save URL when input changes (on blur)
  const handleSaveUrl = () => {
    setSyncUrl(syncUrlInput || null);
  };

  // Get current sync URL for logic
  const syncUrl = syncUrlInput;

  // Capture the PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  };

  const handleStart = async () => {
    // If no sync URL configured, just start immediately
    if (!syncUrl) {
      navigate(defaultPath);
      return;
    }

    setIsStarting(true);

    try {
      // Check if server is online (quick timeout)
      const online = await checkServerStatus(syncUrl);

      if (!online) {
        // Server offline - start with local data silently
        navigate(defaultPath);
        return;
      }

      // Server is online - do transparent sync
      setSyncStatus(isMarathi ? 'सिंक करत आहे...' : 'Syncing...');

      // If there are pending local changes, push them first
      if (hasDirtyFiles()) {
        try {
          await pushData(data);
        } catch {
          // Push failed, continue anyway
        }
      }

      // Pull latest data from server
      try {
        const result = await pullData();
        if (result.success && result.data) {
          const importSuccess = importData(JSON.stringify(result.data));
          if (importSuccess) {
            clearAllDirtyFlags();
          }
        }
      } catch {
        // Pull failed, continue with local data
      }

      // Navigate regardless of sync result
      navigate(defaultPath);
    } catch {
      // Any error - just navigate with local data
      navigate(defaultPath);
    } finally {
      setIsStarting(false);
      setSyncStatus(null);
    }
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

        {/* Main Start Button */}
        <Button
          onClick={handleStart}
          disabled={isStarting}
          className="w-full py-4 text-lg flex items-center justify-center gap-2 mb-4"
        >
          {isStarting ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              {syncStatus || (isMarathi ? 'सुरू होत आहे...' : 'Starting...')}
            </>
          ) : (
            <>
              <Play size={24} />
              {isMarathi ? 'सुरू करा' : 'Start'}
            </>
          )}
        </Button>

        {/* Server URL Input */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
            <Cloud size={12} />
            {isMarathi ? 'सर्व्हर URL (पर्यायी)' : 'Server URL (optional)'}
          </label>
          <input
            type="url"
            value={syncUrlInput}
            onChange={e => setSyncUrlInput(e.target.value)}
            onBlur={handleSaveUrl}
            placeholder="https://your-server.ts.net"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-graminno-500 text-sm"
          />
          {syncUrl && (
            <p className="text-xs text-slate-400 mt-1">
              {isMarathi ? 'सुरू करताना स्वयंचलित सिंक होईल' : 'Will auto-sync on start'}
            </p>
          )}
        </div>

        {/* Install App Button - Show if not installed */}
        {!isInstalled && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            {installPrompt ? (
              <button
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
              >
                <Download size={18} />
                <span className="font-medium">
                  {isMarathi ? 'अॅप इन्स्टॉल करा' : 'Install App'}
                </span>
              </button>
            ) : (
              <div className="text-center text-xs text-slate-500">
                <p className="mb-1 font-medium">
                  {isMarathi ? 'अॅप इन्स्टॉल करा:' : 'Install this app:'}
                </p>
                {/iPhone|iPad|iPod/.test(navigator.userAgent) ? (
                  <p>{isMarathi ? 'Share बटण → "Add to Home Screen"' : 'Tap Share → "Add to Home Screen"'}</p>
                ) : /Android/.test(navigator.userAgent) ? (
                  <p>{isMarathi ? 'Menu (⋮) → "Add to Home screen"' : 'Menu (⋮) → "Add to Home screen"'}</p>
                ) : (
                  <p>{isMarathi ? 'Address bar मधील install (⊕) आयकॉन क्लिक करा' : 'Click the install (⊕) icon in the address bar'}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
