import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Select from '../components/ui/Select';
import { format } from 'date-fns';
import {
  calculateMonthlyReport,
  calculateCostByActivity,
  calculateCostByArea,
  calculateCostByWorkerForPeriod,
  calculateCostByGroup,
  formatCurrency,
  formatMonthYear,
} from '../utils/calculations';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, ClipboardList, MapPin, Calendar, Users2, CreditCard, AlertCircle } from 'lucide-react';

const COLORS = ['#1B6B7C', '#2A8A9E', '#4ECDC4', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const Reports: React.FC = () => {
  const { data, settings, getMonthData } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  const [activeTab, setActiveTab] = useState<'group' | 'worker' | 'activity' | 'area' | 'custom'>('group');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [startMonth, setStartMonth] = useState(format(new Date(new Date().setMonth(new Date().getMonth() - 2)), 'yyyy-MM'));
  const [endMonth, setEndMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Generate month options
  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = -12; i <= 0; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy');
      options.push({ value, label });
    }
    return options;
  }, []);

  const monthData = getMonthData(selectedMonth);
  const monthlyReport = calculateMonthlyReport(data.workers, monthData);

  const activityReport = calculateCostByActivity(data, startMonth, endMonth);
  const areaReport = calculateCostByArea(data, startMonth, endMonth);
  const workerPeriodReport = calculateCostByWorkerForPeriod(data, startMonth, endMonth);
  const groupReport = calculateCostByGroup(data, startMonth, endMonth);

  // Calculate sundry expenses for the period (by group)
  const expensesByGroup = useMemo(() => {
    const expenses = (data.expenses || []).filter(e => {
      if (e.deleted) return false;
      return e.month >= startMonth && e.month <= endMonth;
    });

    const groupMap = new Map<string, number>();
    const groups = (data.groups || []).filter(g => !g.deleted);

    groups.forEach(g => groupMap.set(g.id, 0));

    expenses.forEach(expense => {
      if (expense.isShared && expense.allocations) {
        // Shared expense - distribute by allocation
        expense.allocations.forEach(alloc => {
          if (alloc.amount) {
            groupMap.set(alloc.groupId, (groupMap.get(alloc.groupId) || 0) + alloc.amount);
          } else if (alloc.percentage) {
            groupMap.set(alloc.groupId, (groupMap.get(alloc.groupId) || 0) + (expense.amount * alloc.percentage / 100));
          }
        });
      } else if (expense.groupId) {
        // Single group expense
        groupMap.set(expense.groupId, (groupMap.get(expense.groupId) || 0) + expense.amount);
      }
    });

    return groupMap;
  }, [data.expenses, data.groups, startMonth, endMonth]);

  const totalExpenses = useMemo(() => {
    let total = 0;
    expensesByGroup.forEach(amount => total += amount);
    return total;
  }, [expensesByGroup]);

  const totalLabourCost = groupReport.reduce((sum, g) => sum + g.totalCost, 0);
  const grandTotal = totalLabourCost + totalExpenses;

  // Calculate payments for the period (by group)
  const paymentsByGroup = useMemo(() => {
    const payments = (data.payments || []).filter(p => {
      if (p.deleted) return false;
      return p.month >= startMonth && p.month <= endMonth;
    });

    const groupMap = new Map<string, { labour: number; expense: number; total: number }>();
    const groups = (data.groups || []).filter(g => !g.deleted);

    groups.forEach(g => groupMap.set(g.id, { labour: 0, expense: 0, total: 0 }));

    payments.forEach(payment => {
      const existing = groupMap.get(payment.groupId) || { labour: 0, expense: 0, total: 0 };
      if (payment.paymentFor === 'labour') {
        existing.labour += payment.amount;
      } else {
        existing.expense += payment.amount;
      }
      existing.total += payment.amount;
      groupMap.set(payment.groupId, existing);
    });

    return groupMap;
  }, [data.payments, data.groups, startMonth, endMonth]);

  const totalPayments = useMemo(() => {
    let labour = 0, expense = 0;
    paymentsByGroup.forEach(p => {
      labour += p.labour;
      expense += p.expense;
    });
    return { labour, expense, total: labour + expense };
  }, [paymentsByGroup]);

  const balanceDue = grandTotal - totalPayments.total;

  // Chart data
  const workerChartData = monthlyReport.workers
    .filter(w => w.totalCost > 0)
    .map(w => ({ name: w.workerName.substring(0, 10), cost: w.totalCost }));

  const activityChartData = activityReport
    .filter(a => a.totalCost > 0)
    .map(a => ({ name: a.activityCode, cost: a.totalCost, fullName: a.activityName }));

  const areaChartData = areaReport
    .filter(a => a.totalCost > 0)
    .map(a => ({ name: a.areaCode, cost: a.totalCost, fullName: a.areaName }));

  const groupChartData = groupReport
    .filter(g => g.totalCost > 0 || (expensesByGroup.get(g.groupId) || 0) > 0)
    .map(g => ({
      name: isMarathi && g.marathiName ? g.marathiName : g.groupName,
      labour: g.totalCost,
      expenses: expensesByGroup.get(g.groupId) || 0,
    }));

  const tabs = [
    { id: 'group', label: t('costByGroup'), icon: Users2 },
    { id: 'worker', label: t('costByWorker'), icon: Users },
    { id: 'activity', label: t('costByActivity'), icon: ClipboardList },
    { id: 'area', label: t('costByArea'), icon: MapPin },
    { id: 'custom', label: t('customPeriod'), icon: Calendar },
  ];

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={t('reports')}
        subtitle="View cost summaries and analytics"
      />

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="flex overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-graminno-600 text-graminno-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cost by Group */}
      {activeTab === 'group' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex flex-wrap gap-4">
              <Select
                label={t('from')}
                value={startMonth}
                onChange={e => setStartMonth(e.target.value)}
                options={monthOptions}
                className="flex-1 min-w-[150px]"
              />
              <Select
                label={t('to')}
                value={endMonth}
                onChange={e => setEndMonth(e.target.value)}
                options={monthOptions}
                className="flex-1 min-w-[150px]"
              />
            </div>
          </div>

          {/* Summary Cards - Row 1: Costs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-graminno-600 text-white rounded-xl p-5 shadow-sm">
              <div className="text-sm opacity-80">{isMarathi ? 'एकूण खर्च' : 'Total Cost'}</div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(grandTotal)}</div>
              <div className="text-xs opacity-80 mt-1">
                {formatMonthYear(startMonth)} - {formatMonthYear(endMonth)}
              </div>
            </div>
            <div className="bg-blue-600 text-white rounded-xl p-5 shadow-sm">
              <div className="text-sm opacity-80">{isMarathi ? 'मजूर खर्च' : 'Labour Cost'}</div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(totalLabourCost)}</div>
              <div className="text-xs opacity-80 mt-1">
                {groupReport.reduce((sum, g) => sum + g.totalDays, 0)} {isMarathi ? 'दिवस' : 'days'}
              </div>
            </div>
            <div className="bg-amber-600 text-white rounded-xl p-5 shadow-sm">
              <div className="text-sm opacity-80">{isMarathi ? 'इतर खर्च' : 'Sundry Expenses'}</div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(totalExpenses)}</div>
              <div className="text-xs opacity-80 mt-1">
                {((totalExpenses / grandTotal) * 100 || 0).toFixed(1)}% {isMarathi ? 'एकूण' : 'of total'}
              </div>
            </div>
          </div>

          {/* Summary Cards - Row 2: Payments & Balance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-600 text-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm opacity-80">
                <CreditCard size={16} />
                {isMarathi ? 'एकूण पेमेंट' : 'Total Payments'}
              </div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(totalPayments.total)}</div>
              <div className="text-xs opacity-80 mt-1">
                {isMarathi ? 'मजूर' : 'Labour'}: {formatCurrency(totalPayments.labour)} | {isMarathi ? 'खर्च' : 'Exp'}: {formatCurrency(totalPayments.expense)}
              </div>
            </div>
            <div className={`${balanceDue > 0 ? 'bg-red-600' : 'bg-slate-600'} text-white rounded-xl p-5 shadow-sm`}>
              <div className="flex items-center gap-2 text-sm opacity-80">
                {balanceDue > 0 && <AlertCircle size={16} />}
                {isMarathi ? 'बाकी रक्कम' : 'Balance Due'}
              </div>
              <div className="text-2xl font-bold mt-1">{formatCurrency(Math.max(0, balanceDue))}</div>
              <div className="text-xs opacity-80 mt-1">
                {balanceDue <= 0
                  ? (isMarathi ? 'पूर्ण भरणा झाला' : 'Fully paid')
                  : `${((totalPayments.total / grandTotal) * 100 || 0).toFixed(0)}% ${isMarathi ? 'भरणा' : 'paid'}`
                }
              </div>
            </div>
            <div className="bg-slate-100 text-slate-700 rounded-xl p-5 shadow-sm border border-slate-200">
              <div className="text-sm text-slate-500">{isMarathi ? 'सारांश' : 'Summary'}</div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>{isMarathi ? 'खर्च' : 'Costs'}:</span>
                  <span className="font-medium">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>{isMarathi ? 'पेमेंट' : 'Paid'}:</span>
                  <span className="font-medium">- {formatCurrency(totalPayments.total)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-300 pt-1 font-bold">
                  <span>{isMarathi ? 'बाकी' : 'Due'}:</span>
                  <span className={balanceDue > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(balanceDue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stacked Bar Chart */}
          {groupChartData.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-medium text-slate-800 mb-4">{t('costByGroup')}</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar
                      dataKey="labour"
                      name={isMarathi ? 'मजूर' : 'Labour'}
                      stackId="a"
                      fill="#3B82F6"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="expenses"
                      name={isMarathi ? 'खर्च' : 'Expenses'}
                      stackId="a"
                      fill="#F59E0B"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-3 font-medium text-slate-600">{t('group')}</th>
                    <th className="text-right py-3 px-3 font-medium text-blue-600">{isMarathi ? 'मजूर' : 'Labour'}</th>
                    <th className="text-right py-3 px-3 font-medium text-amber-600">{isMarathi ? 'खर्च' : 'Exp.'}</th>
                    <th className="text-right py-3 px-3 font-medium text-slate-600">{isMarathi ? 'एकूण' : 'Total'}</th>
                    <th className="text-right py-3 px-3 font-medium text-green-600">{isMarathi ? 'पेमेंट' : 'Paid'}</th>
                    <th className="text-right py-3 px-3 font-medium text-red-600">{isMarathi ? 'बाकी' : 'Due'}</th>
                  </tr>
                </thead>
                <tbody>
                  {groupReport
                    .filter(g => g.totalCost > 0 || (expensesByGroup.get(g.groupId) || 0) > 0 || (paymentsByGroup.get(g.groupId)?.total || 0) > 0)
                    .map(group => {
                      const groupExpense = expensesByGroup.get(group.groupId) || 0;
                      const groupPayment = paymentsByGroup.get(group.groupId)?.total || 0;
                      const groupTotal = group.totalCost + groupExpense;
                      const groupBalance = groupTotal - groupPayment;
                      return (
                        <tr key={group.groupId} className="border-b border-slate-100">
                          <td className="py-3 px-3">
                            <div className="font-medium text-slate-800">
                              {isMarathi && group.marathiName ? group.marathiName : group.groupName}
                            </div>
                            {isMarathi && group.marathiName && (
                              <div className="text-xs text-slate-400">{group.groupName}</div>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-blue-600">{formatCurrency(group.totalCost)}</td>
                          <td className="py-3 px-3 text-right text-amber-600">{formatCurrency(groupExpense)}</td>
                          <td className="py-3 px-3 text-right font-medium text-slate-800">{formatCurrency(groupTotal)}</td>
                          <td className="py-3 px-3 text-right text-green-600">{formatCurrency(groupPayment)}</td>
                          <td className={`py-3 px-3 text-right font-medium ${groupBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(groupBalance)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot className="bg-graminno-50">
                  <tr>
                    <td className="py-3 px-3 font-bold text-graminno-800">{t('total')}</td>
                    <td className="py-3 px-3 text-right font-bold text-blue-700">
                      {formatCurrency(totalLabourCost)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-amber-700">
                      {formatCurrency(totalExpenses)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-graminno-800">
                      {formatCurrency(grandTotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-green-700">
                      {formatCurrency(totalPayments.total)}
                    </td>
                    <td className={`py-3 px-3 text-right font-bold ${balanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {formatCurrency(balanceDue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cost by Worker */}
      {activeTab === 'worker' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <Select
              label={t('selectMonth')}
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              options={monthOptions}
              className="max-w-xs"
            />
          </div>

          {/* Summary Card */}
          <div className="bg-graminno-600 text-white rounded-xl p-6 shadow-sm">
            <div className="text-sm opacity-80">{formatMonthYear(selectedMonth)} - {t('totalCost')}</div>
            <div className="text-3xl font-bold mt-1">{formatCurrency(monthlyReport.totalCost)}</div>
            <div className="text-sm opacity-80 mt-2">{monthlyReport.totalDays} total days worked</div>
          </div>

          {/* Chart */}
          {workerChartData.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-medium text-slate-800 mb-4">Cost Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workerChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="cost" fill="#1B6B7C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">{t('worker')}</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">{t('dailyRate')}</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">{t('daysWorked')}</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">{t('halfDay')}</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">{t('total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReport.workers
                    .filter(w => w.totalCost > 0)
                    .map(worker => (
                      <tr key={worker.workerId} className="border-b border-slate-100">
                        <td className="py-3 px-4 font-medium text-slate-800">{worker.workerName}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{formatCurrency(worker.dailyRate)}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{worker.daysWorked}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{worker.halfDays}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(worker.totalCost)}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot className="bg-graminno-50">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 font-bold text-graminno-800">{t('total')}</td>
                    <td className="py-3 px-4 text-right font-bold text-graminno-800">{formatCurrency(monthlyReport.totalCost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cost by Activity */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex flex-wrap gap-4">
              <Select
                label={t('from')}
                value={startMonth}
                onChange={e => setStartMonth(e.target.value)}
                options={monthOptions}
                className="flex-1 min-w-[150px]"
              />
              <Select
                label={t('to')}
                value={endMonth}
                onChange={e => setEndMonth(e.target.value)}
                options={monthOptions}
                className="flex-1 min-w-[150px]"
              />
            </div>
          </div>

          {/* Pie Chart */}
          {activityChartData.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-medium text-slate-800 mb-4">Cost by Activity</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={activityChartData}
                      dataKey="cost"
                      nameKey="fullName"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {activityChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">{t('code')}</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">{t('activity')}</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">{t('daysWorked')}</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">{t('totalCost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {activityReport
                    .filter(a => a.totalCost > 0)
                    .map(activity => (
                      <tr key={activity.activityCode} className="border-b border-slate-100">
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-mono text-xs">
                            {activity.activityCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{activity.activityName}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{activity.totalDays}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(activity.totalCost)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Cost by Area */}
      {activeTab === 'area' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex flex-wrap gap-4">
              <Select
                label={t('from')}
                value={startMonth}
                onChange={e => setStartMonth(e.target.value)}
                options={monthOptions}
                className="flex-1 min-w-[150px]"
              />
              <Select
                label={t('to')}
                value={endMonth}
                onChange={e => setEndMonth(e.target.value)}
                options={monthOptions}
                className="flex-1 min-w-[150px]"
              />
            </div>
          </div>

          {/* Chart */}
          {areaChartData.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
              <h3 className="font-medium text-slate-800 mb-4">Cost by Area</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="cost" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">{t('code')}</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">{t('area')}</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">{t('daysWorked')}</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">{t('totalCost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {areaReport
                    .filter(a => a.totalCost > 0)
                    .map(area => (
                      <tr key={area.areaCode} className="border-b border-slate-100">
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono text-xs">
                            {area.areaCode}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">{area.areaName}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{area.totalDays}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(area.totalCost)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Custom Period */}
      {activeTab === 'custom' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex flex-wrap gap-4">
              <Select
                label={t('from')}
                value={startMonth}
                onChange={e => setStartMonth(e.target.value)}
                options={monthOptions}
                className="flex-1 min-w-[150px]"
              />
              <Select
                label={t('to')}
                value={endMonth}
                onChange={e => setEndMonth(e.target.value)}
                options={monthOptions}
                className="flex-1 min-w-[150px]"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-graminno-600 text-white rounded-xl p-6 shadow-sm">
            <div className="text-sm opacity-80">
              {formatMonthYear(startMonth)} - {formatMonthYear(endMonth)}
            </div>
            <div className="text-3xl font-bold mt-1">
              {formatCurrency(workerPeriodReport.reduce((sum, w) => sum + w.totalCost, 0))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-slate-600">{t('worker')}</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">{t('daysWorked')}</th>
                    <th className="text-center py-3 px-4 font-medium text-slate-600">{t('halfDay')}</th>
                    <th className="text-right py-3 px-4 font-medium text-slate-600">{t('totalCost')}</th>
                  </tr>
                </thead>
                <tbody>
                  {workerPeriodReport
                    .filter(w => w.totalCost > 0)
                    .map(worker => (
                      <tr key={worker.workerId} className="border-b border-slate-100">
                        <td className="py-3 px-4 font-medium text-slate-800">{worker.workerName}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{worker.daysWorked}</td>
                        <td className="py-3 px-4 text-center text-slate-600">{worker.halfDays}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-800">{formatCurrency(worker.totalCost)}</td>
                      </tr>
                    ))}
                </tbody>
                <tfoot className="bg-graminno-50">
                  <tr>
                    <td colSpan={3} className="py-3 px-4 font-bold text-graminno-800">{t('total')}</td>
                    <td className="py-3 px-4 text-right font-bold text-graminno-800">
                      {formatCurrency(workerPeriodReport.reduce((sum, w) => sum + w.totalCost, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
