import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AttendanceLayout from './components/layout/AttendanceLayout';
import AdminLayout from './components/layout/AdminLayout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Workers from './pages/Workers';
import Groups from './pages/Groups';
import Areas from './pages/Areas';
import Activities from './pages/Activities';
import GroupAttendance from './pages/GroupAttendance';
import Print from './pages/Print';
import Reports from './pages/Reports';
import LabourCost from './pages/LabourCost';
import Settings from './pages/Settings';
import ExpenseCategories from './pages/ExpenseCategories';
import Expenses from './pages/Expenses';
import Payments from './pages/Payments';
import FarmExpenses from './pages/FarmExpenses';

function App() {
  return (
    <AppProvider>
      <BrowserRouter basename="/farm-attendance">
        <Routes>
          {/* Home/Landing page */}
          <Route path="/" element={<Home />} />

          {/* Public attendance interface */}
          <Route element={<AttendanceLayout />}>
            <Route path="attendance" element={<Navigate to="/" replace />} />
            <Route path="attendance/:groupId" element={<GroupAttendance />} />
            <Route path="print" element={<Print />} />
            <Route path="labour-cost" element={<LabourCost />} />
            <Route path="expenses" element={<FarmExpenses />} />
          </Route>

          {/* Admin interface (hidden URL) */}
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="workers" element={<Workers />} />
            <Route path="groups" element={<Groups />} />
            <Route path="areas" element={<Areas />} />
            <Route path="activities" element={<Activities />} />
            <Route path="expense-categories" element={<ExpenseCategories />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="payments" element={<Payments />} />
            <Route path="reports" element={<Reports />} />
            <Route path="labour-cost" element={<LabourCost />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
