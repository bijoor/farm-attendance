import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Select from '../components/ui/Select';
import { format } from 'date-fns';
import {
  calculateLabourCostByGroup,
  formatCurrency,
  formatMonthYear,
} from '../utils/calculations';
import { Users2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, IndianRupee, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import Button from '../components/ui/Button';
import { parseISO } from 'date-fns';

const LabourCost: React.FC = () => {
  const { data, settings } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

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

  const prevMonth = () => {
    const date = parseISO(`${selectedMonth}-01`);
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(format(date, 'yyyy-MM'));
  };

  const nextMonth = () => {
    const date = parseISO(`${selectedMonth}-01`);
    date.setMonth(date.getMonth() + 1);
    setSelectedMonth(format(date, 'yyyy-MM'));
  };

  const labourCostData = calculateLabourCostByGroup(data, selectedMonth);
  const grandTotalCost = labourCostData.reduce((sum, g) => sum + g.totalCost, 0);
  const grandTotalDays = labourCostData.reduce((sum, g) => sum + g.totalDays, 0);

  // Calculate payments for each group
  const groupPayments = useMemo(() => {
    const payments = (data.payments || []).filter(
      p => !p.deleted && p.month === selectedMonth && p.paymentFor === 'labour'
    );
    const paymentsByGroup: { [groupId: string]: number } = {};
    payments.forEach(p => {
      paymentsByGroup[p.groupId] = (paymentsByGroup[p.groupId] || 0) + p.amount;
    });
    return paymentsByGroup;
  }, [data.payments, selectedMonth]);

  const grandTotalPaid = Object.values(groupPayments).reduce((sum, amt) => sum + amt, 0);
  const grandTotalBalance = grandTotalCost - grandTotalPaid;

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(labourCostData.map(g => g.groupId)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const getGroupName = (group: { groupName: string; marathiName?: string }) => {
    if (isMarathi && group.marathiName) return group.marathiName;
    return group.groupName;
  };

  const getWorkerName = (worker: { workerName: string; marathiName?: string }) => {
    if (isMarathi && worker.marathiName) return worker.marathiName;
    return worker.workerName;
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={t('labourCost')}
        subtitle={isMarathi ? 'मासिक मजूर खर्च आणि देय रक्कम' : 'Monthly labour cost and payable amount'}
      />

      {/* Month selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-6">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={prevMonth}>
            <ChevronLeft size={20} />
          </Button>

          <Select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            options={monthOptions}
            className="flex-1 max-w-xs"
          />

          <Button variant="ghost" onClick={nextMonth}>
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      {/* Grand Total Summary */}
      <div className="bg-graminno-600 text-white rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 text-sm opacity-80 mb-1">
          <IndianRupee size={16} />
          {formatMonthYear(selectedMonth)} - {t('totalCost')}
        </div>
        <div className="text-3xl font-bold">{formatCurrency(grandTotalCost)}</div>
        <div className="text-sm opacity-80 mt-2">
          {grandTotalDays} {isMarathi ? 'एकूण दिवस' : 'total days'} | {labourCostData.length} {isMarathi ? 'गट' : 'groups'}
        </div>
        {/* Payment summary */}
        <div className="mt-4 pt-4 border-t border-graminno-500 grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs opacity-70">{isMarathi ? 'भरले' : 'Paid'}</div>
            <div className="text-lg font-semibold">{formatCurrency(grandTotalPaid)}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">{isMarathi ? 'बाकी' : 'Balance'}</div>
            <div className="text-lg font-semibold">{formatCurrency(grandTotalBalance)}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">{isMarathi ? 'स्थिती' : 'Status'}</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {grandTotalBalance <= 0 ? (
                <>
                  <CheckCircle size={16} />
                  <span className="text-sm">{isMarathi ? 'पूर्ण' : 'Paid'}</span>
                </>
              ) : grandTotalPaid > 0 ? (
                <>
                  <Clock size={16} className="text-yellow-300" />
                  <span className="text-sm">{isMarathi ? 'अंशतः' : 'Partial'}</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-red-300" />
                  <span className="text-sm">{isMarathi ? 'प्रलंबित' : 'Pending'}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expand/Collapse buttons */}
      {labourCostData.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={expandAll}
            className="text-sm text-graminno-600 hover:text-graminno-700 flex items-center gap-1"
          >
            <ChevronDown size={16} />
            {isMarathi ? 'सर्व उघडा' : 'Expand All'}
          </button>
          <span className="text-slate-300">|</span>
          <button
            onClick={collapseAll}
            className="text-sm text-graminno-600 hover:text-graminno-700 flex items-center gap-1"
          >
            <ChevronUp size={16} />
            {isMarathi ? 'सर्व बंद करा' : 'Collapse All'}
          </button>
        </div>
      )}

      {/* No data message */}
      {labourCostData.length === 0 && (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
          <Users2 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500">
            {isMarathi ? 'या महिन्यासाठी कोणताही डेटा नाही' : 'No attendance data for this month'}
          </p>
        </div>
      )}

      {/* Groups with worker details */}
      <div className="space-y-4">
        {labourCostData.map(group => {
          const isExpanded = expandedGroups.has(group.groupId);
          const groupPaid = groupPayments[group.groupId] || 0;
          const groupBalance = group.totalCost - groupPaid;
          const paymentStatus = groupBalance <= 0 ? 'paid' : groupPaid > 0 ? 'partial' : 'pending';

          return (
            <div key={group.groupId} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Group header - clickable */}
              <button
                onClick={() => toggleGroup(group.groupId)}
                className="w-full px-4 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    paymentStatus === 'paid' ? 'bg-green-100' :
                    paymentStatus === 'partial' ? 'bg-yellow-100' : 'bg-graminno-100'
                  }`}>
                    {paymentStatus === 'paid' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : paymentStatus === 'partial' ? (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    ) : (
                      <Users2 className="h-5 w-5 text-graminno-600" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-800">
                      {getGroupName(group)}
                    </div>
                    {isMarathi && group.marathiName && (
                      <div className="text-xs text-slate-400">{group.groupName}</div>
                    )}
                    {!isMarathi && group.marathiName && (
                      <div className="text-xs text-slate-400">{group.marathiName}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-graminno-700">{formatCurrency(group.totalCost)}</div>
                    <div className="text-xs text-slate-500">
                      {groupPaid > 0 && (
                        <span className={groupBalance <= 0 ? 'text-green-600' : 'text-yellow-600'}>
                          {isMarathi ? 'भरले' : 'Paid'}: {formatCurrency(groupPaid)}
                          {groupBalance > 0 && ` | ${isMarathi ? 'बाकी' : 'Due'}: ${formatCurrency(groupBalance)}`}
                        </span>
                      )}
                      {groupPaid === 0 && (
                        <span>
                          {group.totalDays} {isMarathi ? 'दिवस' : 'days'} | {group.workers.length} {isMarathi ? 'कामगार' : 'workers'}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Worker details table - expandable */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-slate-600">{t('worker')}</th>
                        <th className="text-center py-3 px-4 font-medium text-slate-600">{t('daysWorked')}</th>
                        <th className="text-center py-3 px-4 font-medium text-slate-600">{t('halfDay')}</th>
                        <th className="text-center py-3 px-4 font-medium text-slate-600">{t('totalDays')}</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('dailyRate')}</th>
                        <th className="text-right py-3 px-4 font-medium text-slate-600">{t('total')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.workers.map(worker => (
                        <tr key={worker.workerId} className="border-b border-slate-100">
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{getWorkerName(worker)}</div>
                            {isMarathi && worker.marathiName && (
                              <div className="text-xs text-slate-400">{worker.workerName}</div>
                            )}
                            {!isMarathi && worker.marathiName && (
                              <div className="text-xs text-slate-400">{worker.marathiName}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-600">{worker.daysWorked}</td>
                          <td className="py-3 px-4 text-center text-slate-600">{worker.halfDays}</td>
                          <td className="py-3 px-4 text-center font-medium text-slate-700">{worker.totalDays}</td>
                          <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(worker.dailyRate)}</td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(worker.totalCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-graminno-50">
                      <tr>
                        <td className="py-3 px-4 font-bold text-graminno-800">{t('groupTotal')}</td>
                        <td className="py-3 px-4 text-center font-medium text-graminno-700">
                          {group.workers.reduce((sum, w) => sum + w.daysWorked, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-graminno-700">
                          {group.workers.reduce((sum, w) => sum + w.halfDays, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-graminno-700">{group.totalDays}</td>
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4 text-right font-bold text-graminno-800">{formatCurrency(group.totalCost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand total footer */}
      {labourCostData.length > 0 && (
        <div className={`mt-6 rounded-xl p-6 shadow-sm ${
          grandTotalBalance <= 0 ? 'bg-green-700' : grandTotalPaid > 0 ? 'bg-yellow-600' : 'bg-slate-800'
        } text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80 mb-1">{isMarathi ? 'बाकी रक्कम' : 'Balance Due'}</div>
              <div className="text-2xl font-bold">{formatCurrency(grandTotalBalance)}</div>
              {grandTotalBalance <= 0 && (
                <div className="flex items-center gap-1 mt-1 text-sm">
                  <CheckCircle size={16} />
                  {isMarathi ? 'सर्व पेमेंट पूर्ण' : 'All payments complete'}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm opacity-80">{isMarathi ? 'एकूण खर्च' : 'Total Cost'}</div>
              <div className="text-lg font-semibold">{formatCurrency(grandTotalCost)}</div>
              <div className="text-sm opacity-80 mt-1">{isMarathi ? 'भरलेले' : 'Paid'}: {formatCurrency(grandTotalPaid)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabourCost;
