import * as XLSX from 'xlsx';
import type { AppData, Worker, Area, Activity, MonthData, GroupDayEntry } from '../types';
import { formatMonthYear, getDaysArrayForMonth } from './calculations';

// Helper to get all day entries from a month (supports both legacy and groups format)
const getAllDaysFromMonth = (monthData: MonthData | undefined): GroupDayEntry[] => {
  if (!monthData) return [];
  // New format: groups with days
  if (monthData.groups && monthData.groups.length > 0) {
    return monthData.groups.flatMap(g => g.days || []);
  }
  // Legacy format: days array
  if (monthData.days && monthData.days.length > 0) {
    return monthData.days;
  }
  return [];
};

export const exportToJson = (data: AppData): void => {
  const exportPayload = {
    ...data,
    exportedAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `graminno-attendance-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const shareViaWhatsApp = (data: AppData): void => {
  const exportPayload = {
    ...data,
    exportedAt: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(exportPayload);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const file = new File([blob], `graminno-backup-${new Date().toISOString().split('T')[0]}.json`, {
    type: 'application/json',
  });

  if (navigator.share && navigator.canShare({ files: [file] })) {
    navigator.share({
      files: [file],
      title: 'Graminno Attendance Backup',
      text: 'Farm attendance data backup',
    }).catch(console.error);
  } else {
    // Fallback: download the file
    exportToJson(data);
    alert('File downloaded. Please share it manually via WhatsApp.');
  }
};

export const exportWorkersToExcel = (workers: Worker[]): void => {
  const wsData = [
    ['Worker ID', 'Name', 'Daily Rate (₹)', 'Status', 'Join Date', 'Notes'],
    ...workers.map(w => [w.id, w.name, w.dailyRate, w.status, w.joinedDate || '', w.notes || '']),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Workers');
  XLSX.writeFile(wb, 'workers.xlsx');
};

export const exportAreasToExcel = (areas: Area[]): void => {
  const wsData = [
    ['Area ID', 'Code', 'Name', 'Description'],
    ...areas.map(a => [a.id, a.code, a.name, a.description || '']),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Areas');
  XLSX.writeFile(wb, 'areas.xlsx');
};

export const exportActivitiesToExcel = (activities: Activity[]): void => {
  const wsData = [
    ['Activity ID', 'Code', 'Name', 'Marathi Name', 'Category'],
    ...activities.map(a => [a.id, a.code, a.name, a.marathiName || '', a.category || '']),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Activities');
  XLSX.writeFile(wb, 'activities.xlsx');
};

export const exportMonthlyAttendanceToExcel = (
  monthStr: string,
  workers: Worker[],
  monthData: MonthData | undefined
): void => {
  const days = getDaysArrayForMonth(monthStr);
  const activeWorkers = workers.filter(w => w.status === 'active');

  // Header row
  const headers = ['Sr.', 'Worker Name', 'Rate', ...days.map(d => d.toString()), 'Days', 'Half', 'Total'];

  // Data rows
  const allDayEntries = getAllDaysFromMonth(monthData);
  const dataRows = activeWorkers.map((worker, idx) => {
    let daysWorked = 0;
    let halfDays = 0;

    const dayStatuses = days.map(day => {
      const dateStr = `${monthStr}-${day.toString().padStart(2, '0')}`;
      const dayEntry = allDayEntries.find(d => d.date === dateStr);
      const status = dayEntry?.attendance[worker.id] || '';

      if (status === 'P') daysWorked++;
      if (status === 'H') halfDays++;

      return status;
    });

    const total = (daysWorked * worker.dailyRate) + (halfDays * worker.dailyRate * 0.5);

    return [idx + 1, worker.name, worker.dailyRate, ...dayStatuses, daysWorked, halfDays, total];
  });

  const wsData = [
    [`Attendance Register - ${formatMonthYear(monthStr)}`],
    [],
    headers,
    ...dataRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 4 },  // Sr.
    { wch: 20 }, // Name
    { wch: 6 },  // Rate
    ...days.map(() => ({ wch: 3 })), // Days
    { wch: 5 },  // Days worked
    { wch: 5 },  // Half days
    { wch: 10 }, // Total
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, monthStr);
  XLSX.writeFile(wb, `attendance-${monthStr}.xlsx`);
};

export const generatePrintableSheet = (
  monthStr: string,
  workers: Worker[],
  areas: Area[],
  activities: Activity[]
): string => {
  const days = getDaysArrayForMonth(monthStr);
  const activeWorkers = workers.filter(w => w.status === 'active');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Attendance - ${formatMonthYear(monthStr)}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 10px;
        }
        h1 {
          text-align: center;
          font-size: 16px;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #333;
          padding: 3px;
          text-align: center;
        }
        th {
          background-color: #f0f0f0;
        }
        .name-col {
          text-align: left;
          min-width: 100px;
        }
        .day-col {
          width: 20px;
        }
        .total-col {
          width: 50px;
        }
        .activity-row {
          background-color: #fff9e6;
        }
        .footer {
          margin-top: 20px;
          font-size: 9px;
        }
        .legend {
          margin-bottom: 10px;
        }
      </style>
    </head>
    <body>
      <h1>ग्रामीनो हजेरी - ${formatMonthYear(monthStr)}</h1>
      <div class="legend">
        <strong>Legend:</strong> P = Present (हजर), A = Absent (गैरहजर), H = Half Day (अर्धा दिवस)
      </div>
      <table>
        <thead>
          <tr>
            <th>क्र.</th>
            <th class="name-col">कामगार नाव</th>
            <th>दर</th>
            ${days.map(d => `<th class="day-col">${d}</th>`).join('')}
            <th>दिवस</th>
            <th class="total-col">एकूण</th>
            <th>सही</th>
          </tr>
          <tr class="activity-row">
            <td></td>
            <td class="name-col">काम/क्षेत्र</td>
            <td></td>
            ${days.map(() => `<td class="day-col"></td>`).join('')}
            <td></td>
            <td></td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          ${activeWorkers.map((worker, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td class="name-col">${worker.name}</td>
              <td>${worker.dailyRate}</td>
              ${days.map(() => `<td class="day-col"></td>`).join('')}
              <td></td>
              <td></td>
              <td></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        <p><strong>Activities / कामे:</strong> ${activities.map(a => `${a.code} = ${a.name} (${a.marathiName || ''})`).join(', ')}</p>
        <p><strong>Areas / क्षेत्रे:</strong> ${areas.map(a => `${a.code} = ${a.name}`).join(', ')}</p>
      </div>
    </body>
    </html>
  `;

  return html;
};

export const printSheet = (html: string): void => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};
