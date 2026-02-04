import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/layout/PageHeader';
import AccountStatement from '../components/AccountStatement';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { format, parseISO } from 'date-fns';
import {
  calculateGroupBalanceForPeriod,
  calculateLabourCostByGroupForPeriod,
  calculateExpensesByGroupForPeriod,
  calculatePaymentsByGroupForPeriod,
} from '../utils/calculations';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import type { SettlementPeriod } from '../types';

const Settlements: React.FC = () => {
  const { data, settings, addSettlementPeriod, updateSettlementPeriod, deleteSettlementPeriod } = useApp();
  const isMarathi = settings.language === 'mr';

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
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
      <div className="no-print">
        <PageHeader
          title={isMarathi ? 'तहकूब' : 'Settlements'}
          subtitle={isMarathi ? 'सानुकूल कालावधीसाठी खाते' : 'Accounts for custom date ranges'}
        />
      </div>

      {/* Period management */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 mb-6 no-print">
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
        <AccountStatement
          balanceReport={balanceReport}
          labourCostData={labourCostData}
          expenseData={expenseData}
          paymentData={paymentData}
          printTitle={isMarathi ? 'तहकूब विवरण' : 'Settlement Statement'}
          printSubtitle={`${isMarathi && selectedPeriod.marathiName ? selectedPeriod.marathiName : selectedPeriod.name} — ${formatDateRange(selectedPeriod)}`}
          noDataMessage={isMarathi ? 'या कालावधीसाठी कोणताही डेटा नाही' : 'No data for this period'}
          isMarathi={isMarathi}
        />
      )}
    </div>
  );
};

export default Settlements;
