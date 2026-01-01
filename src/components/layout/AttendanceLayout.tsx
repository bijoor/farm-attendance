import React, { useState, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../data/translations';
import { useAutoSync } from '../../hooks/useAutoSync';
import { getSyncUrl } from '../../utils/sync';
import {
  Menu,
  X,
  Globe,
  Home,
  Cloud,
  Printer,
  Calendar,
  IndianRupee,
  Wallet,
} from 'lucide-react';

const AttendanceLayout: React.FC = () => {
  const navigate = useNavigate();
  const { data, settings, setLanguage } = useApp();
  const t = useTranslation(settings.language);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMarathi = settings.language === 'mr';

  // Secret admin access: tap logo 5 times quickly
  const tapCountRef = useRef(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSecretTap = () => {
    tapCountRef.current += 1;

    // Reset timeout on each tap
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }

    // If 5 taps within 2 seconds, go to admin
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      navigate('/admin');
      return;
    }

    // Reset count after 2 seconds of no taps
    tapTimeoutRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 2000);
  };

  // Auto-sync when data changes
  const syncUrl = getSyncUrl();
  useAutoSync(data, !!syncUrl);

  // Get active groups sorted by order (exclude soft-deleted)
  const activeGroups = (data.groups || [])
    .filter(g => g.status === 'active' && !g.deleted)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Build navigation items dynamically from groups
  const navItems = activeGroups.map(group => ({
    path: `/attendance/${group.id}`,
    label: isMarathi && group.marathiName ? group.marathiName : group.name,
    icon: Calendar,
  }));

  // Add Print and Labour Cost at the end
  navItems.push({
    path: '/print',
    label: t('print'),
    icon: Printer,
  });

  navItems.push({
    path: '/labour-cost',
    label: t('labourCost'),
    icon: IndianRupee,
  });

  navItems.push({
    path: '/expenses',
    label: isMarathi ? 'खर्च' : 'Expenses',
    icon: Wallet,
  });

  const handleGoHome = () => {
    navigate('/');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const toggleLanguage = () => {
    setLanguage(settings.language === 'en' ? 'mr' : 'en');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-graminno-600 text-white flex items-center justify-between px-4 z-50 shadow-md">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-graminno-700 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <h1
            className="text-lg font-semibold cursor-pointer select-none"
            onClick={handleSecretTap}
          >ग्रामीनो</h1>
          {syncUrl && (
            <span title="Auto-sync enabled">
              <Cloud size={16} className="text-graminno-200" />
            </span>
          )}
        </div>
        <button
          onClick={toggleLanguage}
          className="p-2 hover:bg-graminno-700 rounded-lg transition-colors flex items-center gap-1"
          title={settings.language === 'en' ? 'Switch to Marathi' : 'Switch to English'}
        >
          <Globe size={18} />
          <span className="text-xs font-medium">{settings.language === 'en' ? 'MR' : 'EN'}</span>
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-graminno-600 text-white z-50 transform transition-transform duration-300 ease-in-out flex flex-col
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-graminno-500">
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={handleSecretTap}
          >
            <span className="text-2xl font-bold">ग्रा</span>
            <div className="flex flex-col leading-none">
              <span className="text-sm">ग्रामीनो</span>
              <span className="text-xs text-graminno-200">GRAMINNO</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {syncUrl && (
              <span className="flex items-center gap-1 text-graminno-200" title="Auto-sync enabled">
                <Cloud size={16} />
              </span>
            )}
            <button
              onClick={closeSidebar}
              className="lg:hidden p-2 hover:bg-graminno-700 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Language Toggle in Sidebar */}
        <div className="px-4 py-3 border-b border-graminno-500">
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between px-4 py-2 bg-graminno-700 hover:bg-graminno-800 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Globe size={18} />
              <span className="text-sm">{t('language')}</span>
            </div>
            <span className="text-xs bg-white text-graminno-700 px-2 py-1 rounded font-medium">
              {settings.language === 'en' ? 'English' : 'मराठी'}
            </span>
          </button>
        </div>

        {/* Navigation - Groups */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          <div className="text-xs text-graminno-300 uppercase tracking-wide px-4 py-2">
            {isMarathi ? 'हजेरी पत्रके' : 'Attendance Sheets'}
          </div>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-graminno-700 text-white'
                    : 'text-graminno-100 hover:bg-graminno-500 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Exit Session */}
        <div className="p-4 border-t border-graminno-500">
          <button
            onClick={handleGoHome}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-graminno-200 hover:bg-graminno-500 hover:text-white transition-colors"
          >
            <Home size={20} />
            <span>{isMarathi ? 'मुख्यपृष्ठ' : 'Exit Session'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation - Show first few groups */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 5).map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center px-3 py-2 ${
                  isActive ? 'text-graminno-600' : 'text-slate-500'
                }`
              }
            >
              <item.icon size={20} />
              <span className="text-xs mt-1 truncate max-w-[60px]">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="lg:hidden h-16" />
    </div>
  );
};

export default AttendanceLayout;
