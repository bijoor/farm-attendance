import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { Area } from '../types';
import { Plus, Pencil, Trash2, Search, Wand2 } from 'lucide-react';
import { transliterateToMarathi, transliterateNumbers } from '../utils/transliteration';

const Areas: React.FC = () => {
  const { data, settings, addArea, updateArea, deleteArea, getGroupById } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  // Get active groups for the dropdown (exclude soft-deleted)
  const activeGroups = (data.groups || [])
    .filter(g => g.status === 'active' && !g.deleted)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    marathiCode: '',
    name: '',
    marathiName: '',
    description: '',
    groupId: '',
  });

  // Get display name based on language
  const getDisplayName = (area: Area) => {
    if (isMarathi && area.marathiName) {
      return area.marathiName;
    }
    return area.name;
  };

  const filteredAreas = data.areas.filter(area =>
    area.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (area.marathiName && area.marathiName.includes(searchQuery))
  );

  const openAddModal = () => {
    setEditingArea(null);
    setFormData({ code: '', marathiCode: '', name: '', marathiName: '', description: '', groupId: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (area: Area) => {
    setEditingArea(area);
    setFormData({
      code: area.code,
      marathiCode: area.marathiCode || '',
      name: area.name,
      marathiName: area.marathiName || '',
      description: area.description || '',
      groupId: area.groupId || '',
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
    if (formData.code) {
      setFormData({ ...formData, marathiCode: transliterateNumbers(formData.code) });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim() || !formData.name.trim()) return;

    // Convert empty groupId to undefined
    const areaData = {
      ...formData,
      groupId: formData.groupId || undefined,
    };

    if (editingArea) {
      updateArea(editingArea.id, areaData);
    } else {
      addArea(areaData);
    }
    setIsModalOpen(false);
  };

  // Helper to get group display name
  const getGroupDisplayName = (groupId?: string) => {
    if (!groupId) return null;
    const group = getGroupById(groupId);
    if (!group) return null;
    if (isMarathi && group.marathiName) {
      return group.marathiName;
    }
    return group.name;
  };

  const handleDelete = (area: Area) => {
    if (confirm(`${t('confirmDelete')} "${getDisplayName(area)}"?`)) {
      deleteArea(area.id);
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={t('areas')}
        subtitle={`${data.areas.length} ${t('areas')}`}
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

      {/* Areas Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAreas.map(area => (
          <div
            key={area.id}
            className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex flex-col gap-1">
                <span className="inline-flex px-2 py-1 bg-graminno-100 text-graminno-700 rounded font-mono text-sm font-medium">
                  {area.code}
                </span>
                {area.groupId && (
                  <span className="inline-flex px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                    {getGroupDisplayName(area.groupId)}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditModal(area)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Pencil size={16} className="text-slate-500" />
                </button>
                <button
                  onClick={() => handleDelete(area)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>
            <h3 className="font-medium text-slate-800 mb-1">{getDisplayName(area)}</h3>
            {/* Show alternate name */}
            {isMarathi && area.name && area.marathiName && (
              <p className="text-xs text-slate-400 mb-1">{area.name}</p>
            )}
            {!isMarathi && area.marathiName && (
              <p className="text-xs text-slate-400 mb-1">{area.marathiName}</p>
            )}
            {area.description && (
              <p className="text-sm text-slate-500">{area.description}</p>
            )}
          </div>
        ))}
      </div>

      {filteredAreas.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center text-slate-500">
          {t('noData')}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingArea ? t('edit') + ' ' + t('area') : t('add') + ' ' + t('area')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Code fields side by side */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('code') + ' (EN)'}
              value={formData.code}
              onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g., A1"
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
                placeholder="e.g., अ१"
                lang="mr"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-graminno-500"
              />
            </div>
          </div>
          <Input
            label={t('name') + ' (English)'}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Area 1, Block 2"
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
              placeholder="e.g., क्षेत्र १, ब्लॉक २"
              lang="mr"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-graminno-500"
            />
          </div>
          <Input
            label={t('description')}
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
          />
          <Select
            label={t('group')}
            value={formData.groupId}
            onChange={e => setFormData({ ...formData, groupId: e.target.value })}
            options={[
              { value: '', label: isMarathi ? '-- गट निवडा --' : '-- Select Group --' },
              ...activeGroups.map(g => ({
                value: g.id,
                label: isMarathi && g.marathiName ? g.marathiName : g.name,
              })),
            ]}
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

export default Areas;
