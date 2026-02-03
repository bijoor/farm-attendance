import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/layout/PageHeader';
import Select from '../components/ui/Select';
import { format, parseISO } from 'date-fns';
import {
  calculateGroupMonthBalance,
  calculateLabourCostByGroup,
  calculateExpensesByGroup,
  calculatePaymentsByGroup,
  formatCurrency,
} from '../utils/calculations';
import { Users2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../components/ui/Button';

const Accounts: React.FC = () => {
  const { data, settings } = useApp();
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

  // Calculate expense details for breakdown
  const expenseData = useMemo(() =>
    calculateExpensesByGroup(data, selectedMonth),
    [data, selectedMonth]
  );

  // Calculate payment details for breakdown
  const paymentData = useMemo(() =>
    calculatePaymentsByGroup(data, selectedMonth),
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

  const formatBalance = (amount: number) => {
    if (amount < 0) {
      return {
        text: formatCurrency(Math.abs(amount)),
        suffix: isMarathi ? ' (जमा)' : ' (Cr)',
        color: 'text-green-700',
      };
    }
    return {
      text: formatCurrency(amount),
      suffix: '',
      color: amount > 0 ? 'text-red-700' : 'text-slate-800',
    };
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={isMarathi ? 'खाते' : 'Accounts'}
        subtitle={isMarathi ? 'मासिक खर्च, पेमेंट आणि बाकी' : 'Monthly costs, payments, and balance'}
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

      {/* Per-group statements */}
      <div className="space-y-4">
        {balanceReport.map(group => {
          const isExpanded = expandedGroups.has(group.groupId);
          const labourData = labourCostData.find(l => l.groupId === group.groupId);
          const groupExpenses = expenseData.find(e => e.groupId === group.groupId);
          const groupPayments = paymentData.find(p => p.groupId === group.groupId);
          const closing = formatBalance(group.closingBalance);

          return (
            <div key={group.groupId} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Group header — mini statement */}
              <button
                onClick={() => toggleGroup(group.groupId)}
                className="w-full text-left px-4 py-4 hover:bg-slate-50 transition-colors"
              >
                {/* Group name row */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-slate-800">
                      {getGroupName(group)}
                    </span>
                    {group.marathiName && (
                      <span className="text-xs text-slate-400 ml-2">
                        {isMarathi ? group.groupName : group.marathiName}
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                  )}
                </div>

                {/* Mini statement lines */}
                <div className="space-y-1 text-sm">
                  {group.openingBalance !== 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>{isMarathi ? 'मागील बाकी' : 'Opening Balance'}</span>
                      <span className={group.openingBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                        {group.openingBalance < 0
                          ? `${formatCurrency(Math.abs(group.openingBalance))} ${isMarathi ? 'जमा' : 'Cr'}`
                          : formatCurrency(group.openingBalance)
                        }
                      </span>
                    </div>
                  )}
                  {group.labourCost > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>(+) {isMarathi ? 'मजूर' : 'Labour'}</span>
                      <span>{formatCurrency(group.labourCost)}</span>
                    </div>
                  )}
                  {group.expenseCost > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>(+) {isMarathi ? 'खर्च' : 'Expenses'}</span>
                      <span>{formatCurrency(group.expenseCost)}</span>
                    </div>
                  )}
                  {group.totalPayments > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>(-) {isMarathi ? 'भरले' : 'Payments'}</span>
                      <span className="text-green-700">{formatCurrency(group.totalPayments)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-1 mt-1 flex justify-between font-semibold">
                    <span className="text-slate-700">
                      {group.closingBalance < 0
                        ? (isMarathi ? 'जमा शिल्लक' : 'Credit Balance')
                        : (isMarathi ? 'बाकी रक्कम' : 'Balance Due')
                      }
                    </span>
                    <span className={closing.color}>
                      {closing.text}{closing.suffix}
                    </span>
                  </div>
                </div>
              </button>

              {/* Expanded details — continuous statement flow */}
              {isExpanded && (
                <div className="border-t border-slate-200 px-4 py-3">
                  {/* Labour details */}
                  {labourData && labourData.workers.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        {isMarathi ? 'मजूर खर्च' : 'Labour Costs'}
                      </div>
                      <div className="space-y-1 text-sm">
                        {labourData.workers.map(worker => (
                          <div key={worker.workerId} className="flex justify-between items-baseline">
                            <div className="flex-1 min-w-0">
                              <span className="text-slate-700">{getWorkerName(worker)}</span>
                              {worker.marathiName && (
                                <span className="text-xs text-slate-400 ml-1">
                                  {isMarathi ? worker.workerName : worker.marathiName}
                                </span>
                              )}
                              <span className="text-slate-400 text-xs ml-1">
                                {worker.totalDays}d × {formatCurrency(worker.dailyRate)}
                              </span>
                            </div>
                            <span className="text-slate-800 font-medium ml-2 tabular-nums">
                              {formatCurrency(worker.totalCost)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-slate-700 mt-1 pt-1 border-t border-dashed border-slate-200">
                        <span>{isMarathi ? 'एकूण मजूर' : 'Subtotal Labour'}</span>
                        <span className="tabular-nums">{formatCurrency(labourData.totalCost)}</span>
                      </div>
                    </div>
                  )}

                  {/* Expense details */}
                  {groupExpenses && groupExpenses.expenses.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        {isMarathi ? 'इतर खर्च' : 'Other Expenses'}
                      </div>
                      <div className="space-y-1 text-sm">
                        {groupExpenses.expenses.map(expense => (
                          <div key={expense.id} className="flex justify-between items-baseline">
                            <div className="flex-1 min-w-0">
                              <span className="text-slate-400 text-xs mr-2">
                                {format(parseISO(expense.date), 'dd MMM')}
                              </span>
                              <span className="text-slate-700">{expense.description}</span>
                              {expense.isShared && (
                                <span className="text-xs text-amber-600 ml-1">
                                  ({isMarathi ? 'सामायिक' : 'Shared'})
                                </span>
                              )}
                            </div>
                            <span className="text-slate-800 font-medium ml-2 tabular-nums">
                              {expense.isShared ? formatCurrency(expense.allocatedAmount || 0) : formatCurrency(expense.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-slate-700 mt-1 pt-1 border-t border-dashed border-slate-200">
                        <span>{isMarathi ? 'एकूण खर्च' : 'Subtotal Expenses'}</span>
                        <span className="tabular-nums">{formatCurrency(groupExpenses.totalExpenses)}</span>
                      </div>
                    </div>
                  )}

                  {/* Payment details */}
                  {groupPayments && groupPayments.payments.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        {isMarathi ? 'पेमेंट' : 'Payments'}
                      </div>
                      <div className="space-y-1 text-sm">
                        {groupPayments.payments.map(payment => (
                          <div key={payment.id} className="flex justify-between items-baseline">
                            <div className="flex-1 min-w-0">
                              <span className="text-slate-400 text-xs mr-2">
                                {format(parseISO(payment.date), 'dd MMM')}
                              </span>
                              <span className="text-slate-700">{payment.description || (isMarathi ? 'पेमेंट' : 'Payment')}</span>
                            </div>
                            <span className="text-green-700 font-medium ml-2 tabular-nums">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-sm font-semibold text-slate-700 mt-1 pt-1 border-t border-dashed border-slate-200">
                        <span>{isMarathi ? 'एकूण पेमेंट' : 'Total Payments'}</span>
                        <span className="tabular-nums text-green-700">{formatCurrency(groupPayments.totalPayments)}</span>
                      </div>
                    </div>
                  )}

                  {/* No data */}
                  {(!labourData || labourData.workers.length === 0) &&
                   (!groupExpenses || groupExpenses.expenses.length === 0) &&
                   (!groupPayments || groupPayments.payments.length === 0) && (
                    <div className="text-sm text-slate-500 text-center py-2">
                      {isMarathi ? 'या महिन्यात कोणताही तपशील नाही' : 'No details for this month'}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Grand Summary Table */}
      {balanceReport.length > 0 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <span className="font-semibold text-slate-700 text-sm">
              {isMarathi ? 'सारांश' : 'Summary'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left py-2 px-3 font-medium text-slate-600">{isMarathi ? 'गट' : 'Group'}</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">{isMarathi ? 'मागील' : 'Opening'}</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">{isMarathi ? 'मजूर' : 'Labour'}</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">{isMarathi ? 'खर्च' : 'Expense'}</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">{isMarathi ? 'भरले' : 'Paid'}</th>
                  <th className="text-right py-2 px-3 font-medium text-slate-600">{isMarathi ? 'बाकी' : 'Due'}</th>
                </tr>
              </thead>
              <tbody>
                {balanceReport.map(group => {
                  const cb = formatBalance(group.closingBalance);
                  return (
                    <tr key={group.groupId} className="border-b border-slate-100">
                      <td className="py-2 px-3 text-slate-700 font-medium">{getGroupName(group)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-600">
                        {group.openingBalance !== 0 ? (
                          <span className={group.openingBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                            {group.openingBalance < 0
                              ? `${formatCurrency(Math.abs(group.openingBalance))} ${isMarathi ? 'जमा' : 'Cr'}`
                              : formatCurrency(group.openingBalance)
                            }
                          </span>
                        ) : '–'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-600">
                        {group.labourCost > 0 ? formatCurrency(group.labourCost) : '–'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-600">
                        {group.expenseCost > 0 ? formatCurrency(group.expenseCost) : '–'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-green-700">
                        {group.totalPayments > 0 ? formatCurrency(group.totalPayments) : '–'}
                      </td>
                      <td className={`py-2 px-3 text-right tabular-nums font-semibold ${cb.color}`}>
                        {cb.text}{cb.suffix}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td className="py-2 px-3 text-slate-800">{isMarathi ? 'एकूण' : 'TOTAL'}</td>
                  <td className="py-2 px-3 text-right tabular-nums">
                    {grandTotals.openingBalance !== 0 ? (
                      <span className={grandTotals.openingBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                        {grandTotals.openingBalance < 0
                          ? `${formatCurrency(Math.abs(grandTotals.openingBalance))} ${isMarathi ? 'जमा' : 'Cr'}`
                          : formatCurrency(grandTotals.openingBalance)
                        }
                      </span>
                    ) : '–'}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-slate-800">
                    {grandTotals.labourCost > 0 ? formatCurrency(grandTotals.labourCost) : '–'}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-slate-800">
                    {grandTotals.expenseCost > 0 ? formatCurrency(grandTotals.expenseCost) : '–'}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-green-700">
                    {grandTotals.totalPayments > 0 ? formatCurrency(grandTotals.totalPayments) : '–'}
                  </td>
                  <td className={`py-2 px-3 text-right tabular-nums font-bold ${
                    grandTotals.closingBalance < 0 ? 'text-green-700' : grandTotals.closingBalance > 0 ? 'text-red-700' : 'text-slate-800'
                  }`}>
                    {formatBalance(grandTotals.closingBalance).text}
                    {formatBalance(grandTotals.closingBalance).suffix}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Total Amount Due callout */}
          <div className={`px-4 py-3 border-t border-slate-200 flex items-center justify-between ${
            grandTotals.closingBalance <= 0 ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <span className={`font-semibold text-sm ${
              grandTotals.closingBalance <= 0 ? 'text-green-800' : 'text-red-800'
            }`}>
              {grandTotals.closingBalance < 0
                ? (isMarathi ? 'एकूण जमा शिल्लक' : 'Total Credit Balance')
                : grandTotals.closingBalance === 0
                  ? (isMarathi ? 'सर्व पेमेंट पूर्ण' : 'All Payments Clear')
                  : (isMarathi ? 'एकूण बाकी रक्कम' : 'Total Amount Due')
              }
            </span>
            <span className={`text-lg font-bold ${
              grandTotals.closingBalance <= 0 ? 'text-green-700' : 'text-red-700'
            }`}>
              {grandTotals.closingBalance === 0
                ? '✓'
                : `${formatCurrency(Math.abs(grandTotals.closingBalance))}${grandTotals.closingBalance < 0 ? (isMarathi ? ' जमा' : ' Cr') : ''}`
              }
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
