import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { ExpenseCategory } from '../types';
import { Plus, Pencil, Trash2, Search, Wand2, X, Check } from 'lucide-react';
import { transliterateToMarathi } from '../utils/transliteration';

const ExpenseCategories: React.FC = () => {
  const { data, settings, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [formData, setFormData] = useState({
    code: '',
    marathiCode: '',
    name: '',
    marathiName: '',
    status: 'active' as 'active' | 'inactive',
  });

  const getDisplayName = (category: ExpenseCategory) => {
    if (isMarathi && category.marathiName) {
      return category.marathiName;
    }
    return category.name;
  };

  const getDisplayCode = (category: ExpenseCategory) => {
    if (isMarathi && category.marathiCode) {
      return category.marathiCode;
    }
    return category.code;
  };

  // Filter out soft-deleted categories
  const categories = (data.expenseCategories || []).filter(c => !c.deleted);

  const filteredCategories = categories.filter(category => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.marathiName && category.marathiName.includes(searchQuery));
    const matchesStatus = filterStatus === 'all' || category.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormData({ code: '', marathiCode: '', name: '', marathiName: '', status: 'active' });
  };

  const openAddForm = () => {
    setEditingId(null);
    resetForm();
    setShowAddForm(true);
  };

  const startEdit = (category: ExpenseCategory) => {
    setShowAddForm(false);
    setEditingId(category.id);
    setFormData({
      code: category.code,
      marathiCode: category.marathiCode || '',
      name: category.name,
      marathiName: category.marathiName || '',
      status: category.status,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const autoTransliterate = () => {
    setFormData(prev => ({
      ...prev,
      marathiCode: prev.code ? transliterateToMarathi(prev.code) : prev.marathiCode,
      marathiName: prev.name ? transliterateToMarathi(prev.name) : prev.marathiName,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) return;

    if (editingId) {
      updateExpenseCategory(editingId, formData);
      setEditingId(null);
    } else {
      addExpenseCategory(formData);
      setShowAddForm(false);
    }
    resetForm();
  };

  const handleDelete = (category: ExpenseCategory) => {
    if (confirm(`${t('confirmDelete')} "${getDisplayName(category)}"?`)) {
      deleteExpenseCategory(category.id);
    }
  };

  const renderForm = (isEditing: boolean = false) => (
    <form onSubmit={handleSubmit} className="bg-graminno-50 border border-graminno-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-graminno-800">
          {isEditing ? (isMarathi ? 'संपादन' : 'Edit Category') : (isMarathi ? 'नवीन प्रकार' : 'New Category')}
        </h3>
        <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <Input
          label={isMarathi ? 'कोड' : 'Code'}
          value={formData.code}
          onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="FUEL"
          required
        />
        <Input
          label={isMarathi ? 'मराठी कोड' : 'Marathi Code'}
          value={formData.marathiCode}
          onChange={e => setFormData({ ...formData, marathiCode: e.target.value })}
          placeholder="इंधन"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Input
          label={`${t('name')} (English)`}
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="Fuel"
          required
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t('marathiName')}
            <button
              type="button"
              onClick={autoTransliterate}
              className="ml-2 text-graminno-600 hover:text-graminno-700"
              title={isMarathi ? 'स्वयं भाषांतर' : 'Auto translate'}
            >
              <Wand2 size={14} className="inline" />
            </button>
          </label>
          <input
            type="text"
            value={formData.marathiName}
            onChange={e => setFormData({ ...formData, marathiName: e.target.value })}
            placeholder="इंधन"
            lang="mr"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-graminno-500"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Select
          value={formData.status}
          onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
          options={[
            { value: 'active', label: t('active') },
            { value: 'inactive', label: t('inactive') },
          ]}
          className="w-32"
        />
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
        title={isMarathi ? 'खर्च प्रकार' : 'Expense Categories'}
        subtitle={`${categories.length} ${isMarathi ? 'प्रकार' : 'categories'}`}
        action={
          !showAddForm && !editingId && (
            <Button onClick={openAddForm}>
              <Plus size={18} />
              {t('add')}
            </Button>
          )
        }
      />

      {/* Add Form (inline at top) */}
      {showAddForm && renderForm(false)}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('search')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-graminno-500"
            />
          </div>
          <Select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
            options={[
              { value: 'all', label: t('all') },
              { value: 'active', label: t('active') },
              { value: 'inactive', label: t('inactive') },
            ]}
            className="sm:w-40"
          />
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600 w-24">
                  {isMarathi ? 'कोड' : 'Code'}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">{t('name')}</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">{t('status')}</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map(category => (
                <React.Fragment key={category.id}>
                  {editingId === category.id ? (
                    <tr>
                      <td colSpan={4} className="p-0">
                        {renderForm(true)}
                      </td>
                    </tr>
                  ) : (
                    <tr className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-mono text-sm font-medium text-slate-700">
                          {getDisplayCode(category)}
                        </div>
                        {isMarathi && category.code && category.marathiCode && (
                          <div className="text-xs text-slate-400 font-mono">{category.code}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{getDisplayName(category)}</div>
                        {isMarathi && category.name && category.marathiName && (
                          <div className="text-xs text-slate-400">{category.name}</div>
                        )}
                        {!isMarathi && category.marathiName && (
                          <div className="text-xs text-slate-400">{category.marathiName}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                            category.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t(category.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => startEdit(category)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Pencil size={16} className="text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(category)}
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

        {filteredCategories.length === 0 && (
          <div className="text-center py-12 text-slate-500">{t('noData')}</div>
        )}
      </div>
    </div>
  );
};

export default ExpenseCategories;
