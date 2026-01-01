import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import { format, parseISO } from 'date-fns';
import { getDaysArrayForMonth, formatMonthYear } from '../utils/calculations';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import type { AttendanceStatus } from '../types';

const GroupAttendance: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const {
    data,
    settings,
    getMonthData,
    getMonthGroups,
    addMonthGroup,
    updateGroupWorkers,
    updateGroupAttendance,
    updateGroupDayActivity,
    getWorkerDayTotal,
    getGroupById,
  } = useApp();
  const t = useTranslation(settings.language);
  const isMarathi = settings.language === 'mr';

  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Group worker management
  const [groupWorkerModalOpen, setGroupWorkerModalOpen] = useState(false);
  const [groupSelectedWorkerIds, setGroupSelectedWorkerIds] = useState<string[]>([]);

  // Get master group info
  const masterGroup = groupId ? getGroupById(groupId) : undefined;

  // Redirect if group not found
  useEffect(() => {
    if (groupId && !masterGroup) {
      navigate('/attendance');
    }
  }, [groupId, masterGroup, navigate]);

  // Get display name
  const getWorkerDisplayName = (worker: { name: string; marathiName?: string }) => {
    if (isMarathi && worker.marathiName) {
      return worker.marathiName;
    }
    return worker.name;
  };

  const groupDisplayName = masterGroup
    ? (isMarathi && masterGroup.marathiName ? masterGroup.marathiName : masterGroup.name)
    : '';

  const allActiveWorkers = data.workers.filter(w => w.status === 'active' && !w.deleted);
  const monthData = getMonthData(currentMonth);
  const monthGroups = getMonthGroups(currentMonth);

  // Auto-initialize: ensure this group exists in the current month
  useEffect(() => {
    if (!groupId || !masterGroup) return;
    const existingGroupIds = monthGroups.map(g => g.groupId).filter(Boolean);
    if (!existingGroupIds.includes(groupId)) {
      addMonthGroup(currentMonth, groupId);
    }
  }, [currentMonth, groupId, masterGroup, monthGroups, addMonthGroup]);

  // Find the month group for this master group
  const monthGroup = monthGroups.find(mg => mg.groupId === groupId);

  const days = getDaysArrayForMonth(currentMonth);

  // Get workers for this month (use workerIds if set, otherwise all active workers)
  const monthWorkers = useMemo(() => {
    if (monthData?.workerIds && monthData.workerIds.length > 0) {
      return allActiveWorkers.filter(w => monthData.workerIds!.includes(w.id));
    }
    return allActiveWorkers;
  }, [monthData, allActiveWorkers]);

  // Get workers for this group
  const groupWorkers = useMemo(() => {
    if (monthGroup?.workerIds && monthGroup.workerIds.length > 0) {
      return monthWorkers.filter(w => monthGroup.workerIds!.includes(w.id));
    }
    return monthWorkers;
  }, [monthGroup, monthWorkers]);

  // Generate month options
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

  const getAttendanceStatus = (workerId: string, day: number): AttendanceStatus => {
    if (!monthGroup) return '';
    const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
    const dayEntry = monthGroup.days.find(d => d.date === dateStr);
    return (dayEntry?.attendance[workerId] || '') as AttendanceStatus;
  };

  const getDayActivity = (day: number) => {
    if (!monthGroup) return { activityCode: '', areaCode: '' };
    const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
    const dayEntry = monthGroup.days.find(d => d.date === dateStr);
    return {
      activityCode: dayEntry?.activityCode || '',
      areaCode: dayEntry?.areaCode || '',
    };
  };

  const cycleAttendance = (workerId: string, day: number) => {
    if (!monthGroup) return;
    const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
    const current = getAttendanceStatus(workerId, day);
    const currentTotal = getWorkerDayTotal(currentMonth, dateStr, workerId);

    // Calculate what this worker has in OTHER groups
    const otherGroupsTotal = currentTotal - (current === 'P' ? 1 : current === 'H' ? 0.5 : 0);

    let next: AttendanceStatus = '';
    switch (current) {
      case '':
        if (otherGroupsTotal === 0) next = 'P';
        else if (otherGroupsTotal <= 0.5) next = 'H';
        else next = 'A';
        break;
      case 'P':
        next = 'A';
        break;
      case 'A':
        if (otherGroupsTotal <= 0.5) next = 'H';
        else next = '';
        break;
      case 'H':
        next = '';
        break;
    }

    updateGroupAttendance(currentMonth, monthGroup.id, dateStr, workerId, next);
  };

  // Calculate totals for a worker
  const calculateWorkerTotal = (workerId: string) => {
    let daysWorked = 0;
    let halfDays = 0;

    days.forEach(day => {
      const status = getAttendanceStatus(workerId, day);
      if (status === 'P') daysWorked++;
      if (status === 'H') halfDays++;
    });

    return { daysWorked, halfDays };
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'P': return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'A': return 'bg-red-100 text-red-700 hover:bg-red-200';
      case 'H': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
      default: return 'bg-slate-50 text-slate-400 hover:bg-slate-100';
    }
  };

  const hasExceededLimit = (workerId: string, day: number): boolean => {
    const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
    return getWorkerDayTotal(currentMonth, dateStr, workerId) > 1;
  };

  // Group worker management handlers
  const openGroupWorkerModal = () => {
    const currentGroupWorkerIds = monthGroup?.workerIds || monthWorkers.map(w => w.id);
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
    if (monthGroup) {
      updateGroupWorkers(currentMonth, monthGroup.id, groupSelectedWorkerIds);
    }
    setGroupWorkerModalOpen(false);
  };

  const handleActivityChange = (day: number, activityCode: string) => {
    if (!monthGroup) return;
    const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
    const { areaCode } = getDayActivity(day);
    updateGroupDayActivity(currentMonth, monthGroup.id, dateStr, activityCode || undefined, areaCode || undefined);
  };

  const handleAreaChange = (day: number, areaCode: string) => {
    if (!monthGroup) return;
    const dateStr = `${currentMonth}-${day.toString().padStart(2, '0')}`;
    const { activityCode } = getDayActivity(day);
    updateGroupDayActivity(currentMonth, monthGroup.id, dateStr, activityCode || undefined, areaCode || undefined);
  };

  // Get short display names
  const getActivityShortName = (code: string): string => {
    if (!code) return '';
    const activity = data.activities.find(a => a.code === code);
    if (!activity) return code;
    if (isMarathi && activity.marathiCode) {
      return activity.marathiCode;
    }
    return code;
  };

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

  // Get areas filtered by this group
  const getAreaOptions = () => {
    const filteredAreas = groupId
      ? data.areas.filter(a => a.groupId === groupId)
      : data.areas;

    return [
      { value: '', label: isMarathi ? '-- क्षेत्र निवडा --' : '-- Select Area --' },
      ...filteredAreas.map(a => ({
        value: a.code,
        label: isMarathi && a.marathiName ? a.marathiName : `${a.code} - ${a.name}`,
      })),
    ];
  };

  if (!masterGroup) {
    return null;
  }

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={groupDisplayName}
        subtitle={formatMonthYear(currentMonth)}
        action={
          <Button variant="secondary" onClick={openGroupWorkerModal}>
            <Users size={18} />
            {groupWorkers.length}/{monthWorkers.length}
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

      {/* Attendance Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              {/* Day numbers row */}
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
              </tr>

              {/* Activity/Area selection row */}
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 z-10 bg-slate-50 py-1 px-2 sm:px-3 text-left font-medium text-slate-600 min-w-[100px] sm:min-w-[140px]">
                  <div className="text-xs">{isMarathi ? 'कार्य' : 'Act'}</div>
                  <div className="text-xs">{isMarathi ? 'क्षेत्र' : 'Area'}</div>
                </th>
                {days.map(day => {
                  const { activityCode, areaCode } = getDayActivity(day);
                  const activityDisplay = getActivityShortName(activityCode);
                  const areaDisplay = getAreaShortName(areaCode);
                  return (
                    <th key={day} className="py-1 px-0.5 text-center min-w-[28px] sm:min-w-[36px]">
                      <div className="flex flex-col gap-0.5">
                        {/* Activity selector */}
                        <div className="relative">
                          <div className={`text-[10px] sm:text-xs font-semibold px-0.5 py-0.5 rounded cursor-pointer hover:bg-graminno-100 ${activityCode ? 'text-graminno-700 bg-graminno-50' : 'text-slate-400'}`}>
                            {activityDisplay || '·'}
                          </div>
                          <select
                            value={activityCode}
                            onChange={e => handleActivityChange(day, e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title={isMarathi ? 'कार्य निवडा' : 'Select Activity'}
                          >
                            {getActivityOptions().map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        {/* Area selector */}
                        <div className="relative">
                          <div className={`text-[10px] sm:text-xs font-semibold px-0.5 py-0.5 rounded cursor-pointer hover:bg-amber-100 ${areaCode ? 'text-amber-700 bg-amber-50' : 'text-slate-400'}`}>
                            {areaDisplay || '·'}
                          </div>
                          <select
                            value={areaCode}
                            onChange={e => handleAreaChange(day, e.target.value)}
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
              </tr>
            </thead>

            <tbody>
              {groupWorkers.length === 0 ? (
                <tr>
                  <td colSpan={days.length + 2} className="py-8 text-center text-slate-400">
                    {isMarathi ? 'या गटात कामगार नाहीत. कामगार जोडण्यासाठी वरील बटण वापरा.' : 'No workers in this group. Use the button above to add workers.'}
                  </td>
                </tr>
              ) : (
                groupWorkers.map((worker, idx) => {
                  const totals = calculateWorkerTotal(worker.id);
                  return (
                    <tr key={worker.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className={`sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} py-1.5 px-2 sm:px-3 font-medium text-slate-800 border-r border-slate-200 min-w-[100px] sm:min-w-[140px]`}>
                        <div className="truncate text-xs sm:text-sm">{getWorkerDisplayName(worker)}</div>
                      </td>
                      {days.map(day => {
                        const status = getAttendanceStatus(worker.id, day);
                        const exceeded = hasExceededLimit(worker.id, day);
                        return (
                          <td key={day} className="py-0.5 px-0.5">
                            <button
                              onClick={() => cycleAttendance(worker.id, day)}
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
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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

          <div className="flex gap-2">
            <Button variant="secondary" onClick={selectAllGroupWorkers} className="flex-1 text-sm">
              {t('all')}
            </Button>
            <Button variant="secondary" onClick={deselectAllGroupWorkers} className="flex-1 text-sm">
              {isMarathi ? 'काहीही नाही' : 'None'}
            </Button>
          </div>

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
                </div>
              </label>
            ))}
          </div>

          <div className="text-center text-sm text-slate-600">
            {groupSelectedWorkerIds.length} / {monthWorkers.length} {t('workers')}
          </div>

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

export default GroupAttendance;
