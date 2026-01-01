import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { SundryExpense } from '../types';
import { Plus, Pencil, Trash2, X, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '../utils/calculations';

/**
 * FarmExpenses - Simplified expense entry page for farm managers
 * Mobile-first, no modals, inline forms
 */
const FarmExpenses: React.FC = () => {
  const { data, settings, addExpense, updateExpense, deleteExpense, getExpensesByMonth } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  // Month navigation (defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    categoryId: '',
    description: '',
    amount: '',
    groupId: '',
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
    if (!categoryId) return '';
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';
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
    });
  };

  const openAddForm = () => {
    setEditingId(null);
    resetForm();
    // Set date to today or first day of selected month
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
      month: formData.date.substring(0, 7),
      categoryId: formData.categoryId || undefined,
      description: formData.description.trim(),
      amount: parseFloat(formData.amount),
      groupId: formData.groupId || undefined,
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

  const renderForm = (isEditing: boolean = false) => (
    <form onSubmit={handleSubmit} className="bg-graminno-50 border border-graminno-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-graminno-800">
          {isEditing ? (isMarathi ? 'संपादन' : 'Edit') : (isMarathi ? 'नवीन खर्च' : 'New Expense')}
        </h3>
        <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </div>

      {/* Compact form for mobile */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
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
            placeholder="0"
            required
          />
        </div>

        <Input
          label={isMarathi ? 'वर्णन' : 'Description'}
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder={isMarathi ? 'काय खर्च झाला?' : 'What was the expense?'}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={isMarathi ? 'प्रकार' : 'Category'}
            value={formData.categoryId}
            onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
            options={[
              { value: '', label: '-' },
              ...categories.map(c => ({
                value: c.id,
                label: isMarathi && c.marathiName ? c.marathiName : c.name,
              })),
            ]}
          />
          <Select
            label={isMarathi ? 'गट' : 'Group'}
            value={formData.groupId}
            onChange={e => setFormData({ ...formData, groupId: e.target.value })}
            options={[
              { value: '', label: '-' },
              ...groups.map(g => ({
                value: g.id,
                label: isMarathi && g.marathiName ? g.marathiName : g.name,
              })),
            ]}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <Button type="button" variant="secondary" onClick={cancelEdit} className="flex-1">
          {t('cancel')}
        </Button>
        <Button type="submit" className="flex-1">
          <Check size={16} />
          {t('save')}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={isMarathi ? 'खर्च' : 'Expenses'}
        subtitle={formatCurrency(monthTotal)}
        action={
          !showAddForm && !editingId && (
            <Button onClick={openAddForm}>
              <Plus size={18} />
              {isMarathi ? 'जोडा' : 'Add'}
            </Button>
          )
        }
      />

      {/* Month Navigation - Compact */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-lg font-medium text-slate-800">
            {format(parseISO(`${selectedMonth}-01`), 'MMM yyyy')}
          </div>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && renderForm(false)}

      {/* Expenses List - Card style for mobile */}
      <div className="space-y-2">
        {sortedExpenses.map(expense => (
          <React.Fragment key={expense.id}>
            {editingId === expense.id ? (
              renderForm(true)
            ) : (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-slate-500">
                        {format(parseISO(expense.date), 'dd MMM')}
                      </span>
                      {expense.categoryId && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {getCategoryName(expense.categoryId)}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-slate-800 truncate">
                      {expense.description}
                    </div>
                    {expense.groupId && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {getGroupName(expense.groupId)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <div className="text-right">
                      <div className="font-bold text-slate-800">
                        {formatCurrency(expense.amount)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => startEdit(expense)}
                        className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                      >
                        <Pencil size={14} className="text-slate-400" />
                      </button>
                      <button
                        onClick={() => handleDelete(expense)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {sortedExpenses.length === 0 && !showAddForm && (
        <div className="text-center py-12 text-slate-500">
          <p>{isMarathi ? 'या महिन्यात कोणताही खर्च नाही' : 'No expenses this month'}</p>
          <Button onClick={openAddForm} className="mt-4">
            <Plus size={18} />
            {isMarathi ? 'पहिला खर्च जोडा' : 'Add first expense'}
          </Button>
        </div>
      )}

      {/* Sticky Total Bar */}
      {sortedExpenses.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 lg:static lg:mt-4 bg-graminno-600 text-white px-4 py-3 lg:rounded-xl">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <span className="font-medium">
              {isMarathi ? 'एकूण खर्च' : 'Total Expenses'}
            </span>
            <span className="text-xl font-bold">
              {formatCurrency(monthTotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FarmExpenses;
