import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import { formatCurrency, calculateMonthlyReport } from '../utils/calculations';
import { format } from 'date-fns';
import {
  Users,
  MapPin,
  ClipboardList,
  Calendar,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { data, settings } = useApp();
  const t = useTranslation(settings.language);

  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthData = data.months.find(m => m.month === currentMonth);
  const monthlyReport = calculateMonthlyReport(data.workers, currentMonthData);

  const activeWorkers = data.workers.filter(w => w.status === 'active').length;
  const totalAreas = data.areas.length;
  const totalActivities = data.activities.length;

  const stats = [
    {
      label: t('workers'),
      value: activeWorkers,
      icon: Users,
      color: 'bg-blue-500',
      link: '/workers',
    },
    {
      label: t('areas'),
      value: totalAreas,
      icon: MapPin,
      color: 'bg-green-500',
      link: '/areas',
    },
    {
      label: t('activities'),
      value: totalActivities,
      icon: ClipboardList,
      color: 'bg-purple-500',
      link: '/activities',
    },
    {
      label: `${t('totalCost')} (${format(new Date(), 'MMM')})`,
      value: formatCurrency(monthlyReport.totalCost),
      icon: TrendingUp,
      color: 'bg-graminno-600',
      link: '/reports',
    },
  ];

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={t('dashboard')}
        subtitle={`${t('appName')} - ${format(new Date(), 'MMMM yyyy')}`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <Link
            key={index}
            to={stat.link}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon size={20} className="text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-8">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/attendance"
            className="flex items-center justify-between p-4 bg-graminno-50 rounded-lg hover:bg-graminno-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Calendar size={24} className="text-graminno-600" />
              <span className="font-medium text-graminno-700">{t('attendance')}</span>
            </div>
            <ArrowRight size={20} className="text-graminno-400" />
          </Link>

          <Link
            to="/print"
            className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ClipboardList size={24} className="text-slate-600" />
              <span className="font-medium text-slate-700">{t('printSheet')}</span>
            </div>
            <ArrowRight size={20} className="text-slate-400" />
          </Link>

          <Link
            to="/reports"
            className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={24} className="text-slate-600" />
              <span className="font-medium text-slate-700">{t('reports')}</span>
            </div>
            <ArrowRight size={20} className="text-slate-400" />
          </Link>
        </div>
      </div>

      {/* This Month Summary */}
      {monthlyReport.workers.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {format(new Date(), 'MMMM yyyy')} - {t('summary')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 font-medium text-slate-600">{t('worker')}</th>
                  <th className="text-center py-2 px-3 font-medium text-slate-600">{t('daysWorked')}</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">{t('total')}</th>
                </tr>
              </thead>
              <tbody>
                {monthlyReport.workers
                  .filter(w => w.daysWorked > 0 || w.halfDays > 0)
                  .slice(0, 5)
                  .map(worker => (
                    <tr key={worker.workerId} className="border-b border-slate-100">
                      <td className="py-2 px-3 text-slate-800">{worker.workerName}</td>
                      <td className="py-2 px-3 text-center text-slate-600">
                        {worker.daysWorked}
                        {worker.halfDays > 0 && <span className="text-slate-400"> + {worker.halfDays}H</span>}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-800">
                        {formatCurrency(worker.totalCost)}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td className="py-2 px-3 font-semibold text-slate-800">{t('total')}</td>
                  <td className="py-2 px-3 text-center font-medium text-slate-600">
                    {monthlyReport.totalDays} days
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-graminno-600">
                    {formatCurrency(monthlyReport.totalCost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Link
            to="/reports"
            className="mt-4 inline-flex items-center text-graminno-600 hover:text-graminno-700 font-medium"
          >
            View Full Report <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
