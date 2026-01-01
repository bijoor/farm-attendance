import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Select from '../components/ui/Select';
import { format } from 'date-fns';
import {
  calculateGroupMonthBalance,
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

  // Calculate balance report with opening/closing balances
  const balanceReport = useMemo(() =>
    calculateGroupMonthBalance(data, selectedMonth),
    [data, selectedMonth]
  );

  // Calculate labour cost details for worker breakdown
  const labourCostData = useMemo(() =>
    calculateLabourCostByGroup(data, selectedMonth),
    [data, selectedMonth]
  );

  // Grand totals
  const grandTotals = useMemo(() => {
    return balanceReport.reduce((acc, g) => ({
      openingBalance: acc.openingBalance + g.openingBalance,
      labourCost: acc.labourCost + g.labourCost,
      expenseCost: acc.expenseCost + g.expenseCost,
      totalCost: acc.totalCost + g.totalCost,
      totalPayments: acc.totalPayments + g.totalPayments,
      currentMonthBalance: acc.currentMonthBalance + g.currentMonthBalance,
      closingBalance: acc.closingBalance + g.closingBalance,
    }), {
      openingBalance: 0,
      labourCost: 0,
      expenseCost: 0,
      totalCost: 0,
      totalPayments: 0,
      currentMonthBalance: 0,
      closingBalance: 0,
    });
  }, [balanceReport]);

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
    setExpandedGroups(new Set(balanceReport.map(g => g.groupId)));
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
          {formatMonthYear(selectedMonth)}
        </div>

        {/* Opening Balance */}
        {grandTotals.openingBalance !== 0 && (
          <div className="mb-3 pb-3 border-b border-graminno-500">
            <div className="text-xs opacity-70">{isMarathi ? 'मागील बाकी' : 'Opening Balance'}</div>
            <div className={`text-xl font-semibold ${grandTotals.openingBalance > 0 ? 'text-red-300' : 'text-green-300'}`}>
              {formatCurrency(grandTotals.openingBalance)}
            </div>
          </div>
        )}

        {/* Current Month Summary */}
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div>
            <div className="text-xs opacity-70">{isMarathi ? 'मजूर' : 'Labour'}</div>
            <div className="text-lg font-semibold">{formatCurrency(grandTotals.labourCost)}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">{isMarathi ? 'खर्च' : 'Expenses'}</div>
            <div className="text-lg font-semibold">{formatCurrency(grandTotals.expenseCost)}</div>
          </div>
          <div>
            <div className="text-xs opacity-70">{isMarathi ? 'भरले' : 'Paid'}</div>
            <div className="text-lg font-semibold">{formatCurrency(grandTotals.totalPayments)}</div>
          </div>
        </div>

        {/* Closing Balance */}
        <div className="pt-3 border-t border-graminno-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs opacity-70">{isMarathi ? 'एकूण बाकी' : 'Total Balance Due'}</div>
              <div className={`text-2xl font-bold ${grandTotals.closingBalance <= 0 ? 'text-green-300' : ''}`}>
                {formatCurrency(grandTotals.closingBalance)}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {grandTotals.closingBalance <= 0 ? (
                <>
                  <CheckCircle size={20} />
                  <span className="text-sm">{isMarathi ? 'पूर्ण' : 'All Clear'}</span>
                </>
              ) : grandTotals.totalPayments > 0 ? (
                <>
                  <Clock size={20} className="text-yellow-300" />
                  <span className="text-sm">{isMarathi ? 'अंशतः' : 'Partial'}</span>
                </>
              ) : (
                <>
                  <AlertCircle size={20} className="text-red-300" />
                  <span className="text-sm">{isMarathi ? 'प्रलंबित' : 'Pending'}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expand/Collapse buttons */}
      {balanceReport.length > 0 && (
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
      {balanceReport.length === 0 && (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
          <Users2 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500">
            {isMarathi ? 'या महिन्यासाठी कोणताही डेटा नाही' : 'No data for this month'}
          </p>
        </div>
      )}

      {/* Groups with balance details */}
      <div className="space-y-4">
        {balanceReport.map(group => {
          const isExpanded = expandedGroups.has(group.groupId);
          const labourData = labourCostData.find(l => l.groupId === group.groupId);
          const paymentStatus = group.closingBalance <= 0 ? 'paid' : group.totalPayments > 0 ? 'partial' : 'pending';

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
                    {/* Opening balance if any */}
                    {group.openingBalance !== 0 && (
                      <div className="text-xs text-slate-500 mb-1">
                        {isMarathi ? 'मागील बाकी' : 'Opening'}: <span className={group.openingBalance > 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(group.openingBalance)}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <div className="text-slate-400">{isMarathi ? 'मजूर' : 'Labour'}</div>
                        <div className="font-semibold text-slate-700">{formatCurrency(group.labourCost)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">{isMarathi ? 'खर्च' : 'Expense'}</div>
                        <div className="font-semibold text-slate-700">{formatCurrency(group.expenseCost)}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">{isMarathi ? 'भरले' : 'Paid'}</div>
                        <div className={`font-semibold ${group.totalPayments > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                          {formatCurrency(group.totalPayments)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400">{isMarathi ? 'बाकी' : 'Due'}</div>
                        <div className={`font-semibold ${
                          group.closingBalance <= 0 ? 'text-green-600' :
                          group.closingBalance < group.totalCost + group.openingBalance ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(group.closingBalance)}
                        </div>
                      </div>
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
              {isExpanded && labourData && labourData.workers.length > 0 && (
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
                      {labourData.workers.map(worker => (
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
                          {labourData.workers.reduce((sum, w) => sum + w.daysWorked, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-graminno-700">
                          {labourData.workers.reduce((sum, w) => sum + w.halfDays, 0)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-graminno-700">{labourData.totalDays}</td>
                        <td className="py-3 px-4"></td>
                        <td className="py-3 px-4 text-right font-bold text-graminno-800">{formatCurrency(labourData.totalCost)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              {isExpanded && (!labourData || labourData.workers.length === 0) && group.expenseCost > 0 && (
                <div className="p-4 text-sm text-slate-500">
                  {isMarathi ? 'या महिन्यात फक्त खर्च आहेत, मजूर नाहीत' : 'Only expenses this month, no labour costs'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand total footer */}
      {balanceReport.length > 0 && (
        <div className={`mt-6 rounded-xl p-6 shadow-sm ${
          grandTotals.closingBalance <= 0 ? 'bg-green-700' : grandTotals.totalPayments > 0 ? 'bg-yellow-600' : 'bg-slate-800'
        } text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm opacity-80 mb-1">{isMarathi ? 'एकूण बाकी' : 'Total Balance Due'}</div>
              <div className="text-2xl font-bold">{formatCurrency(grandTotals.closingBalance)}</div>
              {grandTotals.closingBalance <= 0 && (
                <div className="flex items-center gap-1 mt-1 text-sm">
                  <CheckCircle size={16} />
                  {isMarathi ? 'सर्व पेमेंट पूर्ण' : 'All payments complete'}
                </div>
              )}
            </div>
            <div className="text-right text-sm">
              {grandTotals.openingBalance !== 0 && (
                <div className="opacity-80">{isMarathi ? 'मागील बाकी' : 'Opening'}: {formatCurrency(grandTotals.openingBalance)}</div>
              )}
              <div className="opacity-80">{isMarathi ? 'या महिन्याचे' : 'This month'}: {formatCurrency(grandTotals.totalCost)}</div>
              <div className="opacity-80">{isMarathi ? 'भरलेले' : 'Paid'}: {formatCurrency(grandTotals.totalPayments)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabourCost;
