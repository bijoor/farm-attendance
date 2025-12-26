import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTranslation } from '../data/translations';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { format } from 'date-fns';
import { generatePrintableSheet, printSheet, exportMonthlyAttendanceToExcel } from '../utils/exporters';
import { formatMonthYear, getDaysArrayForMonth } from '../utils/calculations';
import { Printer, FileSpreadsheet } from 'lucide-react';

const Print: React.FC = () => {
  const { data, settings, getMonthData } = useApp();
  const t = useTranslation(settings.language);

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

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

  const activeWorkers = data.workers.filter(w => w.status === 'active');
  const days = getDaysArrayForMonth(selectedMonth);
  const monthData = getMonthData(selectedMonth);

  const handlePrint = () => {
    const html = generatePrintableSheet(selectedMonth, data.workers, data.areas, data.activities);
    printSheet(html);
  };

  const handleExportExcel = () => {
    exportMonthlyAttendanceToExcel(selectedMonth, data.workers, monthData);
  };

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title={t('printSheet')}
        subtitle="Generate printable attendance sheets"
      />

      {/* Month Selection */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="max-w-md">
          <Select
            label={t('selectMonth')}
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            options={monthOptions}
          />
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <Button onClick={handlePrint}>
            <Printer size={18} />
            {t('print')} (Blank Sheet)
          </Button>
          <Button variant="secondary" onClick={handleExportExcel}>
            <FileSpreadsheet size={18} />
            {t('export')} Excel
          </Button>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
          <h3 className="font-medium text-slate-700">Preview</h3>
        </div>

        <div className="p-4 overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Title */}
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">
                ग्रामीनो हजेरी - {formatMonthYear(selectedMonth)}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Graminno Attendance Register
              </p>
            </div>

            {/* Legend */}
            <div className="mb-4 text-xs text-slate-600">
              <strong>Legend:</strong> P = Present (हजर), A = Absent (गैरहजर), H = Half Day (अर्धा दिवस)
            </div>

            {/* Table */}
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 py-2 px-2 text-left">क्र.</th>
                  <th className="border border-slate-300 py-2 px-2 text-left min-w-[120px]">कामगार नाव</th>
                  <th className="border border-slate-300 py-2 px-2 text-center">दर</th>
                  {days.map(day => (
                    <th key={day} className="border border-slate-300 py-2 px-1 text-center w-6">
                      {day}
                    </th>
                  ))}
                  <th className="border border-slate-300 py-2 px-2 text-center">दिवस</th>
                  <th className="border border-slate-300 py-2 px-2 text-center">एकूण</th>
                  <th className="border border-slate-300 py-2 px-2 text-center min-w-[60px]">सही</th>
                </tr>
                <tr className="bg-yellow-50">
                  <td className="border border-slate-300 py-1 px-2"></td>
                  <td className="border border-slate-300 py-1 px-2 text-xs text-yellow-700">काम/क्षेत्र</td>
                  <td className="border border-slate-300 py-1 px-2"></td>
                  {days.map(day => (
                    <td key={day} className="border border-slate-300 py-1 px-1 text-center"></td>
                  ))}
                  <td className="border border-slate-300 py-1 px-2"></td>
                  <td className="border border-slate-300 py-1 px-2"></td>
                  <td className="border border-slate-300 py-1 px-2"></td>
                </tr>
              </thead>
              <tbody>
                {activeWorkers.map((worker, idx) => (
                  <tr key={worker.id}>
                    <td className="border border-slate-300 py-2 px-2 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 py-2 px-2">{worker.name}</td>
                    <td className="border border-slate-300 py-2 px-2 text-center">{worker.dailyRate}</td>
                    {days.map(day => (
                      <td key={day} className="border border-slate-300 py-2 px-1 text-center"></td>
                    ))}
                    <td className="border border-slate-300 py-2 px-2 text-center"></td>
                    <td className="border border-slate-300 py-2 px-2 text-center"></td>
                    <td className="border border-slate-300 py-2 px-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Footer */}
            <div className="mt-4 text-xs text-slate-600 space-y-1">
              <p>
                <strong>कामे / Activities:</strong>{' '}
                {data.activities.map(a => `${a.code} = ${a.name} (${a.marathiName || ''})`).join(', ')}
              </p>
              <p>
                <strong>क्षेत्रे / Areas:</strong>{' '}
                {data.areas.map(a => `${a.code} = ${a.name}`).join(', ')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 rounded-xl p-6 border border-blue-100">
        <h3 className="font-medium text-blue-800 mb-2">Instructions</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Click "Print" to generate a blank sheet for manual daily attendance</li>
          <li>• Fill in P (Present), A (Absent), or H (Half-day) for each worker each day</li>
          <li>• Write the activity code and area code in the "काम/क्षेत्र" row</li>
          <li>• At month end, enter the data into the app or export Excel for records</li>
        </ul>
      </div>
    </div>
  );
};

export default Print;
