import { Routes, Route } from 'react-router-dom'
import Home from './Pages/Home/Home'
import Profile from './Pages/Profile/Profile'
import ProtectedRoute from './Components/ProtectedRoute/ProtectedRoute'
import Login from './Pages/Login/Login'
import Register from "./Pages/Register/Register"
import NotFound from './Pages/NotFound/NotFound'
import VerifyEmail from './Pages/VerifyEmail/VerifyEmail'
import NeonToast from './Components/NeonToast/NeonToast'
import Security from './Pages/Security/Security'
import ProfileEdit from './Pages/EditProfile/EditProfile'
import Notification from './Components/Notification/Notification'
import Settings from './Pages/Settings/Settings'
import Students from './Pages/Admin/Students/Students'
import StudentAdd from './Pages/Admin/StudentAdd/StudentAdd'
import StudentsBulk from './Pages/Admin/StudentsBulk/StudentsBulk'
import StudentDetail from './Pages/Admin/StudentDetail/StudentDetail'
import UserDashboard from './Pages/User/UserDashboard/UserDashboard'
import AdminDashboard from './Pages/Admin/Dashboard/AdminDashboard'
import MyLearningTask from './Pages/User/MyLearningTask/MyLearningTask'
import CreateLearningTask from "./Pages/User/CreateLearningTask/CreateLearningTask"
import EmailLogin from "./Pages/EmailLogin/EmailLogin"
import PublicRoute from './Components/PublicRoute/PublicRoute'
import LearningTaskDetail from './Pages/LearningTaskDetail/LearningTaskDetail'
import EditLearningTask from "./Pages/EditLearningTask/EditLearningTask"
import LanguagesAdd from './Pages/Admin/LanguagesAdd/LanguagesAdd'
import LanguagesList from './Pages/Admin/LanguagesList/LanguagesList'
import LanguagesEdit from './Pages/Admin/LanguagesEdit/LanguagesEdit'
import FrameworkAdd from './Pages/Admin/FrameworkAdd/FrameworkAdd'
import FrameworksList from './Pages/Admin/FrameworksList/FrameworksList'
import FrameworksEdit from './Pages/Admin/FrameworksEdit/FrameworksEdit'

function App() {
  return (
    <>
      <Notification />
      <NeonToast />
      <Routes>
        <Route element={<PublicRoute />}>

          <Route path="/" element={<Home />} />
          <Route path='/login' element={<Login />} />
          <Route path='/register' element={<Register />} />
          <Route path='/verify-email' element={<VerifyEmail />} />
          <Route path='/login/email' element={<EmailLogin />} />

        </Route>
        <Route element={<ProtectedRoute requiredRole={["admin", "staff", "user"]} />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/security" element={<Security />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/learning-task/:taskId" element={<LearningTaskDetail />} />
        </Route>
        <Route element={<ProtectedRoute requiredRole={["admin", "staff"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<Students />} />
          <Route path="/admin/student/add" element={<StudentAdd />} />
          <Route path="/admin/students/bulk" element={<StudentsBulk />} />
          <Route path="/admin/student/:id" element={<StudentDetail />} />
          <Route path="/admin/languages/add" element={<LanguagesAdd />} />
          <Route path="/admin/languages/edit/:id" element={<LanguagesEdit />} />
          <Route path="/admin/languages" element={<LanguagesList />} />
          <Route path="/admin/frameworks" element={<FrameworksList />} />
          <Route path="/admin/frameworks/add" element={<FrameworkAdd />} />
          <Route path="/admin/frameworks/edit/:id" element={<FrameworksEdit />} />
        </Route>
        <Route element={<ProtectedRoute requiredRole={["user"]} />}>
          <Route path="/learning-task/edit/:taskId" element={<EditLearningTask />} />
          <Route path='/user' element={<UserDashboard />} />
          <Route path='/user/my-learning-task' element={<MyLearningTask />} />
          <Route path='/user/learning-task/create' element={<CreateLearningTask />} />
        </Route>
        <Route path='*' element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
