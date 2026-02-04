import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Users2, Printer } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';
import Button from './ui/Button';
import type { GroupMonthBalanceReport, GroupLabourCost, GroupExpenseSummary, GroupPaymentSummary } from '../utils/calculations';

interface AccountStatementProps {
  balanceReport: GroupMonthBalanceReport[];
  labourCostData: GroupLabourCost[];
  expenseData: GroupExpenseSummary[];
  paymentData: GroupPaymentSummary[];
  printTitle: string;
  printSubtitle: string;
  noDataMessage: string;
  isMarathi: boolean;
}

const AccountStatement: React.FC<AccountStatementProps> = ({
  balanceReport,
  labourCostData,
  expenseData,
  paymentData,
  printTitle,
  printSubtitle,
  noDataMessage,
  isMarathi,
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const expandAll = useCallback(() => {
    setExpandedGroups(new Set(balanceReport.map(g => g.groupId)));
  }, [balanceReport]);

  const collapseAll = () => setExpandedGroups(new Set());

  // Auto-expand all groups when printing (Cmd+P or Print button)
  useEffect(() => {
    const onBeforePrint = () => {
      setExpandedGroups(new Set(balanceReport.map(g => g.groupId)));
    };
    window.addEventListener('beforeprint', onBeforePrint);
    return () => window.removeEventListener('beforeprint', onBeforePrint);
  }, [balanceReport]);

  const handlePrint = () => {
    expandAll();
    setTimeout(() => window.print(), 100);
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const grandTotals = useMemo(() => {
    return balanceReport.reduce((acc, g) => ({
      openingBalance: acc.openingBalance + g.openingBalance,
      openingLabourBalance: acc.openingLabourBalance + g.openingLabourBalance,
      openingExpenseBalance: acc.openingExpenseBalance + g.openingExpenseBalance,
      labourCost: acc.labourCost + g.labourCost,
      expenseCost: acc.expenseCost + g.expenseCost,
      totalCost: acc.totalCost + g.totalCost,
      totalPayments: acc.totalPayments + g.totalPayments,
      labourPayments: acc.labourPayments + g.labourPayments,
      expensePayments: acc.expensePayments + g.expensePayments,
      currentMonthBalance: acc.currentMonthBalance + g.currentMonthBalance,
      closingBalance: acc.closingBalance + g.closingBalance,
      labourBalance: acc.labourBalance + g.labourBalance,
      expenseBalance: acc.expenseBalance + g.expenseBalance,
    }), {
      openingBalance: 0,
      openingLabourBalance: 0,
      openingExpenseBalance: 0,
      labourCost: 0,
      expenseCost: 0,
      totalCost: 0,
      totalPayments: 0,
      labourPayments: 0,
      expensePayments: 0,
      currentMonthBalance: 0,
      closingBalance: 0,
      labourBalance: 0,
      expenseBalance: 0,
    });
  }, [balanceReport]);

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
      return { text: formatCurrency(Math.abs(amount)), suffix: isMarathi ? ' (जमा)' : ' (Cr)', color: 'text-green-700' };
    }
    return { text: formatCurrency(amount), suffix: '', color: amount > 0 ? 'text-red-700' : 'text-slate-800' };
  };

  const formatBalanceCell = (amount: number) => {
    if (amount === 0) return { text: '–', color: 'text-slate-400' };
    if (amount < 0) return { text: `${formatCurrency(Math.abs(amount))} ${isMarathi ? 'जमा' : 'Cr'}`, color: 'text-green-600' };
    return { text: formatCurrency(amount), color: 'text-red-600' };
  };

  return (
    <>
      {/* Print-only header */}
      <div className="print-only print-header">
        <h1>{printTitle}</h1>
        <p>{printSubtitle}</p>
      </div>

      {/* Controls */}
      {balanceReport.length > 0 && (
        <div className="flex items-center justify-between mb-4 no-print">
          <div className="flex gap-2">
            <button onClick={expandAll} className="text-sm text-graminno-600 hover:text-graminno-700 flex items-center gap-1">
              <ChevronDown size={16} /> {isMarathi ? 'सर्व उघडा' : 'Expand All'}
            </button>
            <span className="text-slate-300">|</span>
            <button onClick={collapseAll} className="text-sm text-graminno-600 hover:text-graminno-700 flex items-center gap-1">
              <ChevronUp size={16} /> {isMarathi ? 'सर्व बंद करा' : 'Collapse All'}
            </button>
          </div>
          <Button variant="secondary" onClick={handlePrint} className="text-sm">
            <Printer size={16} />
            {isMarathi ? 'छापा' : 'Print'}
          </Button>
        </div>
      )}

      {/* No data */}
      {balanceReport.length === 0 && (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
          <Users2 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500">{noDataMessage}</p>
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
            <div key={group.groupId} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden print-group-card">
              <button
                onClick={() => toggleGroup(group.groupId)}
                className="w-full text-left px-4 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-semibold text-slate-800">{getGroupName(group)}</span>
                    {group.marathiName && (
                      <span className="text-xs text-slate-400 ml-2">
                        {isMarathi ? group.groupName : group.marathiName}
                      </span>
                    )}
                  </div>
                  {isExpanded
                    ? <ChevronUp className="h-5 w-5 text-slate-400 shrink-0 no-print" />
                    : <ChevronDown className="h-5 w-5 text-slate-400 shrink-0 no-print" />
                  }
                </div>

                {/* Mini statement */}
                <div className="space-y-1 text-sm">
                  {group.openingBalance !== 0 && (
                    <>
                      {group.openingLabourBalance !== 0 && (
                        <div className="flex justify-between text-slate-500">
                          <span>{isMarathi ? 'मागील मजूर बाकी' : 'Opening Labour Bal'}</span>
                          <span className={group.openingLabourBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                            {group.openingLabourBalance < 0
                              ? `${formatCurrency(Math.abs(group.openingLabourBalance))} ${isMarathi ? 'जमा' : 'Cr'}`
                              : formatCurrency(group.openingLabourBalance)
                            }
                          </span>
                        </div>
                      )}
                      {group.openingExpenseBalance !== 0 && (
                        <div className="flex justify-between text-slate-500">
                          <span>{isMarathi ? 'मागील खर्च बाकी' : 'Opening Expense Bal'}</span>
                          <span className={group.openingExpenseBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                            {group.openingExpenseBalance < 0
                              ? `${formatCurrency(Math.abs(group.openingExpenseBalance))} ${isMarathi ? 'जमा' : 'Cr'}`
                              : formatCurrency(group.openingExpenseBalance)
                            }
                          </span>
                        </div>
                      )}
                    </>
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
                  <div className="border-t border-slate-200 pt-1 mt-1 space-y-1">
                    {group.labourBalance !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{isMarathi ? 'मजूर बाकी' : 'Labour Balance'}</span>
                        <span className={group.labourBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                          {group.labourBalance < 0
                            ? `${formatCurrency(Math.abs(group.labourBalance))} ${isMarathi ? 'जमा' : 'Cr'}`
                            : formatCurrency(group.labourBalance)
                          }
                        </span>
                      </div>
                    )}
                    {group.expenseBalance !== 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">{isMarathi ? 'खर्च बाकी' : 'Expense Balance'}</span>
                        <span className={group.expenseBalance > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                          {group.expenseBalance < 0
                            ? `${formatCurrency(Math.abs(group.expenseBalance))} ${isMarathi ? 'जमा' : 'Cr'}`
                            : formatCurrency(group.expenseBalance)
                          }
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t border-slate-100 pt-1">
                      <span className="text-slate-700">
                        {group.closingBalance < 0
                          ? (isMarathi ? 'जमा शिल्लक' : 'Credit Balance')
                          : (isMarathi ? 'बाकी रक्कम' : 'Balance Due')
                        }
                      </span>
                      <span className={closing.color}>{closing.text}{closing.suffix}</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-slate-200 px-4 py-3">
                  {/* Labour */}
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

                  {/* Expenses */}
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

                  {/* Payments */}
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
                              <span className={`ml-1 text-xs px-1.5 py-0.5 rounded ${
                                payment.paymentFor === 'expense' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {payment.paymentFor === 'expense' ? (isMarathi ? 'खर्च' : 'Exp') : (isMarathi ? 'मजूर' : 'Lab')}
                              </span>
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

                  {(!labourData || labourData.workers.length === 0) &&
                   (!groupExpenses || groupExpenses.expenses.length === 0) &&
                   (!groupPayments || groupPayments.payments.length === 0) && (
                    <div className="text-sm text-slate-500 text-center py-2">
                      {noDataMessage}
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
                <tr className="bg-slate-50">
                  <th rowSpan={2} className="text-left py-2 px-3 font-medium text-slate-600 border-b border-slate-200">{isMarathi ? 'गट' : 'Group'}</th>
                  <th colSpan={4} className="text-center py-1.5 px-3 font-semibold text-blue-700 border-b border-blue-200 bg-blue-50/50">{isMarathi ? 'मजूर' : 'Labour'}</th>
                  <th colSpan={4} className="text-center py-1.5 px-3 font-semibold text-amber-700 border-b border-amber-200 bg-amber-50/50">{isMarathi ? 'खर्च' : 'Expense'}</th>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-right py-1.5 px-3 font-medium text-slate-500 text-xs">{isMarathi ? 'मागील' : 'Opening'}</th>
                  <th className="text-right py-1.5 px-3 font-medium text-slate-500 text-xs">{isMarathi ? 'खर्च' : 'Cost'}</th>
                  <th className="text-right py-1.5 px-3 font-medium text-slate-500 text-xs">{isMarathi ? 'भरले' : 'Paid'}</th>
                  <th className="text-right py-1.5 px-3 font-medium text-blue-600 text-xs">{isMarathi ? 'बाकी' : 'Due'}</th>
                  <th className="text-right py-1.5 px-3 font-medium text-slate-500 text-xs border-l border-slate-200">{isMarathi ? 'मागील' : 'Opening'}</th>
                  <th className="text-right py-1.5 px-3 font-medium text-slate-500 text-xs">{isMarathi ? 'खर्च' : 'Cost'}</th>
                  <th className="text-right py-1.5 px-3 font-medium text-slate-500 text-xs">{isMarathi ? 'भरले' : 'Paid'}</th>
                  <th className="text-right py-1.5 px-3 font-medium text-amber-600 text-xs">{isMarathi ? 'बाकी' : 'Due'}</th>
                </tr>
              </thead>
              <tbody>
                {balanceReport.map(group => {
                  const labBal = formatBalanceCell(group.labourBalance);
                  const expBal = formatBalanceCell(group.expenseBalance);
                  const opLab = formatBalanceCell(group.openingLabourBalance);
                  const opExp = formatBalanceCell(group.openingExpenseBalance);
                  return (
                    <tr key={group.groupId} className="border-b border-slate-100">
                      <td className="py-2 px-3 text-slate-700 font-medium">{getGroupName(group)}</td>
                      {/* Labour columns */}
                      <td className={`py-2 px-3 text-right tabular-nums ${opLab.color}`}>{opLab.text}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-600">
                        {group.labourCost > 0 ? formatCurrency(group.labourCost) : '–'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-green-700">
                        {group.labourPayments > 0 ? formatCurrency(group.labourPayments) : '–'}
                      </td>
                      <td className={`py-2 px-3 text-right tabular-nums font-semibold ${labBal.color}`}>{labBal.text}</td>
                      {/* Expense columns */}
                      <td className={`py-2 px-3 text-right tabular-nums border-l border-slate-100 ${opExp.color}`}>{opExp.text}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-600">
                        {group.expenseCost > 0 ? formatCurrency(group.expenseCost) : '–'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-green-700">
                        {group.expensePayments > 0 ? formatCurrency(group.expensePayments) : '–'}
                      </td>
                      <td className={`py-2 px-3 text-right tabular-nums font-semibold ${expBal.color}`}>{expBal.text}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                {(() => {
                  const tLabBal = formatBalanceCell(grandTotals.labourBalance);
                  const tExpBal = formatBalanceCell(grandTotals.expenseBalance);
                  const tOpLab = formatBalanceCell(grandTotals.openingLabourBalance);
                  const tOpExp = formatBalanceCell(grandTotals.openingExpenseBalance);
                  return (
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                      <td className="py-2 px-3 text-slate-800">{isMarathi ? 'एकूण' : 'TOTAL'}</td>
                      {/* Labour totals */}
                      <td className={`py-2 px-3 text-right tabular-nums ${tOpLab.color}`}>{tOpLab.text}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-800">
                        {grandTotals.labourCost > 0 ? formatCurrency(grandTotals.labourCost) : '–'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-green-700">
                        {grandTotals.labourPayments > 0 ? formatCurrency(grandTotals.labourPayments) : '–'}
                      </td>
                      <td className={`py-2 px-3 text-right tabular-nums font-bold ${tLabBal.color}`}>{tLabBal.text}</td>
                      {/* Expense totals */}
                      <td className={`py-2 px-3 text-right tabular-nums border-l border-slate-200 ${tOpExp.color}`}>{tOpExp.text}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-slate-800">
                        {grandTotals.expenseCost > 0 ? formatCurrency(grandTotals.expenseCost) : '–'}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-green-700">
                        {grandTotals.expensePayments > 0 ? formatCurrency(grandTotals.expensePayments) : '–'}
                      </td>
                      <td className={`py-2 px-3 text-right tabular-nums font-bold ${tExpBal.color}`}>{tExpBal.text}</td>
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>

          {/* Bottom callout */}
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 space-y-2">
            {grandTotals.labourBalance !== 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800">
                  {isMarathi ? 'मजूरांना देणे' : 'Pay to Workers'}
                </span>
                <span className={`text-base font-bold ${grandTotals.labourBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {grandTotals.labourBalance < 0
                    ? `${formatCurrency(Math.abs(grandTotals.labourBalance))} ${isMarathi ? 'जमा' : 'Cr'}`
                    : formatCurrency(grandTotals.labourBalance)
                  }
                </span>
              </div>
            )}
            {grandTotals.expenseBalance !== 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-800">
                  {isMarathi ? 'मालकाकडून वसूल' : 'Settle with Owner'}
                </span>
                <span className={`text-base font-bold ${grandTotals.expenseBalance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {grandTotals.expenseBalance < 0
                    ? `${formatCurrency(Math.abs(grandTotals.expenseBalance))} ${isMarathi ? 'जमा' : 'Cr'}`
                    : formatCurrency(grandTotals.expenseBalance)
                  }
                </span>
              </div>
            )}
            {grandTotals.labourBalance === 0 && grandTotals.expenseBalance === 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-green-800">
                  {isMarathi ? 'सर्व पेमेंट पूर्ण' : 'All Payments Clear'}
                </span>
                <span className="text-lg font-bold text-green-700">{'\u2713'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default AccountStatement;
