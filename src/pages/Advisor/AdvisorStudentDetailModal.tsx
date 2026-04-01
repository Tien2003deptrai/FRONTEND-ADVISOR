import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import { userService } from '@/services/UserService'
import moment from 'moment'

export type InfoUserRecord = {
  _id: string
  username?: string
  email?: string
  role?: string
  status?: string
  last_login_at?: string
  createdAt?: string
  updatedAt?: string
  profile?: {
    full_name?: string
    phone?: string
    gender?: string
    date_of_birth?: string
    address?: string
    avatar_url?: string
  }
  student_info?: {
    student_code?: string
    cohort_year?: number
    enrollment_status?: string
  }
  advisor_info?: {
    staff_code?: string
    title?: string
  }
}

type Props = {
  isOpen: boolean
  studentUserId: string | null
  onClose: () => void
}


export default function AdvisorStudentDetailModal({ isOpen, studentUserId, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<InfoUserRecord | null>(null)

  useEffect(() => {
    if (!isOpen || !studentUserId) {
      setUser(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setUser(null)
    void userService
      .getInfoUser({ user_id: studentUserId })
      .then(res => {
        if (!cancelled) setUser((res.data as InfoUserRecord) ?? null)
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Không tải được thông tin người dùng')
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, studentUserId])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const p = user?.profile
  const si = user?.student_info
  const ai = user?.advisor_info

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl p-6">
      <h3 className="mb-1  text-center text-lg font-semibold text-gray-800 dark:text-white/90">
        Chi tiết người dùng
      </h3>
      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Đang tải...</p>
      ) : user ? (
        <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1 text-sm">
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tài khoản
            </h4>
            <dl className="grid gap-2 sm:grid-cols-2">
              <Row label="Username" value={user.username} />
              <Row label="Email" value={user.email} />
              <Row label="Vai trò" value={user.role} />
              <Row label="Trạng thái" value={user.status} />
            </dl>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Hồ sơ
            </h4>
            <dl className="grid gap-2 sm:grid-cols-2">
              <Row label="Họ tên" value={p?.full_name} />
              <Row label="Điện thoại" value={p?.phone} />
              <Row label="Giới tính" value={p?.gender} />
              <Row label="Ngày sinh" value={p?.date_of_birth ? moment(p.date_of_birth).format('DD/MM/YYYY') : '—'} />
              <Row label="Địa chỉ" value={p?.address} className="sm:col-span-2" />
            </dl>
          </section>
          {user.role === 'STUDENT' && si ? (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Sinh viên
              </h4>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Row label="Mã SV" value={si.student_code} />
                <Row label="Khóa / cohort" value={si.cohort_year} />
                <Row label="Trạng thái học" value={si.enrollment_status} />
              </dl>
            </section>
          ) : null}

          {user.role === 'ADVISOR' && ai ? (
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Cố vấn
              </h4>
              <dl className="grid gap-2 sm:grid-cols-2">
                <Row label="Mã cán bộ" value={ai.staff_code} />
                <Row label="Chức danh" value={ai.title} />
              </dl>
            </section>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">Không có dữ liệu.</p>
      )}

      <div className="mt-6 flex justify-end">
        <Button size="sm" variant="outline" onClick={handleClose} disabled={loading}>
          Đóng
        </Button>
      </div>
    </Modal>
  )
}

function Row({
  label,
  value,
  className = '',
}: {
  label: string
  value?: string | number | null
  className?: string
}) {
  const text =
    value == null || value === ''
      ? '—'
      : typeof value === 'string'
        ? value.trim() || '—'
        : String(value)
  return (
    <div className={`flex flex-col gap-0.5 border-b border-gray-100 pb-2 dark:border-gray-800 ${className}`}>
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="break-words font-medium text-gray-800 dark:text-white/90">{text}</dd>
    </div>
  )
}
