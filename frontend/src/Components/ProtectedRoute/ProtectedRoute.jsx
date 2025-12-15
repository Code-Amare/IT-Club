import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useUser } from '../../Context/UserContext'
import GetSpinner from "../../Components/GetSpinner/GetSpinner"


function ProtectedRoute({ requiredRole }) {
    const { user } = useUser()
    const location = useLocation()

    if (user.isAuthenticated === null) return <div><GetSpinner /></div>

    if (!user.isAuthenticated || !requiredRole.includes(user.role)) {
        console.log("redirecting")
        return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
    }

    return <Outlet /> // this renders the nested route
}

export default ProtectedRoute
