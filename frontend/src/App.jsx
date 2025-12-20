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
import AdminDashboard from './Pages/AdminDashboard/AdminDashboard'
import Settings from './Pages/Settings/Settings'

function App() {
  return (
    <>
      <Notification />
      <NeonToast />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path='/verify-email' element={<VerifyEmail />} />
        <Route element={<ProtectedRoute requiredRole={["admin", "staff", "user"]} />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<ProfileEdit />} />
          <Route path="/security" element={<Security />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route element={<ProtectedRoute requiredRole={["admin", "staff"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />

        </Route>
        <Route path='*' element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
