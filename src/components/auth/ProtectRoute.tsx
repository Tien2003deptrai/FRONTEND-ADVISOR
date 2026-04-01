import useAuthStore from '@/stores/authStore'
import { Navigate, Outlet } from 'react-router'

const ProtectRoute = ({ allowedRoles = [] }: { allowedRoles: string[] }) => {
    const { isAuthenticated, user } = useAuthStore()

    if (!isAuthenticated) {
        return <Navigate to="/signin" replace />
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role || '')) {
        return <Navigate to="/" replace />
    }

    return <Outlet />
}

export default ProtectRoute
