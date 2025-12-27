import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Workers from './pages/Workers';
import Groups from './pages/Groups';
import Areas from './pages/Areas';
import Activities from './pages/Activities';
import Attendance from './pages/Attendance';
import Print from './pages/Print';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function App() {
  return (
    <AppProvider>
      <BrowserRouter basename="/farm-attendance">
        <Routes>
          {/* Home/Landing page */}
          <Route path="/" element={<Home />} />

          {/* Main app with layout */}
          <Route element={<Layout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="workers" element={<Workers />} />
            <Route path="groups" element={<Groups />} />
            <Route path="areas" element={<Areas />} />
            <Route path="activities" element={<Activities />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="print" element={<Print />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
