import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/layout/PageHeader';
import AccountStatement from '../components/AccountStatement';
import Select from '../components/ui/Select';
import { format, parseISO } from 'date-fns';
import {
  calculateGroupMonthBalance,
  calculateLabourCostByGroup,
  calculateExpensesByGroup,
  calculatePaymentsByGroup,
} from '../utils/calculations';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../components/ui/Button';

const Accounts: React.FC = () => {
  const { data, settings } = useApp();
  const isMarathi = settings.language === 'mr';

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const monthOptions = useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = -12; i <= 0; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const value = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy');
      options.push({ value, label });
    }
    return options;
  }, []);

  const prevMonth = () => {
    const date = parseISO(`${selectedMonth}-01`);
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(format(date, 'yyyy-MM'));
  };

  const nextMonth = () => {
    const date = parseISO(`${selectedMonth}-01`);
    date.setMonth(date.getMonth() + 1);
    setSelectedMonth(format(date, 'yyyy-MM'));
  };

  const balanceReport = useMemo(() =>
    calculateGroupMonthBalance(data, selectedMonth),
    [data, selectedMonth]
  );

  const labourCostData = useMemo(() =>
    calculateLabourCostByGroup(data, selectedMonth),
    [data, selectedMonth]
  );

  const expenseData = useMemo(() =>
    calculateExpensesByGroup(data, selectedMonth),
    [data, selectedMonth]
  );

  const paymentData = useMemo(() =>
    calculatePaymentsByGroup(data, selectedMonth),
    [data, selectedMonth]
  );

  return (
    <div className="pb-20 lg:pb-0">
      <div className="no-print">
        <PageHeader
          title={isMarathi ? 'खाते' : 'Accounts'}
          subtitle={isMarathi ? 'मासिक खर्च, पेमेंट आणि बाकी' : 'Monthly costs, payments, and balance'}
        />
      </div>

      {/* Month selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 mb-6 no-print">
        <div className="flex items-center justify-between gap-4">
          <Button variant="ghost" onClick={prevMonth}>
            <ChevronLeft size={20} />
          </Button>
          <Select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            options={monthOptions}
            className="flex-1 max-w-xs"
          />
          <Button variant="ghost" onClick={nextMonth}>
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>

      <AccountStatement
        balanceReport={balanceReport}
        labourCostData={labourCostData}
        expenseData={expenseData}
        paymentData={paymentData}
        printTitle={isMarathi ? 'खाते विवरण' : 'Account Statement'}
        printSubtitle={format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}
        noDataMessage={isMarathi ? 'या महिन्यासाठी कोणताही डेटा नाही' : 'No data for this month'}
        isMarathi={isMarathi}
      />
    </div>
  );
};

export default Accounts;
