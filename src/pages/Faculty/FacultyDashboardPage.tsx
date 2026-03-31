import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import PageMeta from '../../components/common/PageMeta'
import PageBreadcrumb from '../../components/common/PageBreadCrumb'
import Button from '../../components/ui/button/Button'
import Label from '../../components/form/Label'
import InputField from '../../components/form/input/InputField'
import Select from '../../components/form/Select'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { dashboardService } from '../../services/DashboardService'
import { masterDataService } from '../../services/MasterDataService'
import useAuthStore from '../../stores/authStore'

type DepartmentItem = {
  _id: string
  department_code: string
  department_name: string
}

type RiskDistRow = { _id: string | null; count: number }
type AnomalyRow = {
  _id: { status?: string; severity?: string }
  count: number
}

type FacultyDashboardData = {
  department_id: string | null
  kpi: {
    total_students: number
    avg_risk_score: number
    high_risk_students: number
    total_predictions: number
  }
  risk_distribution: RiskDistRow[]
  anomaly_summary: AnomalyRow[]
}

function formatAxiosMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message ?? err.message
  }
  return 'Đã có lỗi xảy ra'
}

export default function FacultyDashboardPage() {
  const user = useAuthStore(s => s.user)
  const canAccess = user?.role === 'ADMIN' || user?.role === 'FACULTY'

  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<FacultyDashboardData | null>(null)
  const [deptPicklist, setDeptPicklist] = useState<DepartmentItem[]>([])
  /** __all__ = không lọc theo khoa */
  const [deptChoice, setDeptChoice] = useState('__all__')
  const [riskThreshold, setRiskThreshold] = useState('0.7')
  const riskThresholdRef = useRef(riskThreshold)
  riskThresholdRef.current = riskThreshold

  const loadDepartments = useCallback(async () => {
    try {
      const res = await masterDataService.getDepartmentsList({ page: 1, limit: 200 })
      const d = res.data as { items: DepartmentItem[] }
      setDeptPicklist(d.items ?? [])
    } catch (e) {
      toast.error(formatAxiosMessage(e))
    }
  }, [])

  const fetchDashboard = useCallback(async () => {
    if (!canAccess) return
    const thr = Number(riskThresholdRef.current)
    if (Number.isNaN(thr) || thr < 0 || thr > 1) {
      toast.error('Ngưỡng rủi ro phải từ 0 đến 1')
      return
    }
    setLoading(true)
    try {
      const body: Record<string, unknown> = { risk_threshold: thr }
      if (deptChoice && deptChoice !== '__all__') body.department_id = deptChoice
      const res = await dashboardService.getFacultyDashboard(body)
      setData(res.data as FacultyDashboardData)
    } catch (e) {
      toast.error(formatAxiosMessage(e))
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [canAccess, deptChoice])

  useEffect(() => {
    if (canAccess) void loadDepartments()
  }, [canAccess, loadDepartments])

  useEffect(() => {
    if (canAccess) void fetchDashboard()
  }, [canAccess, fetchDashboard])

  const deptOptions = [
    { value: '__all__', label: 'Toàn bộ (không lọc khoa)' },
    ...deptPicklist.map(d => ({
      value: d._id,
      label: `${d.department_code} — ${d.department_name}`,
    })),
  ]

  if (!canAccess) {
    return (
      <>
        <PageMeta title="Dashboard đơn vị | Advisor" description="FACULTY / ADMIN" />
        <PageBreadcrumb pageTitle="Dashboard đơn vị (Faculty)" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Chỉ vai trò <strong>FACULTY</strong> hoặc <strong>ADMIN</strong> mới xem được dashboard này (
          <code className="text-xs">POST /api/dashboard/faculty</code>).
        </p>
      </>
    )
  }

  const kpi = data?.kpi

  return (
    <>
      <PageMeta
        title="Dashboard đơn vị | Advisor"
        description="POST /api/dashboard/faculty — FACULTY, ADMIN"
      />
      <PageBreadcrumb pageTitle="Dashboard đơn vị (Faculty)" />

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Tổng hợp rủi ro theo sinh viên (dự báo mới nhất), có thể lọc theo khoa. API:{' '}
          <code className="text-xs">POST /dashboard/faculty</code>.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-[220px] flex-1">
            <Label>Khoa</Label>
            <Select
              key={`fd-dept-${deptPicklist.length}-${deptChoice}`}
              options={deptOptions}
              placeholder="Chọn phạm vi"
              onChange={setDeptChoice}
              defaultValue={deptChoice}
            />
          </div>
          <div className="w-full min-w-[140px] sm:w-40">
            <Label htmlFor="fd-risk">Ngưỡng rủi ro cao</Label>
            <InputField
              id="fd-risk"
              type="number"
              step="0.05"
              min={0}
              max={1}
              value={riskThreshold}
              onChange={e => setRiskThreshold(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">Sửa xong bấm Làm mới.</p>
          </div>
          <Button size="sm" onClick={() => void fetchDashboard()} disabled={loading}>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : kpi ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Tổng SV</p>
              <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
                {kpi.total_students}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Điểm rủi ro TB
              </p>
              <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
                {Number(kpi.avg_risk_score).toFixed(4)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">SV rủi ro cao</p>
              <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-400">
                {kpi.high_risk_students}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Dự báo (latest)</p>
              <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
                {kpi.total_predictions}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
            <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
              Phân bố nhãn rủi ro
            </h2>
            <div className="overflow-x-auto">
              <Table className="text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-gray-700">
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Nhãn rủi ro
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Số lượng
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.risk_distribution ?? []).length === 0 ? (
                    <TableRow>
                      <td className="px-3 py-4 text-gray-500" colSpan={2}>
                        Chưa có dữ liệu dự báo.
                      </td>
                    </TableRow>
                  ) : (
                    (data?.risk_distribution ?? []).map((row, i) => (
                      <TableRow
                        key={`${String(row._id)}-${i}`}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <TableCell className="px-3 py-2">{row._id ?? '—'}</TableCell>
                        <TableCell className="px-3 py-2">{row.count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
            <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
              Tóm tắt cảnh báo bất thường (anomaly)
            </h2>
            <div className="overflow-x-auto">
              <Table className="text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-gray-700">
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Trạng thái
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Mức độ
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Số lượng
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.anomaly_summary ?? []).length === 0 ? (
                    <TableRow>
                      <td className="px-3 py-4 text-gray-500" colSpan={3}>
                        Chưa có cảnh báo.
                      </td>
                    </TableRow>
                  ) : (
                    (data?.anomaly_summary ?? []).map((row, i) => (
                      <TableRow
                        key={`${row._id?.status}-${row._id?.severity}-${i}`}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <TableCell className="px-3 py-2">
                          {row._id?.status ?? '—'}
                        </TableCell>
                        <TableCell className="px-3 py-2">
                          {row._id?.severity ?? '—'}
                        </TableCell>
                        <TableCell className="px-3 py-2">{row.count}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500">Không có dữ liệu.</p>
      )}
    </>
  )
}
