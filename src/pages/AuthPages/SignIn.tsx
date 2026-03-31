import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import axios from 'axios'
import { toast } from 'sonner'
import PageMeta from '../../components/common/PageMeta'
import AuthLayout from './AuthPageLayout'
import SignInForm from '../../components/auth/SignInFormAuth'
import { authService } from '../../services/AuthService'
import useAuthStore from '../../stores/authStore'

export default function SignIn() {
    const navigate = useNavigate()
    const location = useLocation()
    const from =
        typeof (location.state as { from?: string } | null)?.from === 'string'
            ? (location.state as { from: string }).from
            : '/'

    const login = useAuthStore((s) => s.login)
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (isAuthenticated) {
            navigate(from === '/signin' ? '/' : from, { replace: true })
        }
    }, [isAuthenticated, navigate, from])

    const handleSignIn = async (email: string, password: string) => {
        setIsSubmitting(true)
        try {
            const res = await authService.login({ email, password })
            const payload = res.data as AuthLoginPayload
            login(payload.user, payload.access_token, payload.refresh_token)
            toast.success(res.message || 'Đăng nhập thành công')
            navigate(from === '/signin' ? '/' : from, { replace: true })
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const msg = (err.response?.data as { message?: string })?.message
                toast.error(msg ?? 'Đăng nhập thất bại')
            } else {
                toast.error('Đăng nhập thất bại')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <PageMeta
                title="Đăng nhập | Advisor"
                description="Đăng nhập để vào bảng điều khiển"
            />
            <AuthLayout>
                <SignInForm onSignIn={handleSignIn} isSubmitting={isSubmitting} />
            </AuthLayout>
        </>
    )
}
