import { BrowserRouter as Router, Routes, Route } from 'react-router'
import RequireAuth from './components/auth/RequireAuth'
import SignIn from './pages/AuthPages/SignIn'
import SignUp from './pages/AuthPages/SignUp'
import NotFound from './pages/OtherPage/NotFound'
import UserProfiles from './pages/UserProfiles'
import LineChart from './pages/Charts/LineChart'
import BarChart from './pages/Charts/BarChart'
import MasterDataPage from './pages/MasterData/MasterDataPage'
import AdvisorClassMembersPage from './pages/AdvisorClass/AdvisorClassMembersPage'
import AdminUsersPage from './pages/Users/AdminUsersPage'
import FacultyDashboardPage from './pages/Faculty/FacultyDashboardPage'
import FeedbackListPage from './pages/Feedback/FeedbackListPage'
import FormElements from './pages/Forms/FormElements'
import AppLayout from './layout/AppLayout'
import { ScrollToTop } from './components/common/ScrollToTop'
import Home from './pages/Dashboard/Home'

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
              <Route path="/advisor-classes" element={<AdvisorClassMembersPage />} />

              {/* Forms */}
              <Route path="/form-elements" element={<FormElements />} />

              {/* Cố vấn & sinh viên (ADMIN) — thay Basic Tables */}
              <Route path="/admin-users" element={<AdminUsersPage />} />

              {/* Charts */}
              <Route path="/line-chart" element={<LineChart />} />
              <Route path="/bar-chart" element={<BarChart />} />
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
