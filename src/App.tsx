import { BrowserRouter as Router, Routes, Route } from 'react-router'
import RequireAuth from './components/auth/RequireAuth'
import SignIn from './pages/AuthPages/SignIn'
import SignUp from './pages/AuthPages/SignUp'
import NotFound from './pages/OtherPage/NotFound'
import UserProfiles from './pages/UserProfiles'
// Admin Pages
import { MasterDataPage, AdvisorClassPage, AdminUsersPage, FacultyDashboardPage, FeedbackListPage, Home } from './pages/Admin'
import FormElements from './pages/Forms/FormElements'
import AppLayout from './layout/AppLayout'
import { ScrollToTop } from './components/common/ScrollToTop'

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />
              <Route path="/faculty-dashboard" element={<FacultyDashboardPage />} />
              <Route path="/feedback-list" element={<FeedbackListPage />} />

              {/* Others Page */}
              <Route path="/profile" element={<UserProfiles />} />
              <Route path="/master-data" element={<MasterDataPage />} />
              <Route path="/advisor-classes" element={<AdvisorClassPage />} />

              {/* Forms */}
              <Route path="/form-elements" element={<FormElements />} />

              {/* Cố vấn & sinh viên (ADMIN) — thay Basic Tables */}
              <Route path="/admin-users" element={<AdminUsersPage />} />
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
