import { createBrowserRouter, Navigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import RequireAuth from './RequireAuth'
import LoginPage from '../pages/login/LoginPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import CompanyPage from '../pages/company/CompanyPage'
import ProfilePage from '../pages/profile/ProfilePage'
import DepartmentsPage from '../pages/departments/DepartmentsPage'
import LeavesPage from '../pages/leaves/LeavesPage'
import AttendancePage from '../pages/attendance/AttendancePage'
import ProjectsPage from '../pages/projects/ProjectsPage'
import WikiPage from '../pages/wiki/WikiPage'
import MailsPage from '../pages/mails/MailsPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'company', element: <CompanyPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'departments', element: <DepartmentsPage /> },
      { path: 'leaves', element: <LeavesPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'wiki', element: <WikiPage /> },
      { path: 'mails', element: <MailsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
