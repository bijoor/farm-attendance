import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../data/translations';
import { useAutoSync } from '../../hooks/useAutoSync';
import { getSyncUrl } from '../../utils/sync';
import {
  LayoutDashboard,
  Users,
  Users2,
  MapPin,
  ClipboardList,
  BarChart3,
  IndianRupee,
  Settings,
  Menu,
  X,
  Globe,
  ArrowLeft,
  Cloud,
  Shield,
  Wallet,
  CreditCard,
  Tags,
} from 'lucide-react';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const { data, settings, setLanguage } = useApp();
  const t = useTranslation(settings.language);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMarathi = settings.language === 'mr';

  // Auto-sync when data changes
  const syncUrl = getSyncUrl();
  useAutoSync(data, !!syncUrl);

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: t('dashboard'), end: true },
    { path: '/admin/workers', icon: Users, label: t('workers') },
    { path: '/admin/groups', icon: Users2, label: t('groups') },
    { path: '/admin/areas', icon: MapPin, label: t('areas') },
    { path: '/admin/activities', icon: ClipboardList, label: t('activities') },
    { path: '/admin/expense-categories', icon: Tags, label: isMarathi ? 'खर्च प्रकार' : 'Expense Types' },
    { path: '/admin/expenses', icon: Wallet, label: isMarathi ? 'खर्च' : 'Expenses' },
    { path: '/admin/payments', icon: CreditCard, label: isMarathi ? 'पेमेंट' : 'Payments' },
    { path: '/admin/reports', icon: BarChart3, label: t('reports') },
    { path: '/admin/labour-cost', icon: IndianRupee, label: t('labourCost') },
    { path: '/admin/settings', icon: Settings, label: t('settings') },
  ];

  const handleGoBack = () => {
    // Navigate to first active group's attendance page
    const activeGroups = (data.groups || [])
      .filter(g => g.status === 'active' && !g.deleted)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (activeGroups.length > 0) {
      navigate(`/attendance/${activeGroups[0].id}`);
    } else {
      navigate('/');
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  const toggleLanguage = () => {
    setLanguage(settings.language === 'en' ? 'mr' : 'en');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-700 text-white flex items-center justify-between px-4 z-50 shadow-md">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={18} />
          <h1 className="text-lg font-semibold">{isMarathi ? 'व्यवस्थापन' : 'Admin'}</h1>
          {syncUrl && (
            <span title="Auto-sync enabled">
              <Cloud size={16} className="text-slate-300" />
            </span>
          )}
        </div>
        <button
          onClick={toggleLanguage}
          className="p-2 hover:bg-slate-600 rounded-lg transition-colors flex items-center gap-1"
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
          fixed top-0 left-0 h-full w-64 bg-slate-700 text-white z-50 transform transition-transform duration-300 ease-in-out flex flex-col
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-slate-600">
          <div className="flex items-center gap-2">
            <Shield size={24} />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-semibold">{isMarathi ? 'व्यवस्थापन' : 'Admin Panel'}</span>
              <span className="text-xs text-slate-300">ग्रामीनो</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {syncUrl && (
              <span className="flex items-center gap-1 text-slate-300" title="Auto-sync enabled">
                <Cloud size={16} />
              </span>
            )}
            <button
              onClick={closeSidebar}
              className="lg:hidden p-2 hover:bg-slate-600 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Language Toggle in Sidebar */}
        <div className="px-4 py-3 border-b border-slate-600">
          <button
            onClick={toggleLanguage}
            className="w-full flex items-center justify-between px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Globe size={18} />
              <span className="text-sm">{t('language')}</span>
            </div>
            <span className="text-xs bg-white text-slate-700 px-2 py-1 rounded font-medium">
              {settings.language === 'en' ? 'English' : 'मराठी'}
            </span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 flex-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-200 hover:bg-slate-600 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Back to Attendance */}
        <div className="p-4 border-t border-slate-600">
          <button
            onClick={handleGoBack}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-200 hover:bg-slate-600 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span>{isMarathi ? 'हजेरी पृष्ठ' : 'Back to Attendance'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 5).map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center px-3 py-2 ${
                  isActive ? 'text-slate-700' : 'text-slate-500'
                }`
              }
            >
              <item.icon size={20} />
              <span className="text-xs mt-1">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="lg:hidden h-16" />
    </div>
  );
};

export default AdminLayout;
