import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { Worker } from '../types';
import { formatCurrency } from '../utils/calculations';
import { Plus, Pencil, Trash2, Search, Wand2 } from 'lucide-react';
import { transliterateToMarathi } from '../utils/transliteration';

const Workers: React.FC = () => {
  const { data, settings, addWorker, updateWorker, deleteWorker } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Form state - dailyRate is string to avoid input issues
  const [formData, setFormData] = useState({
    name: '',
    marathiName: '',
    dailyRate: '400',
    status: 'active' as 'active' | 'inactive',
    notes: '',
  });

  // Get display name based on language
  const getDisplayName = (worker: Worker) => {
    if (isMarathi && worker.marathiName) {
      return worker.marathiName;
    }
    return worker.name;
  };

  const filteredWorkers = data.workers.filter(worker => {
    const matchesSearch =
      worker.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (worker.marathiName && worker.marathiName.includes(searchQuery));
    const matchesStatus = filterStatus === 'all' || worker.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openAddModal = () => {
    setEditingWorker(null);
    setFormData({ name: '', marathiName: '', dailyRate: '400', status: 'active', notes: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (worker: Worker) => {
    setEditingWorker(worker);
    setFormData({
      name: worker.name,
      marathiName: worker.marathiName || '',
      dailyRate: String(worker.dailyRate),
      status: worker.status,
      notes: worker.notes || '',
    });
    setIsModalOpen(true);
  };

  // Auto-transliterate handler
  const autoTransliterateName = () => {
    if (formData.name) {
      setFormData({ ...formData, marathiName: transliterateToMarathi(formData.name) });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const submitData = {
      ...formData,
      dailyRate: Number(formData.dailyRate) || 0,
    };

    if (editingWorker) {
      updateWorker(editingWorker.id, submitData);
    } else {
      addWorker(submitData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (worker: Worker) => {
    if (confirm(`${t('confirmDelete')} "${getDisplayName(worker)}"?`)) {
      deleteWorker(worker.id);
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={t('workers')}
        subtitle={`${data.workers.length} ${t('workers')}`}
        action={
          <Button onClick={openAddModal}>
            <Plus size={18} />
            {t('add')}
          </Button>
        }
      />

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

      {/* Workers List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600">{t('name')}</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">{t('dailyRate')}</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">{t('status')}</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkers.map(worker => (
                <tr key={worker.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{getDisplayName(worker)}</div>
                    {/* Show alternate name in smaller text */}
                    {isMarathi && worker.name && worker.marathiName && (
                      <div className="text-xs text-slate-400">{worker.name}</div>
                    )}
                    {!isMarathi && worker.marathiName && (
                      <div className="text-xs text-slate-400">{worker.marathiName}</div>
                    )}
                    {worker.notes && (
                      <div className="text-xs text-slate-500">{worker.notes}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-medium text-slate-700">
                    {formatCurrency(worker.dailyRate)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        worker.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t(worker.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(worker)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Pencil size={16} className="text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(worker)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredWorkers.length === 0 && (
          <div className="text-center py-12 text-slate-500">{t('noData')}</div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWorker ? t('edit') + ' ' + t('worker') : t('add') + ' ' + t('worker')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('name') + ' (English)'}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Babaram Karade"
            required
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t('marathiName')}
              <button
                type="button"
                onClick={autoTransliterateName}
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
              placeholder="e.g., बाबाराम कराडे"
              lang="mr"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-graminno-500"
            />
          </div>
          <Input
            label={t('dailyRate')}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formData.dailyRate}
            onChange={e => {
              // Convert Marathi numerals to ASCII and strip non-numeric
              const converted = e.target.value
                .replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)))
                .replace(/[^0-9]/g, '');
              setFormData({ ...formData, dailyRate: converted });
            }}
            required
            lang="en"
          />
          <Select
            label={t('status')}
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
            options={[
              { value: 'active', label: t('active') },
              { value: 'inactive', label: t('inactive') },
            ]}
          />
          <Input
            label={t('notes')}
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Optional notes"
          />
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1">
              {t('cancel')}
            </Button>
            <Button type="submit" className="flex-1">
              {t('save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Workers;
