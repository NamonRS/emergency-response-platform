import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import PatientsPage from './pages/PatientsPage.jsx';
import PatientDetailPage from './pages/PatientDetailPage.jsx';
import PatientFormPage from './pages/PatientFormPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
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

          <Route
            path="incidents"
            element={
              <PlaceholderPage
                title="Incidents"
                stage="Stage 5"
                description="Incident registration, search, filters, status updates, and notes."
              />
            }
          />
          <Route
            path="incidents/:id"
            element={
              <PlaceholderPage
                title="Incident details"
                stage="Stage 5"
                description="Incident details, history, and notes."
              />
            }
          />
          <Route
            path="ai-assistant"
            element={
              <PlaceholderPage
                title="AI Assistant"
                stage="Stages 7 to 9 (local AI) and Stage 12 (optional protocol assistant)"
                description="Local AI summaries run through Ollama."
              />
            }
          />
          <Route
            path="settings"
            element={
              <PlaceholderPage
                title="Settings"
                stage="a later stage"
                description="Account and application settings."
              />
            }
          />

          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route
              path="activity-log"
              element={
                <PlaceholderPage
                  title="Activity Log"
                  stage="Stage 10"
                  description="Searchable audit log (administrators only). Events are already being recorded in the database."
                />
              }
            />
            <Route path="admin/users" element={<UsersPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}