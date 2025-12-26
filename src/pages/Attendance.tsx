import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { format, parseISO } from 'date-fns';
import { getDaysArrayForMonth, formatCurrency, formatMonthYear } from '../utils/calculations';
import { ChevronLeft, ChevronRight, Users, Plus, Trash2, Pencil } from 'lucide-react';
import type { MonthActivityGroup, AttendanceStatus } from '../types';

const Attendance: React.FC = () => {
  const {
    data,
    settings,
    getMonthData,
    getMonthGroups,
    updateMonthWorkers,
    addMonthGroup,
    removeMonthGroup,
    updateGroupName,
    updateGroupWorkers,
    updateGroupAttendance,
    updateGroupDayActivity,
    getWorkerDayTotal,
  } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // For group worker management
  const [groupWorkerModalOpen, setGroupWorkerModalOpen] = useState(false);
  const [editingGroupForWorkers, setEditingGroupForWorkers] = useState<string | null>(null);
  const [groupSelectedWorkerIds, setGroupSelectedWorkerIds] = useState<string[]>([]);

  // Get display name based on language
  const getWorkerDisplayName = (worker: { name: string; marathiName?: string }) => {
    if (isMarathi && worker.marathiName) {
      return worker.marathiName;
    }
    return worker.name;
  };

  const allActiveWorkers = data.workers.filter(w => w.status === 'active');
  const monthData = getMonthData(currentMonth);
  const groups = getMonthGroups(currentMonth);
  const days = getDaysArrayForMonth(currentMonth);

  // Get workers for this month (use workerIds if set, otherwise all active workers)
  const monthWorkers = useMemo(() => {
    if (monthData?.workerIds && monthData.workerIds.length > 0) {
      return allActiveWorkers.filter(w => monthData.workerIds!.includes(w.id));
    }
    return allActiveWorkers;
  }, [monthData, allActiveWorkers]);

  // Get workers for a specific group
  const getGroupWorkers = (group: MonthActivityGroup) => {
    if (group.workerIds && group.workerIds.length > 0) {
      return monthWorkers.filter(w => group.workerIds!.includes(w.id));
    }
    return monthWorkers;
  };

  // Generate month options (last 12 months + next 2 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = -12; i <= 2; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy');
      options.push({ value, label });
    }
    return options;
  }, []);

  const prevMonth = () => {
    const date = parseISO(`${currentMonth}-01`);
    date.setMonth(date.getMonth() - 1);
    setCurrentMonth(format(date, 'yyyy-MM'));
  };

  const nextMonth = () => {
    const date = parseISO(`${currentMonth}-01`);
    date.setMonth(date.getMonth() + 1);
    setCurrentMonth(format(date, 'yyyy-MM'));
  };

  const getAttendanceStatus = (group: MonthActivityGroup, workerId: string, day: number): AttendanceStatus => {
    const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
    const dayEntry = group.days.find(d => d.date === dateStr);
    return (dayEntry?.attendance[workerId] || '') as AttendanceStatus;
  };

  const getGroupDayActivity = (group: MonthActivityGroup, day: number) => {
    const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
    const dayEntry = group.days.find(d => d.date === dateStr);
    return {
      activityCode: dayEntry?.activityCode || '',
      areaCode: dayEntry?.areaCode || '',
    };
  };

  const cycleAttendance = (groupId: string, workerId: string, day: number) => {
    const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const current = getAttendanceStatus(group, workerId, day);
    const currentTotal = getWorkerDayTotal(currentMonth, dateStr, workerId);

    // Calculate what this worker has in OTHER groups
    const otherGroupsTotal = currentTotal - (current === 'P' ? 1 : current === 'H' ? 0.5 : 0);

    let next: AttendanceStatus = '';
    switch (current) {
      case '':
        // Can add P only if no other attendance, else H if <= 0.5 remaining
        if (otherGroupsTotal === 0) next = 'P';
        else if (otherGroupsTotal <= 0.5) next = 'H';
        else next = 'A';
        break;
      case 'P':
        next = 'A';
        break;
      case 'A':
        // Can add H only if <= 0.5 total in other groups
        if (otherGroupsTotal <= 0.5) next = 'H';
        else next = '';
        break;
      case 'H':
        next = '';
        break;
    }

    updateGroupAttendance(currentMonth, groupId, dateStr, workerId, next);
  };

  // Calculate totals for a worker in a group
  const calculateWorkerGroupTotal = (group: MonthActivityGroup, workerId: string) => {
    let daysWorked = 0;
    let halfDays = 0;

    days.forEach(day => {
      const status = getAttendanceStatus(group, workerId, day);
      if (status === 'P') daysWorked++;
      if (status === 'H') halfDays++;
    });

    const worker = data.workers.find(w => w.id === workerId);
    const rate = worker?.dailyRate || 0;
    const total = (daysWorked * rate) + (halfDays * rate * 0.5);

    return { daysWorked, halfDays, total };
  };

  // Calculate grand total across all groups
  const grandTotal = useMemo(() => {
    let total = 0;
    for (const group of groups) {
      const groupWorkers = getGroupWorkers(group);
      for (const worker of groupWorkers) {
        total += calculateWorkerGroupTotal(group, worker.id).total;
      }
    }
    return total;
  }, [groups, monthWorkers, currentMonth]);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'P': return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'A': return 'bg-red-100 text-red-700 hover:bg-red-200';
      case 'H': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
      default: return 'bg-slate-50 text-slate-400 hover:bg-slate-100';
    }
  };

  // Check if worker has exceeded daily limit
  const hasExceededLimit = (workerId: string, day: number): boolean => {
    const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
    return getWorkerDayTotal(currentMonth, dateStr, workerId) > 1;
  };

  // Worker selection modal handlers (for month)
  const openWorkerModal = () => {
    const currentWorkerIds = monthData?.workerIds || allActiveWorkers.map(w => w.id);
    setSelectedWorkerIds(currentWorkerIds);
    setIsWorkerModalOpen(true);
  };

  const toggleWorkerSelection = (workerId: string) => {
    setSelectedWorkerIds(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const selectAllWorkers = () => {
    setSelectedWorkerIds(allActiveWorkers.map(w => w.id));
  };

  const deselectAllWorkers = () => {
    setSelectedWorkerIds([]);
  };

  const saveWorkerSelection = () => {
    updateMonthWorkers(currentMonth, selectedWorkerIds);
    setIsWorkerModalOpen(false);
  };

  // Group worker management handlers
  const openGroupWorkerModal = (group: MonthActivityGroup) => {
    setEditingGroupForWorkers(group.id);
    // If group has specific workers, use those; otherwise use all month workers
    const currentGroupWorkerIds = group.workerIds || monthWorkers.map(w => w.id);
    setGroupSelectedWorkerIds(currentGroupWorkerIds);
    setGroupWorkerModalOpen(true);
  };

  const toggleGroupWorkerSelection = (workerId: string) => {
    setGroupSelectedWorkerIds(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const selectAllGroupWorkers = () => {
    setGroupSelectedWorkerIds(monthWorkers.map(w => w.id));
  };

  const deselectAllGroupWorkers = () => {
    setGroupSelectedWorkerIds([]);
  };

  const saveGroupWorkerSelection = () => {
    if (editingGroupForWorkers) {
      updateGroupWorkers(currentMonth, editingGroupForWorkers, groupSelectedWorkerIds);
    }
    setGroupWorkerModalOpen(false);
    setEditingGroupForWorkers(null);
  };

  // Check if worker has any attendance in a group
  const workerHasAttendanceInGroup = (group: MonthActivityGroup, workerId: string): boolean => {
    for (const day of days) {
      const status = getAttendanceStatus(group, workerId, day);
      if (status === 'P' || status === 'A' || status === 'H') {
        return true;
      }
    }
    return false;
  };

  // Check if a group has any attendance data
  const groupHasAnyAttendance = (group: MonthActivityGroup): boolean => {
    const groupWorkers = getGroupWorkers(group);
    for (const worker of groupWorkers) {
      if (workerHasAttendanceInGroup(group, worker.id)) {
        return true;
      }
    }
    return false;
  };

  // Group management
  const handleAddGroup = () => {
    addMonthGroup(currentMonth);
  };

  const handleRemoveGroup = (groupId: string) => {
    if (groups.length <= 1) return;

    const group = groups.find(g => g.id === groupId);
    if (group && groupHasAnyAttendance(group)) {
      alert(isMarathi
        ? 'या गटात हजेरी नोंदवलेली आहे. प्रथम सर्व हजेरी काढा.'
        : 'This group has attendance recorded. Clear all attendance first.');
      return;
    }

    if (confirm(isMarathi ? 'हा गट हटवायचा आहे का?' : 'Remove this group?')) {
      removeMonthGroup(currentMonth, groupId);
    }
  };

  const startEditingGroupName = (group: MonthActivityGroup) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.name || '');
  };

  const saveGroupName = () => {
    if (editingGroupId && editingGroupName.trim()) {
      updateGroupName(currentMonth, editingGroupId, editingGroupName.trim());
    }
    setEditingGroupId(null);
    setEditingGroupName('');
  };

  const handleActivityChange = (groupId: string, day: number, activityCode: string) => {
    const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
    const group = groups.find(g => g.id === groupId);
    const { areaCode } = getGroupDayActivity(group!, day);
    updateGroupDayActivity(currentMonth, groupId, dateStr, activityCode || undefined, areaCode || undefined);
  };

  const handleAreaChange = (groupId: string, day: number, areaCode: string) => {
    const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
    const group = groups.find(g => g.id === groupId);
    const { activityCode } = getGroupDayActivity(group!, day);
    updateGroupDayActivity(currentMonth, groupId, dateStr, activityCode || undefined, areaCode || undefined);
  };

  // Get short display name for activity (code in English, marathiCode in Marathi)
  const getActivityShortName = (code: string): string => {
    if (!code) return '';
    const activity = data.activities.find(a => a.code === code);
    if (!activity) return code;
    if (isMarathi && activity.marathiCode) {
      return activity.marathiCode;
    }
    return code;
  };

  // Get short display name for area (code in English, marathiCode in Marathi)
  const getAreaShortName = (code: string): string => {
    if (!code) return '';
    const area = data.areas.find(a => a.code === code);
    if (!area) return code;
    if (isMarathi && area.marathiCode) {
      return area.marathiCode;
    }
    return code;
  };

  const getActivityOptions = () => [
    { value: '', label: isMarathi ? '-- कार्य निवडा --' : '-- Select Activity --' },
    ...data.activities.map(a => ({
      value: a.code,
      label: isMarathi && a.marathiName ? a.marathiName : `${a.code} - ${a.name}`,
    })),
  ];

  const getAreaOptions = () => [
    { value: '', label: isMarathi ? '-- क्षेत्र निवडा --' : '-- Select Area --' },
    ...data.areas.map(a => ({
      value: a.code,
      label: isMarathi && a.marathiName ? a.marathiName : `${a.code} - ${a.name}`,
    })),
  ];

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={t('attendance')}
        subtitle={formatMonthYear(currentMonth)}
        action={
          <Button variant="secondary" onClick={openWorkerModal}>
            <Users size={18} />
            {monthWorkers.length}/{allActiveWorkers.length}
          </Button>
        }
      />

      {/* Month Navigation */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-4">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={prevMonth}>
            <ChevronLeft size={20} />
          </Button>

          <Select
            value={currentMonth}
            onChange={e => setCurrentMonth(e.target.value)}
            options={monthOptions}
            className="flex-1 max-w-xs"
          />

          <Button variant="ghost" onClick={nextMonth}>
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      {/* Activity Groups - Stacked */}
      <div className="space-y-6">
        {groups.map((group, groupIndex) => {
          const groupWorkers = getGroupWorkers(group);
          const groupTotal = groupWorkers.reduce((sum, w) => sum + calculateWorkerGroupTotal(group, w.id).total, 0);

          return (
            <div key={group.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Group Header */}
              <div className="bg-graminno-50 border-b border-graminno-200 p-2 sm:p-3 flex items-center gap-2">
                {editingGroupId === group.id ? (
                  <input
                    type="text"
                    value={editingGroupName}
                    onChange={e => setEditingGroupName(e.target.value)}
                    onBlur={saveGroupName}
                    onKeyDown={e => e.key === 'Enter' && saveGroupName()}
                    className="flex-1 px-2 py-1 text-sm border border-graminno-300 rounded focus:outline-none focus:ring-2 focus:ring-graminno-500"
                    autoFocus
                  />
                ) : (
                  <h3 className="flex-1 font-semibold text-graminno-800 text-sm sm:text-base truncate">
                    {group.name || `Group ${groupIndex + 1}`}
                  </h3>
                )}
                <button
                  onClick={() => startEditingGroupName(group)}
                  className="p-2 hover:bg-graminno-100 rounded text-graminno-600"
                  title={t('edit')}
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => openGroupWorkerModal(group)}
                  className="p-2 hover:bg-graminno-100 rounded text-graminno-600 flex items-center gap-1"
                  title={isMarathi ? 'कामगार व्यवस्थापित करा' : 'Manage workers'}
                >
                  <Users size={16} />
                  <span className="text-xs font-medium">{groupWorkers.length}</span>
                </button>
                {groups.length > 1 && (
                  <button
                    onClick={() => handleRemoveGroup(group.id)}
                    className="p-2 hover:bg-red-100 rounded text-red-500"
                    title={t('delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Attendance Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    {/* Day numbers row - dark green header */}
                    <tr className="bg-graminno-600 text-white">
                      <th className="sticky left-0 z-10 bg-graminno-600 py-2 px-2 sm:px-3 text-left font-medium min-w-[100px] sm:min-w-[140px] text-xs sm:text-sm">
                        {t('worker')}
                      </th>
                      {days.map(day => (
                        <th key={day} className="py-2 px-0.5 sm:px-1 text-center font-medium w-8 min-w-[28px] sm:min-w-[32px] text-xs sm:text-sm">
                          {day}
                        </th>
                      ))}
                      <th className="py-2 px-1 sm:px-2 text-center font-medium min-w-[40px] sm:min-w-[50px] text-xs sm:text-sm">{isMarathi ? 'दिवस' : 'Days'}</th>
                      <th className="py-2 px-1 sm:px-2 text-center font-medium min-w-[60px] sm:min-w-[80px] text-xs sm:text-sm">{t('total')}</th>
                    </tr>

                    {/* Activity/Area selection row */}
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="sticky left-0 z-10 bg-slate-50 py-1 px-2 sm:px-3 text-left font-medium text-slate-600 min-w-[100px] sm:min-w-[140px]">
                        <div className="text-xs">{isMarathi ? 'कार्य' : 'Act'}</div>
                        <div className="text-xs">{isMarathi ? 'क्षेत्र' : 'Area'}</div>
                      </th>
                      {days.map(day => {
                        const { activityCode, areaCode } = getGroupDayActivity(group, day);
                        const activityDisplay = getActivityShortName(activityCode);
                        const areaDisplay = getAreaShortName(areaCode);
                        return (
                          <th key={day} className="py-1 px-0.5 text-center min-w-[28px] sm:min-w-[36px]">
                            <div className="flex flex-col gap-0.5">
                              {/* Activity selector - shows short name, dropdown has full names */}
                              <div className="relative">
                                <div className={`text-[10px] sm:text-xs font-semibold px-0.5 py-0.5 rounded cursor-pointer hover:bg-graminno-100 ${activityCode ? 'text-graminno-700 bg-graminno-50' : 'text-slate-400'}`}>
                                  {activityDisplay || '·'}
                                </div>
                                <select
                                  value={activityCode}
                                  onChange={e => handleActivityChange(group.id, day, e.target.value)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  title={isMarathi ? 'कार्य निवडा' : 'Select Activity'}
                                >
                                  {getActivityOptions().map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                              {/* Area selector - shows short name, dropdown has full names */}
                              <div className="relative">
                                <div className={`text-[10px] sm:text-xs font-semibold px-0.5 py-0.5 rounded cursor-pointer hover:bg-amber-100 ${areaCode ? 'text-amber-700 bg-amber-50' : 'text-slate-400'}`}>
                                  {areaDisplay || '·'}
                                </div>
                                <select
                                  value={areaCode}
                                  onChange={e => handleAreaChange(group.id, day, e.target.value)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  title={isMarathi ? 'क्षेत्र निवडा' : 'Select Area'}
                                >
                                  {getAreaOptions().map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </th>
                        );
                      })}
                      <th className="py-1 px-1"></th>
                      <th className="py-1 px-1"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {groupWorkers.length === 0 ? (
                      <tr>
                        <td colSpan={days.length + 3} className="py-8 text-center text-slate-400">
                          {isMarathi ? 'या गटात कामगार नाहीत. कामगार जोडण्यासाठी वरील बटण वापरा.' : 'No workers in this group. Use the button above to add workers.'}
                        </td>
                      </tr>
                    ) : (
                      groupWorkers.map((worker, idx) => {
                        const totals = calculateWorkerGroupTotal(group, worker.id);
                        return (
                          <tr key={worker.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                            <td className={`sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} py-1.5 px-2 sm:px-3 font-medium text-slate-800 border-r border-slate-200 min-w-[100px] sm:min-w-[140px]`}>
                              <div className="truncate text-xs sm:text-sm">{getWorkerDisplayName(worker)}</div>
                            </td>
                            {days.map(day => {
                              const status = getAttendanceStatus(group, worker.id, day);
                              const exceeded = hasExceededLimit(worker.id, day);
                              return (
                                <td key={day} className="py-0.5 px-0.5">
                                  <button
                                    onClick={() => cycleAttendance(group.id, worker.id, day)}
                                    className={`w-full h-7 sm:h-8 rounded text-[10px] sm:text-xs font-medium transition-colors ${getStatusClass(status)} ${exceeded ? 'ring-2 ring-red-500' : ''}`}
                                    title={exceeded ? (isMarathi ? 'दैनिक मर्यादा ओलांडली!' : 'Exceeds daily limit!') : ''}
                                  >
                                    {status || '-'}
                                  </button>
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-1 sm:px-2 text-center font-medium text-slate-700 text-xs sm:text-sm">
                              {totals.daysWorked}
                              {totals.halfDays > 0 && (
                                <span className="text-[10px] sm:text-xs text-slate-500">+{totals.halfDays}H</span>
                              )}
                            </td>
                            <td className="py-1.5 px-1 sm:px-2 text-center font-medium text-slate-800 text-xs sm:text-sm whitespace-nowrap">
                              {formatCurrency(totals.total)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {groupWorkers.length > 0 && (
                    <tfoot>
                      <tr className="bg-graminno-50 border-t-2 border-graminno-200">
                        <td className="sticky left-0 bg-graminno-50 py-3 px-3 font-bold text-graminno-800">
                          {group.name || `Group ${groupIndex + 1}`} {t('total')}
                        </td>
                        <td colSpan={days.length + 1} />
                        <td className="py-3 px-2 text-center font-bold text-graminno-800">
                          {formatCurrency(groupTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          );
        })}

        {/* Add Group Button */}
        <button
          onClick={handleAddGroup}
          className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-graminno-500 hover:text-graminno-600 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          {isMarathi ? 'नवीन गट जोडा' : 'Add Activity Group'}
        </button>

        {/* Grand Total */}
        <div className="bg-graminno-600 text-white rounded-xl p-4 flex items-center justify-between">
          <span className="text-lg font-bold">{isMarathi ? 'एकूण खर्च' : 'Grand Total'}</span>
          <span className="text-2xl font-bold">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-green-100 text-green-700 flex items-center justify-center text-xs font-medium">P</span>
          <span className="text-slate-600">{t('present')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-red-100 text-red-700 flex items-center justify-center text-xs font-medium">A</span>
          <span className="text-slate-600">{t('absent')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-medium">H</span>
          <span className="text-slate-600">{t('halfDay')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded ring-2 ring-red-500 flex items-center justify-center text-xs font-medium text-slate-400">!</span>
          <span className="text-slate-600">{isMarathi ? 'मर्यादा ओलांडली' : 'Exceeds limit'}</span>
        </div>
      </div>

      {/* Month Worker Selection Modal */}
      <Modal
        isOpen={isWorkerModalOpen}
        onClose={() => setIsWorkerModalOpen(false)}
        title={`${t('workers')} - ${formatMonthYear(currentMonth)}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {isMarathi ? 'या महिन्यासाठी कामगार निवडा:' : 'Select workers for this month:'}
          </p>

          {/* Select/Deselect All */}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={selectAllWorkers} className="flex-1 text-sm">
              {t('all')}
            </Button>
            <Button variant="secondary" onClick={deselectAllWorkers} className="flex-1 text-sm">
              {isMarathi ? 'काहीही नाही' : 'None'}
            </Button>
          </div>

          {/* Worker List */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {allActiveWorkers.map(worker => (
              <label
                key={worker.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedWorkerIds.includes(worker.id)
                    ? 'bg-graminno-50 border border-graminno-200'
                    : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedWorkerIds.includes(worker.id)}
                  onChange={() => toggleWorkerSelection(worker.id)}
                  className="w-5 h-5 rounded border-slate-300 text-graminno-600 focus:ring-graminno-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{getWorkerDisplayName(worker)}</div>
                  <div className="text-xs text-slate-500">₹{worker.dailyRate}/day</div>
                </div>
              </label>
            ))}
          </div>

          {/* Selected count */}
          <div className="text-center text-sm text-slate-600">
            {selectedWorkerIds.length} / {allActiveWorkers.length} {t('workers')}
          </div>

          {/* Save Button */}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsWorkerModalOpen(false)} className="flex-1">
              {t('cancel')}
            </Button>
            <Button onClick={saveWorkerSelection} className="flex-1">
              {t('save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Group Worker Selection Modal */}
      <Modal
        isOpen={groupWorkerModalOpen}
        onClose={() => setGroupWorkerModalOpen(false)}
        title={isMarathi ? 'गटातील कामगार' : 'Group Workers'}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {isMarathi ? 'या गटासाठी कामगार निवडा:' : 'Select workers for this group:'}
          </p>

          {/* Select/Deselect All */}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={selectAllGroupWorkers} className="flex-1 text-sm">
              {t('all')}
            </Button>
            <Button variant="secondary" onClick={deselectAllGroupWorkers} className="flex-1 text-sm">
              {isMarathi ? 'काहीही नाही' : 'None'}
            </Button>
          </div>

          {/* Worker List - only month workers */}
          <div className="max-h-80 overflow-y-auto space-y-2">
            {monthWorkers.map(worker => (
              <label
                key={worker.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  groupSelectedWorkerIds.includes(worker.id)
                    ? 'bg-graminno-50 border border-graminno-200'
                    : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                <input
                  type="checkbox"
                  checked={groupSelectedWorkerIds.includes(worker.id)}
                  onChange={() => toggleGroupWorkerSelection(worker.id)}
                  className="w-5 h-5 rounded border-slate-300 text-graminno-600 focus:ring-graminno-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{getWorkerDisplayName(worker)}</div>
                  <div className="text-xs text-slate-500">₹{worker.dailyRate}/day</div>
                </div>
              </label>
            ))}
          </div>

          {/* Selected count */}
          <div className="text-center text-sm text-slate-600">
            {groupSelectedWorkerIds.length} / {monthWorkers.length} {t('workers')}
          </div>

          {/* Save Button */}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setGroupWorkerModalOpen(false)} className="flex-1">
              {t('cancel')}
            </Button>
            <Button onClick={saveGroupWorkerSelection} className="flex-1">
              {t('save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Attendance;
