import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { SundryExpense, GroupAllocation } from '../types';
import { Plus, Pencil, Trash2, X, Check, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../utils/calculations';

const Expenses: React.FC = () => {
  const { data, settings, addExpense, updateExpense, deleteExpense, getExpensesByMonth } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  // Month navigation
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    categoryId: '',
    description: '',
    amount: '',
    groupId: '',
    isShared: false,
    allocations: [] as GroupAllocation[],
    notes: '',
  });

  // Get active groups and expense categories
  const groups = useMemo(() =>
    (data.groups || []).filter(g => !g.deleted && g.status === 'active'),
    [data.groups]
  );

  const categories = useMemo(() =>
    (data.expenseCategories || []).filter(c => !c.deleted && c.status === 'active'),
    [data.expenseCategories]
  );

  const expenses = getExpensesByMonth(selectedMonth);
  const sortedExpenses = [...expenses].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const monthTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  const getGroupName = (groupId: string): string => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return '-';
    return isMarathi && group.marathiName ? group.marathiName : group.name;
  };

  const getCategoryName = (categoryId?: string): string => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '-';
    return isMarathi && category.marathiName ? category.marathiName : category.name;
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
      categoryId: '',
      description: '',
      amount: '',
      groupId: '',
      isShared: false,
      allocations: [],
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

  const startEdit = (expense: SundryExpense) => {
    setShowAddForm(false);
    setEditingId(expense.id);
    setFormData({
      date: expense.date,
      categoryId: expense.categoryId || '',
      description: expense.description,
      amount: expense.amount.toString(),
      groupId: expense.groupId || '',
      isShared: expense.isShared || false,
      allocations: expense.allocations || [],
      notes: expense.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim() || !formData.amount) return;

    const expenseData = {
      date: formData.date,
      month: formData.date.substring(0, 7), // Extract YYYY-MM
      categoryId: formData.categoryId || undefined,
      description: formData.description.trim(),
      amount: parseFloat(formData.amount),
      groupId: formData.isShared ? undefined : formData.groupId || undefined,
      isShared: formData.isShared,
      allocations: formData.isShared ? formData.allocations : undefined,
      notes: formData.notes.trim() || undefined,
    };

    if (editingId) {
      updateExpense(editingId, expenseData);
      setEditingId(null);
    } else {
      addExpense(expenseData);
      setShowAddForm(false);
    }
    resetForm();
  };

  const handleDelete = (expense: SundryExpense) => {
    if (confirm(`${t('confirmDelete')} "${expense.description}"?`)) {
      deleteExpense(expense.id);
    }
  };

  const toggleShared = () => {
    if (!formData.isShared) {
      // Initialize allocations with all groups at equal percentage
      const equalPercentage = groups.length > 0 ? Math.floor(100 / groups.length) : 0;
      const allocations: GroupAllocation[] = groups.map(g => ({
        groupId: g.id,
        percentage: equalPercentage,
      }));
      setFormData(prev => ({ ...prev, isShared: true, groupId: '', allocations }));
    } else {
      setFormData(prev => ({ ...prev, isShared: false, allocations: [] }));
    }
  };

  const updateAllocation = (groupId: string, percentage: number) => {
    setFormData(prev => ({
      ...prev,
      allocations: prev.allocations.map(a =>
        a.groupId === groupId ? { ...a, percentage } : a
      ),
    }));
  };

  const renderForm = (isEditing: boolean = false) => (
    <form onSubmit={handleSubmit} className="bg-graminno-50 border border-graminno-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-graminno-800">
          {isEditing ? (isMarathi ? 'खर्च संपादन' : 'Edit Expense') : (isMarathi ? 'नवीन खर्च' : 'New Expense')}
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
        <Select
          label={isMarathi ? 'प्रकार' : 'Category'}
          value={formData.categoryId}
          onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
          options={[
            { value: '', label: isMarathi ? '-- निवडा --' : '-- Select --' },
            ...categories.map(c => ({
              value: c.id,
              label: isMarathi && c.marathiName ? c.marathiName : c.name,
            })),
          ]}
        />
      </div>

      <div className="mb-3">
        <Input
          label={isMarathi ? 'वर्णन' : 'Description'}
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder={isMarathi ? 'खर्चाचे वर्णन' : 'Expense description'}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <Input
          label={isMarathi ? 'रक्कम (₹)' : 'Amount (₹)'}
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={e => setFormData({ ...formData, amount: e.target.value })}
          placeholder="0.00"
          required
        />
        {!formData.isShared && (
          <Select
            label={isMarathi ? 'गट' : 'Group'}
            value={formData.groupId}
            onChange={e => setFormData({ ...formData, groupId: e.target.value })}
            options={[
              { value: '', label: isMarathi ? '-- निवडा --' : '-- Select --' },
              ...groups.map(g => ({
                value: g.id,
                label: isMarathi && g.marathiName ? g.marathiName : g.name,
              })),
            ]}
          />
        )}
      </div>

      {/* Shared expense toggle */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isShared}
            onChange={toggleShared}
            className="w-4 h-4 text-graminno-600 border-slate-300 rounded focus:ring-graminno-500"
          />
          <Users size={16} className="text-slate-500" />
          <span className="text-sm text-slate-700">
            {isMarathi ? 'सामायिक खर्च (गटांमध्ये विभागणी)' : 'Shared expense (split between groups)'}
          </span>
        </label>
      </div>

      {/* Allocation percentages for shared expenses */}
      {formData.isShared && formData.allocations.length > 0 && (
        <div className="bg-white rounded-lg p-3 mb-3 border border-slate-200">
          <div className="text-sm font-medium text-slate-600 mb-2">
            {isMarathi ? 'गट वाटप (%)' : 'Group Allocation (%)'}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {formData.allocations.map(allocation => {
              const group = groups.find(g => g.id === allocation.groupId);
              if (!group) return null;
              return (
                <div key={allocation.groupId} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 flex-1 truncate">
                    {isMarathi && group.marathiName ? group.marathiName : group.name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={allocation.percentage || 0}
                    onChange={e => updateAllocation(allocation.groupId, parseInt(e.target.value) || 0)}
                    className="w-16 px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-graminno-500"
                  />
                </div>
              );
            })}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {isMarathi ? 'एकूण' : 'Total'}: {formData.allocations.reduce((sum, a) => sum + (a.percentage || 0), 0)}%
          </div>
        </div>
      )}

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
        title={isMarathi ? 'इतर खर्च' : 'Sundry Expenses'}
        subtitle={`${expenses.length} ${isMarathi ? 'नोंदी' : 'entries'} - ${formatCurrency(monthTotal)}`}
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

      {/* Add Form (inline at top) */}
      {showAddForm && renderForm(false)}

      {/* Expenses List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600 w-24">
                  {isMarathi ? 'तारीख' : 'Date'}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">
                  {isMarathi ? 'वर्णन' : 'Description'}
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
              {sortedExpenses.map(expense => (
                <React.Fragment key={expense.id}>
                  {editingId === expense.id ? (
                    <tr>
                      <td colSpan={5} className="p-0">
                        {renderForm(true)}
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {format(parseISO(expense.date), 'dd MMM')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{expense.description}</div>
                        {expense.categoryId && (
                          <div className="text-xs text-slate-400">
                            {getCategoryName(expense.categoryId)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {expense.isShared ? (
                          <span className="inline-flex items-center gap-1 text-blue-600">
                            <Users size={14} />
                            {isMarathi ? 'सामायिक' : 'Shared'}
                          </span>
                        ) : (
                          expense.groupId ? getGroupName(expense.groupId) : '-'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        {formatCurrency(expense.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(expense)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Pencil size={16} className="text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(expense)}
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

        {sortedExpenses.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {isMarathi ? 'या महिन्यात कोणताही खर्च नाही' : 'No expenses this month'}
          </div>
        )}

        {/* Month Total */}
        {sortedExpenses.length > 0 && (
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

export default Expenses;
