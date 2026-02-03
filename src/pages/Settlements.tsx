import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { format, parseISO } from 'date-fns';
import {
  calculateGroupBalanceForPeriod,
  calculateLabourCostByGroupForPeriod,
  calculateExpensesByGroupForPeriod,
  calculatePaymentsByGroupForPeriod,
  formatCurrency,
} from '../utils/calculations';
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2, X, Check, Users2 } from 'lucide-react';
import type { SettlementPeriod } from '../types';

const Settlements: React.FC = () => {
  const { data, settings, addSettlementPeriod, updateSettlementPeriod, deleteSettlementPeriod } = useApp();
  const isMarathi = settings.language === 'mr';

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    marathiName: '',
    startDate: '',
    endDate: '',
    notes: '',
  });

  const periods = useMemo(() =>
    (data.settlementPeriods || [])
      .filter(p => !p.deleted)
      .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [data.settlementPeriods]
  );

  const selectedPeriod = periods.find(p => p.id === selectedPeriodId);

  // Auto-select first period if none selected
  React.useEffect(() => {
    if (!selectedPeriodId && periods.length > 0) {
      setSelectedPeriodId(periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  // Calculations for selected period
  const balanceReport = useMemo(() => {
    if (!selectedPeriod) return [];
    return calculateGroupBalanceForPeriod(data, selectedPeriod.startDate, selectedPeriod.endDate);
  }, [data, selectedPeriod]);

  const labourCostData = useMemo(() => {
    if (!selectedPeriod) return [];
    return calculateLabourCostByGroupForPeriod(data, selectedPeriod.startDate, selectedPeriod.endDate);
  }, [data, selectedPeriod]);

  const expenseData = useMemo(() => {
    if (!selectedPeriod) return [];
    return calculateExpensesByGroupForPeriod(data, selectedPeriod.startDate, selectedPeriod.endDate);
  }, [data, selectedPeriod]);

  const paymentData = useMemo(() => {
    if (!selectedPeriod) return [];
    return calculatePaymentsByGroupForPeriod(data, selectedPeriod.startDate, selectedPeriod.endDate);
  }, [data, selectedPeriod]);

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
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const expandAll = () => setExpandedGroups(new Set(balanceReport.map(g => g.groupId)));
  const collapseAll = () => setExpandedGroups(new Set());

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

  const formatDateRange = (p: SettlementPeriod) => {
    const start = format(parseISO(p.startDate), 'dd MMM yyyy');
    const end = format(parseISO(p.endDate), 'dd MMM yyyy');
    return `${start} – ${end}`;
  };

  const resetForm = () => {
    setFormData({ name: '', marathiName: '', startDate: '', endDate: '', notes: '' });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.startDate || !formData.endDate) return;

    if (editingId) {
      updateSettlementPeriod(editingId, formData);
    } else {
      addSettlementPeriod(formData);
    }
    resetForm();
  };

  const handleEdit = (period: SettlementPeriod) => {
    setFormData({
      name: period.name,
      marathiName: period.marathiName || '',
      startDate: period.startDate,
      endDate: period.endDate,
      notes: period.notes || '',
    });
    setEditingId(period.id);
    setShowForm(true);
  };

  const handleDelete = (period: SettlementPeriod) => {
    if (confirm(isMarathi ? `"${period.name}" हटवायचे?` : `Delete "${period.name}"?`)) {
      deleteSettlementPeriod(period.id);
      if (selectedPeriodId === period.id) setSelectedPeriodId(null);
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={isMarathi ? 'तहकूब' : 'Settlements'}
        subtitle={isMarathi ? 'सानुकूल कालावधीसाठी खाते' : 'Accounts for custom date ranges'}
      />

      {/* Period management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="font-semibold text-sm text-slate-700">
            {isMarathi ? 'कालावधी' : 'Periods'}
          </span>
          {!showForm && (
            <Button variant="ghost" onClick={() => setShowForm(true)} className="text-sm">
              <Plus size={16} className="mr-1" />
              {isMarathi ? 'जोडा' : 'Add'}
            </Button>
          )}
        </div>

        {/* Add/Edit form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="p-4 border-b border-slate-100 bg-slate-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <Input
                label={isMarathi ? 'नाव' : 'Name'}
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder={isMarathi ? 'उदा. नोव्हें - डिसें तहकूब' : 'e.g. Nov–Dec Settlement'}
                required
              />
              <Input
                label={isMarathi ? 'मराठी नाव' : 'Marathi Name'}
                value={formData.marathiName}
                onChange={e => setFormData(prev => ({ ...prev, marathiName: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isMarathi ? 'सुरुवात' : 'Start Date'}
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-graminno-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {isMarathi ? 'शेवट' : 'End Date'}
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-graminno-500"
                  required
                />
              </div>
            </div>
            <Input
              label={isMarathi ? 'टिपा' : 'Notes'}
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
            <div className="flex gap-2 mt-3">
              <Button type="submit" variant="primary" className="text-sm">
                <Check size={16} className="mr-1" />
                {editingId ? (isMarathi ? 'अपडेट' : 'Update') : (isMarathi ? 'जतन करा' : 'Save')}
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm} className="text-sm">
                <X size={16} className="mr-1" />
                {isMarathi ? 'रद्द' : 'Cancel'}
              </Button>
            </div>
          </form>
        )}

        {/* Period list */}
        {periods.length === 0 && !showForm && (
          <div className="p-6 text-center text-sm text-slate-500">
            {isMarathi ? 'कोणताही कालावधी नाही. नवीन जोडा.' : 'No periods defined. Add one to get started.'}
          </div>
        )}
        <div>
          {periods.map(period => (
            <button
              key={period.id}
              onClick={() => setSelectedPeriodId(period.id)}
              className={`w-full text-left px-4 py-3 border-b border-slate-50 flex items-center justify-between transition-colors ${
                selectedPeriodId === period.id ? 'bg-graminno-50 border-l-4 border-l-graminno-500' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 text-sm">
                  {isMarathi && period.marathiName ? period.marathiName : period.name}
                </div>
                <div className="text-xs text-slate-500">{formatDateRange(period)}</div>
                {period.notes && <div className="text-xs text-slate-400 mt-0.5">{period.notes}</div>}
              </div>
              <div className="flex items-center gap-1 ml-2 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); handleEdit(period); }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(period); }}
                  className="p-1 text-slate-400 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Statement for selected period */}
      {selectedPeriod && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800">
                {isMarathi && selectedPeriod.marathiName ? selectedPeriod.marathiName : selectedPeriod.name}
              </h2>
              <p className="text-xs text-slate-500">{formatDateRange(selectedPeriod)}</p>
            </div>
            {balanceReport.length > 0 && (
              <div className="flex gap-2">
                <button onClick={expandAll} className="text-sm text-graminno-600 hover:text-graminno-700 flex items-center gap-1">
                  <ChevronDown size={16} /> {isMarathi ? 'सर्व उघडा' : 'Expand All'}
                </button>
                <span className="text-slate-300">|</span>
                <button onClick={collapseAll} className="text-sm text-graminno-600 hover:text-graminno-700 flex items-center gap-1">
                  <ChevronUp size={16} /> {isMarathi ? 'सर्व बंद करा' : 'Collapse All'}
                </button>
              </div>
            )}
          </div>

          {balanceReport.length === 0 && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-100 text-center">
              <Users2 className="mx-auto h-12 w-12 text-slate-300 mb-4" />
              <p className="text-slate-500">
                {isMarathi ? 'या कालावधीसाठी कोणताही डेटा नाही' : 'No data for this period'}
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
                        ? <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" />
                        : <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                      }
                    </div>
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
                        <span className={closing.color}>{closing.text}{closing.suffix}</span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-200 px-4 py-3">
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

                      {(!labourData || labourData.workers.length === 0) &&
                       (!groupExpenses || groupExpenses.expenses.length === 0) &&
                       (!groupPayments || groupPayments.payments.length === 0) && (
                        <div className="text-sm text-slate-500 text-center py-2">
                          {isMarathi ? 'या कालावधीत कोणताही तपशील नाही' : 'No details for this period'}
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
                    ? '\u2713'
                    : `${formatCurrency(Math.abs(grandTotals.closingBalance))}${grandTotals.closingBalance < 0 ? (isMarathi ? ' जमा' : ' Cr') : ''}`
                  }
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Settlements;
