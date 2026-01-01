import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { Payment } from '../types';
import { Plus, Pencil, Trash2, X, Check, ChevronLeft, ChevronRight, Wallet, Briefcase } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../utils/calculations';

const Payments: React.FC = () => {
  const { data, settings, addPayment, updatePayment, deletePayment, getPaymentsByMonth, getExpensesByMonth } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  // Month navigation
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    paymentFor: 'labour' as 'labour' | 'expense',
    groupId: '',
    expenseId: '',
    description: '',
    notes: '',
  });

  // Get active groups
  const groups = useMemo(() =>
    (data.groups || []).filter(g => !g.deleted && g.status === 'active'),
    [data.groups]
  );

  // Get expenses for selected month (for linking payments)
  const monthExpenses = getExpensesByMonth(selectedMonth);

  const payments = getPaymentsByMonth(selectedMonth);
  const sortedPayments = [...payments].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const monthTotal = payments.reduce((sum, p) => sum + p.amount, 0);
  const labourPayments = payments.filter(p => p.paymentFor === 'labour').reduce((sum, p) => sum + p.amount, 0);
  const expensePayments = payments.filter(p => p.paymentFor === 'expense').reduce((sum, p) => sum + p.amount, 0);

  // Calculate total sundry expenses for the month
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const getGroupName = (groupId: string): string => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return '-';
    return isMarathi && group.marathiName ? group.marathiName : group.name;
  };

  const getExpenseDescription = (expenseId?: string): string => {
    if (!expenseId) return '';
    const expense = (data.expenses || []).find(e => e.id === expenseId);
    return expense ? expense.description : '';
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const current = parseISO(`${selectedMonth}-01`);
    const newDate = direction === 'prev'
      ? new Date(current.getFullYear(), current.getMonth() - 1, 1)
      : new Date(current.getFullYear(), current.getMonth() + 1, 1);
    setSelectedMonth(format(newDate, 'yyyy-MM'));
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: '',
      paymentFor: 'labour',
      groupId: '',
      expenseId: '',
      description: '',
      notes: '',
    });
  };

  const openAddForm = () => {
    setEditingId(null);
    resetForm();
    // Set date to first day of selected month if not current month
    const today = format(new Date(), 'yyyy-MM');
    if (selectedMonth !== today) {
      setFormData(prev => ({ ...prev, date: `${selectedMonth}-01` }));
    }
    setShowAddForm(true);
  };

  const startEdit = (payment: Payment) => {
    setShowAddForm(false);
    setEditingId(payment.id);
    setFormData({
      date: payment.date,
      amount: payment.amount.toString(),
      paymentFor: payment.paymentFor,
      groupId: payment.groupId,
      expenseId: payment.expenseId || '',
      description: payment.description || '',
      notes: payment.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.groupId) return;

    const paymentData = {
      date: formData.date,
      month: formData.date.substring(0, 7), // Extract YYYY-MM
      amount: parseFloat(formData.amount),
      paymentFor: formData.paymentFor,
      groupId: formData.groupId,
      expenseId: formData.paymentFor === 'expense' && formData.expenseId ? formData.expenseId : undefined,
      description: formData.description.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    };

    if (editingId) {
      updatePayment(editingId, paymentData);
      setEditingId(null);
    } else {
      addPayment(paymentData);
      setShowAddForm(false);
    }
    resetForm();
  };

  const handleDelete = (payment: Payment) => {
    const desc = payment.description || (payment.paymentFor === 'labour' ? 'Labour payment' : 'Expense payment');
    if (confirm(`${t('confirmDelete')} "${desc}"?`)) {
      deletePayment(payment.id);
    }
  };

  // Get group-specific expenses for expense linking (all expenses, not just current month)
  const allExpenses = useMemo(() =>
    (data.expenses || []).filter(e => !e.deleted).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    [data.expenses]
  );

  const groupExpenses = formData.groupId
    ? allExpenses.filter(e => e.groupId === formData.groupId || e.isShared)
    : [];

  const renderForm = (isEditing: boolean = false) => (
    <form onSubmit={handleSubmit} className="bg-graminno-50 border border-graminno-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-graminno-800">
          {isEditing ? (isMarathi ? 'पेमेंट संपादन' : 'Edit Payment') : (isMarathi ? 'नवीन पेमेंट' : 'New Payment')}
        </h3>
        <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Input
          label={isMarathi ? 'तारीख' : 'Date'}
          type="date"
          value={formData.date}
          onChange={e => setFormData({ ...formData, date: e.target.value })}
          required
        />
        <Input
          label={isMarathi ? 'रक्कम (₹)' : 'Amount (₹)'}
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={e => setFormData({ ...formData, amount: e.target.value })}
          placeholder="0.00"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Select
          label={isMarathi ? 'पेमेंट प्रकार' : 'Payment Type'}
          value={formData.paymentFor}
          onChange={e => setFormData({ ...formData, paymentFor: e.target.value as 'labour' | 'expense', expenseId: '' })}
          options={[
            { value: 'labour', label: isMarathi ? 'मजूर खर्च' : 'Labour Cost' },
            { value: 'expense', label: isMarathi ? 'इतर खर्च' : 'Sundry Expense' },
          ]}
        />
        <Select
          label={isMarathi ? 'गट' : 'Group'}
          value={formData.groupId}
          onChange={e => setFormData({ ...formData, groupId: e.target.value, expenseId: '' })}
          options={[
            { value: '', label: isMarathi ? '-- निवडा --' : '-- Select --' },
            ...groups.map(g => ({
              value: g.id,
              label: isMarathi && g.marathiName ? g.marathiName : g.name,
            })),
          ]}
          required
        />
      </div>

      {/* Link to specific expense (optional) */}
      {formData.paymentFor === 'expense' && groupExpenses.length > 0 && (
        <div className="mb-3">
          <Select
            label={isMarathi ? 'खर्च (पर्यायी)' : 'Expense (Optional)'}
            value={formData.expenseId}
            onChange={e => setFormData({ ...formData, expenseId: e.target.value })}
            options={[
              { value: '', label: isMarathi ? '-- निवडा (पर्यायी) --' : '-- Select (Optional) --' },
              ...groupExpenses.map(e => ({
                value: e.id,
                label: `${format(parseISO(e.date), 'dd MMM yyyy')} - ${e.description} (${formatCurrency(e.amount)})`,
              })),
            ]}
          />
        </div>
      )}

      <div className="mb-3">
        <Input
          label={isMarathi ? 'वर्णन' : 'Description'}
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder={isMarathi ? 'पेमेंट वर्णन (पर्यायी)' : 'Payment description (optional)'}
        />
      </div>

      <div className="mb-3">
        <Input
          label={isMarathi ? 'टीप' : 'Notes'}
          value={formData.notes}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          placeholder={isMarathi ? 'अतिरिक्त माहिती' : 'Additional notes'}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1" />
        <Button type="button" variant="secondary" onClick={cancelEdit} size="sm">
          {t('cancel')}
        </Button>
        <Button type="submit" size="sm">
          <Check size={16} />
          {t('save')}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={isMarathi ? 'पेमेंट' : 'Payments'}
        subtitle={`${payments.length} ${isMarathi ? 'नोंदी' : 'entries'} - ${formatCurrency(monthTotal)}`}
        action={
          !showAddForm && !editingId && (
            <Button onClick={openAddForm}>
              <Plus size={18} />
              {t('add')}
            </Button>
          )
        }
      />

      {/* Month Navigation */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-lg font-medium text-slate-800 min-w-[160px] text-center">
            {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
          </div>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Briefcase size={16} />
            <span className="text-sm">{isMarathi ? 'मजूर पेमेंट' : 'Labour Payments'}</span>
          </div>
          <div className="text-xl font-bold text-slate-800">{formatCurrency(labourPayments)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Wallet size={16} />
            <span className="text-sm">{isMarathi ? 'खर्च पेमेंट' : 'Expense Payments'}</span>
          </div>
          <div className="text-xl font-bold text-slate-800">{formatCurrency(expensePayments)}</div>
        </div>
      </div>

      {/* Expenses Summary */}
      {totalExpenses > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 shadow-sm border border-amber-200 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <Wallet size={16} />
                <span className="text-sm font-medium">{isMarathi ? 'एकूण खर्च (या महिन्यात)' : 'Total Expenses (This Month)'}</span>
              </div>
              <div className="text-2xl font-bold text-amber-800">{formatCurrency(totalExpenses)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-amber-600">{isMarathi ? 'पेमेंट केले' : 'Paid'}</div>
              <div className="text-lg font-bold text-amber-700">{formatCurrency(expensePayments)}</div>
              {totalExpenses - expensePayments > 0 && (
                <div className="text-sm text-red-600 font-medium">
                  {isMarathi ? 'बाकी' : 'Due'}: {formatCurrency(totalExpenses - expensePayments)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Form (inline at top) */}
      {showAddForm && renderForm(false)}

      {/* Payments List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600 w-24">
                  {isMarathi ? 'तारीख' : 'Date'}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">
                  {isMarathi ? 'प्रकार' : 'Type'}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">
                  {isMarathi ? 'गट' : 'Group'}
                </th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">
                  {isMarathi ? 'रक्कम' : 'Amount'}
                </th>
                <th className="text-center py-3 px-4 font-medium text-slate-600 w-24">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map(payment => (
                <React.Fragment key={payment.id}>
                  {editingId === payment.id ? (
                    <tr>
                      <td colSpan={5} className="p-0">
                        {renderForm(true)}
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {format(parseISO(payment.date), 'dd MMM')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {payment.paymentFor === 'labour' ? (
                            <Briefcase size={14} className="text-blue-500" />
                          ) : (
                            <Wallet size={14} className="text-amber-500" />
                          )}
                          <span className="text-sm font-medium text-slate-700">
                            {payment.paymentFor === 'labour'
                              ? (isMarathi ? 'मजूर' : 'Labour')
                              : (isMarathi ? 'खर्च' : 'Expense')}
                          </span>
                        </div>
                        {payment.description && (
                          <div className="text-xs text-slate-400">{payment.description}</div>
                        )}
                        {payment.expenseId && (
                          <div className="text-xs text-slate-400">
                            → {getExpenseDescription(payment.expenseId)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {getGroupName(payment.groupId)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(payment)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Pencil size={16} className="text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(payment)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} className="text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {sortedPayments.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {isMarathi ? 'या महिन्यात कोणतेही पेमेंट नाही' : 'No payments this month'}
          </div>
        )}

        {/* Month Total */}
        {sortedPayments.length > 0 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-600">
                {isMarathi ? 'एकूण' : 'Total'}
              </span>
              <span className="font-bold text-lg text-slate-800">
                {formatCurrency(monthTotal)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
