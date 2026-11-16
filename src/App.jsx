import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useStore } from './lib/store.jsx'
import { ToastHost } from './components/ui.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/student/Dashboard.jsx'
import Courses from './pages/student/Courses.jsx'
import CourseDetail from './pages/student/CourseDetail.jsx'
import Resources from './pages/student/Resources.jsx'
import Quiz from './pages/student/Quiz.jsx'
import QuizResult from './pages/student/QuizResult.jsx'
import Recommendations from './pages/student/Recommendations.jsx'
import LearningPath from './pages/student/LearningPath.jsx'
import Performance from './pages/student/Performance.jsx'
import Profile from './pages/Profile.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import Students from './pages/admin/Students.jsx'
import Analytics from './pages/admin/Analytics.jsx'
import ContentManager from './pages/admin/ContentManager.jsx'
import Records from './pages/admin/Records.jsx'
import NotFound from './pages/NotFound.jsx'

function ScrollTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' }) }, [pathname])
  return null
}

function RequireAuth({ children, role }) {
  const { user } = useStore()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />
  return children
}

export default function App() {
  const { user } = useStore()
  return (
    <>
      <ScrollTop />
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace /> : <Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />

        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={user?.role === 'admin' ? <Navigate to="/admin" replace /> : <Dashboard />} />
          <Route path="courses" element={<RequireAuth role="student"><Courses /></RequireAuth>} />
          <Route path="courses/:courseId" element={<RequireAuth role="student"><CourseDetail /></RequireAuth>} />
          <Route path="resources" element={<RequireAuth role="student"><Resources /></RequireAuth>} />
          <Route path="quiz/:topicId" element={<RequireAuth role="student"><Quiz /></RequireAuth>} />
          <Route path="result/:attemptId" element={<RequireAuth role="student"><QuizResult /></RequireAuth>} />
          <Route path="recommendations" element={<RequireAuth role="student"><Recommendations /></RequireAuth>} />
          <Route path="learning-path" element={<RequireAuth role="student"><LearningPath /></RequireAuth>} />
          <Route path="performance" element={<RequireAuth role="student"><Performance /></RequireAuth>} />

          <Route path="admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
          <Route path="admin/students" element={<RequireAuth role="admin"><Students /></RequireAuth>} />
          <Route path="admin/analytics" element={<RequireAuth role="admin"><Analytics /></RequireAuth>} />
          <Route path="admin/content" element={<RequireAuth role="admin"><ContentManager /></RequireAuth>} />
          <Route path="admin/records" element={<RequireAuth role="admin"><Records /></RequireAuth>} />

          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <ToastHost />
    </>
  )
}