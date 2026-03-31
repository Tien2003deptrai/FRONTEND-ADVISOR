import { BrowserRouter as Router, Routes, Route } from 'react-router'
import RequireAuth from './components/auth/RequireAuth'
import RequireStaff from './components/auth/RequireStaff'
import RequireStudent from './components/auth/RequireStudent'
import SignIn from './pages/AuthPages/SignIn'
import SignUp from './pages/AuthPages/SignUp'
import NotFound from './pages/OtherPage/NotFound'
import UserProfiles from './pages/UserProfiles'
// Admin Pages
import {
    MasterDataPage,
    AdvisorClassPage,
    AdminUsersPage,
    FacultyDashboardPage,
    FeedbackListPage,
    Home
} from './pages/Admin'
import {
    DashboardPage,
    AcademicPage,
    FeedbackPage,
    NotificationsPage
} from './pages/Student'
import FormElements from './pages/Forms/FormElements'
import AppLayout from './layout/AppLayout'
import ProtectLayout from './layout/ProtectLayout'
import { ScrollToTop } from './components/common/ScrollToTop'

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route element={<RequireAuth />}>
            {/* Sinh viên: layout riêng */}
            <Route path="student" element={<RequireStudent />}>
              <Route element={<ProtectLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="academic" element={<AcademicPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<UserProfiles />} />
              </Route>
            </Route>

            {/* ADVISOR / FACULTY / ADMIN */}
            <Route element={<RequireStaff />}>
              <Route element={<AppLayout />}>
                <Route index element={<Home />} />
                <Route path="faculty-dashboard" element={<FacultyDashboardPage />} />
                <Route path="feedback-list" element={<FeedbackListPage />} />

                <Route path="profile" element={<UserProfiles />} />
                <Route path="master-data" element={<MasterDataPage />} />
                <Route path="advisor-classes" element={<AdvisorClassPage />} />

                <Route path="form-elements" element={<FormElements />} />

                <Route path="admin-users" element={<AdminUsersPage />} />
              </Route>
            </Route>
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  )
}
