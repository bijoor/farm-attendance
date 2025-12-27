import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import type { Group } from '../types';
import { Plus, Pencil, Trash2, Search, Wand2, ChevronUp, ChevronDown } from 'lucide-react';
import { transliterateToMarathi } from '../utils/transliteration';

const Groups: React.FC = () => {
  const { data, settings, addGroup, updateGroup, deleteGroup, reorderGroup } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [formData, setFormData] = useState({
    name: '',
    marathiName: '',
    status: 'active' as 'active' | 'inactive',
  });

  const getDisplayName = (group: Group) => {
    if (isMarathi && group.marathiName) {
      return group.marathiName;
    }
    return group.name;
  };

  // Filter out soft-deleted groups
  const groups = (data.groups || []).filter(g => !g.deleted);

  // Sort groups by order
  const sortedGroups = [...groups].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const filteredGroups = sortedGroups.filter(group => {
    const matchesSearch =
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (group.marathiName && group.marathiName.includes(searchQuery));
    const matchesStatus = filterStatus === 'all' || group.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Check if a group can move up or down (based on sorted position)
  const canMoveUp = (group: Group) => {
    const index = sortedGroups.findIndex(g => g.id === group.id);
    return index > 0;
  };

  const canMoveDown = (group: Group) => {
    const index = sortedGroups.findIndex(g => g.id === group.id);
    return index < sortedGroups.length - 1;
  };

  const openAddModal = () => {
    setEditingGroup(null);
    setFormData({ name: '', marathiName: '', status: 'active' });
    setIsModalOpen(true);
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      marathiName: group.marathiName || '',
      status: group.status,
    });
    setIsModalOpen(true);
  };

  const autoTransliterateName = () => {
    if (formData.name) {
      setFormData({ ...formData, marathiName: transliterateToMarathi(formData.name) });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingGroup) {
      updateGroup(editingGroup.id, formData);
    } else {
      addGroup(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (group: Group) => {
    if (confirm(`${t('confirmDelete')} "${getDisplayName(group)}"?`)) {
      deleteGroup(group.id);
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={isMarathi ? 'गट' : 'Groups'}
        subtitle={`${groups.length} ${isMarathi ? 'गट' : 'groups'}`}
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

      {/* Groups List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-center py-3 px-2 font-medium text-slate-600 w-20">
                  {isMarathi ? 'क्रम' : 'Order'}
                </th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">{t('name')}</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">{t('status')}</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map(group => (
                <tr key={group.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-2">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => reorderGroup(group.id, 'up')}
                        disabled={!canMoveUp(group)}
                        className={`p-1 rounded transition-colors ${
                          canMoveUp(group)
                            ? 'hover:bg-graminno-100 text-graminno-600'
                            : 'text-slate-300 cursor-not-allowed'
                        }`}
                        title={isMarathi ? 'वर हलवा' : 'Move up'}
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        onClick={() => reorderGroup(group.id, 'down')}
                        disabled={!canMoveDown(group)}
                        className={`p-1 rounded transition-colors ${
                          canMoveDown(group)
                            ? 'hover:bg-graminno-100 text-graminno-600'
                            : 'text-slate-300 cursor-not-allowed'
                        }`}
                        title={isMarathi ? 'खाली हलवा' : 'Move down'}
                      >
                        <ChevronDown size={18} />
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{getDisplayName(group)}</div>
                    {isMarathi && group.name && group.marathiName && (
                      <div className="text-xs text-slate-400">{group.name}</div>
                    )}
                    {!isMarathi && group.marathiName && (
                      <div className="text-xs text-slate-400">{group.marathiName}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        group.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t(group.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(group)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Pencil size={16} className="text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(group)}
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

        {filteredGroups.length === 0 && (
          <div className="text-center py-12 text-slate-500">{t('noData')}</div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGroup ? `${t('edit')} ${isMarathi ? 'गट' : 'Group'}` : `${t('add')} ${isMarathi ? 'गट' : 'Group'}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={`${t('name')} (English)`}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Team A, Spraying Team"
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
              placeholder="e.g., गट अ, फवारणी गट"
              lang="mr"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-graminno-500"
            />
          </div>
          <Select
            label={t('status')}
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
            options={[
              { value: 'active', label: t('active') },
              { value: 'inactive', label: t('inactive') },
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

export default Groups;
