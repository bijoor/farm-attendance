import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import type { Activity } from '../types';
import { Plus, Pencil, Trash2, Search, Wand2 } from 'lucide-react';
import { transliterateToMarathi, generateMarathiCode } from '../utils/transliteration';

const Activities: React.FC = () => {
  const { data, settings, addActivity, updateActivity, deleteActivity } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    marathiCode: '',
    name: '',
    marathiName: '',
    category: '',
  });

  // Get display name based on language
  const getDisplayName = (activity: Activity) => {
    if (isMarathi && activity.marathiName) {
      return activity.marathiName;
    }
    return activity.name;
  };

  const filteredActivities = data.activities.filter(activity => {
    // Exclude soft-deleted activities
    if (activity.deleted) return false;
    return activity.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.marathiName && activity.marathiName.includes(searchQuery));
  });

  // Group by category
  const categories = [...new Set(data.activities.map(a => a.category || 'Other'))];

  const openAddModal = () => {
    setEditingActivity(null);
    setFormData({ code: '', marathiCode: '', name: '', marathiName: '', category: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      code: activity.code,
      marathiCode: activity.marathiCode || '',
      name: activity.name,
      marathiName: activity.marathiName || '',
      category: activity.category || '',
    });
    setIsModalOpen(true);
  };

  // Auto-transliterate handlers
  const autoTransliterateName = () => {
    if (formData.name) {
      setFormData({ ...formData, marathiName: transliterateToMarathi(formData.name) });
    }
  };

  const autoTransliterateCode = () => {
    if (formData.name) {
      // Generate short Marathi code from the name (first 2-3 chars of transliterated name)
      setFormData({ ...formData, marathiCode: generateMarathiCode(formData.name) });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) return;

    if (editingActivity) {
      updateActivity(editingActivity.id, formData);
    } else {
      addActivity(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (activity: Activity) => {
    if (confirm(`${t('confirmDelete')} "${getDisplayName(activity)}"?`)) {
      deleteActivity(activity.id);
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={t('activities')}
        subtitle={`${data.activities.length} ${t('activities')}`}
        action={
          <Button onClick={openAddModal}>
            <Plus size={18} />
            {t('add')}
          </Button>
        }
      />

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('search')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-graminno-500"
          />
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600">{t('code')}</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">{t('name')}</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">{t('category')}</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map(activity => (
                <tr key={activity.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="inline-flex px-2 py-1 bg-purple-100 text-purple-700 rounded font-mono text-sm font-medium">
                      {activity.code}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{getDisplayName(activity)}</div>
                    {/* Show alternate name */}
                    {isMarathi && activity.name && activity.marathiName && (
                      <div className="text-xs text-slate-400">{activity.name}</div>
                    )}
                    {!isMarathi && activity.marathiName && (
                      <div className="text-xs text-slate-400">{activity.marathiName}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {activity.category && (
                      <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-600 rounded text-sm">
                        {activity.category}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(activity)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Pencil size={16} className="text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(activity)}
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

        {filteredActivities.length === 0 && (
          <div className="text-center py-12 text-slate-500">{t('noData')}</div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingActivity ? t('edit') + ' ' + t('activity') : t('add') + ' ' + t('activity')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code fields side by side */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('code') + ' (EN)'}
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., WD"
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {t('code')} (MR)
                <button
                  type="button"
                  onClick={autoTransliterateCode}
                  className="ml-2 text-graminno-600 hover:text-graminno-700"
                  title={isMarathi ? 'स्वयं भाषांतर' : 'Auto translate'}
                >
                  <Wand2 size={14} className="inline" />
                </button>
              </label>
              <input
                type="text"
                value={formData.marathiCode}
                onChange={e => setFormData({ ...formData, marathiCode: e.target.value })}
                placeholder="e.g., नि"
                lang="mr"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-graminno-500"
              />
            </div>
          </div>
          <Input
            label={t('name') + ' (English)'}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Weeding"
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
              placeholder="e.g., निंदणी"
              lang="mr"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-graminno-500"
            />
          </div>
          <Input
            label={t('category')}
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            placeholder="e.g., Field Work"
            list="categories"
          />
          <datalist id="categories">
            {categories.map(cat => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
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

export default Activities;
