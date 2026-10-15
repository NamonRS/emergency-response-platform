import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import PatientsPage from './pages/PatientsPage.jsx';
import PatientDetailPage from './pages/PatientDetailPage.jsx';
import PatientFormPage from './pages/PatientFormPage.jsx';
import IncidentsPage from './pages/IncidentsPage.jsx';
import IncidentFormPage from './pages/IncidentFormPage.jsx';
import IncidentDetailPage from './pages/IncidentDetailPage.jsx';
import ActivityLogPage from './pages/ActivityLogPage.jsx';
import AiAssistantPage from './pages/AiAssistantPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/new" element={<PatientFormPage />} />
          <Route path="patients/:id" element={<PatientDetailPage />} />
          <Route path="patients/:id/edit" element={<PatientFormPage />} />

          <Route path="incidents" element={<IncidentsPage />} />
          <Route path="incidents/new" element={<IncidentFormPage />} />
          <Route path="incidents/:id" element={<IncidentDetailPage />} />

          <Route path="ai-assistant" element={<AiAssistantPage />} />
          <Route path="settings" element={<SettingsPage />} />

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="activity-log" element={<ActivityLogPage />} />
            <Route path="admin/users" element={<UsersPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}