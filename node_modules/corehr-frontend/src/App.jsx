import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'

import Layout    from './components/layout/Layout'
import Login          from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import Dashboard from './pages/Dashboard'

import EmployeeList    from './pages/employees/EmployeeList'
import AttendancePage  from './pages/attendance/AttendancePage'
import LeavePage       from './pages/leave/LeavePage'
import RecruitmentPage from './pages/recruitment/RecruitmentPage'
import PayrollPage     from './pages/payroll/PayrollPage'
import OnboardingPage  from './pages/onboarding/OnboardingPage'
import OffboardingPage from './pages/offboarding/OffboardingPage'
import PerformancePage from './pages/performance/PerformancePage'
import HelpdeskPage    from './pages/helpdesk/HelpdeskPage'
import AssetsPage      from './pages/assets/AssetsPage'
import ProjectsPage    from './pages/projects/ProjectsPage'
import ReportsPage     from './pages/reports/ReportsPage'
import SettingsPage    from './pages/settings/SettingsPage'
import PermissionsPage from './pages/settings/PermissionsPage'
import ProfilePage     from './pages/profile/ProfilePage'

// Route guard that checks user permissions
function ProtectedRoute({ permKey, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  // Super admin always has access
  if (user.is_superuser) return children
  // Check permission
  const perms = user.permissions || {}
  if (permKey && !perms[permKey]) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"   element={<Dashboard />} />
            <Route path="employees"   element={<ProtectedRoute permKey="employees.view"><EmployeeList /></ProtectedRoute>} />
            <Route path="attendance"  element={<ProtectedRoute permKey="attendance.view"><AttendancePage /></ProtectedRoute>} />
            <Route path="leave"       element={<ProtectedRoute permKey="leave.view"><LeavePage /></ProtectedRoute>} />
            <Route path="recruitment" element={<ProtectedRoute permKey="recruitment.view"><RecruitmentPage /></ProtectedRoute>} />
            <Route path="payroll"     element={<ProtectedRoute permKey="payroll.view"><PayrollPage /></ProtectedRoute>} />
            <Route path="onboarding"  element={<ProtectedRoute permKey="onboarding.view"><OnboardingPage /></ProtectedRoute>} />
            <Route path="offboarding" element={<ProtectedRoute permKey="offboarding.view"><OffboardingPage /></ProtectedRoute>} />
            <Route path="performance" element={<ProtectedRoute permKey="performance.view"><PerformancePage /></ProtectedRoute>} />
            <Route path="helpdesk"    element={<ProtectedRoute permKey="helpdesk.view"><HelpdeskPage /></ProtectedRoute>} />
            <Route path="assets"      element={<ProtectedRoute permKey="assets.view"><AssetsPage /></ProtectedRoute>} />
            <Route path="projects"    element={<ProtectedRoute permKey="projects.view"><ProjectsPage /></ProtectedRoute>} />
            <Route path="reports"     element={<ProtectedRoute permKey="reports.view"><ReportsPage /></ProtectedRoute>} />
            <Route path="settings"    element={<ProtectedRoute permKey="settings.view"><SettingsPage /></ProtectedRoute>} />
            <Route path="settings/permissions" element={<ProtectedRoute permKey="settings.manage"><PermissionsPage /></ProtectedRoute>} />
            <Route path="profile"     element={<ProfilePage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </LanguageProvider>
  )
}
