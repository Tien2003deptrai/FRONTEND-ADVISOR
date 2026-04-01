import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import InputField from '@/components/form/input/InputField'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { dashboardService } from '@/services/DashboardService'
import { studentService } from '@/services/StudentService'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type StudentRow = {
  student_user_id: string
  student_code?: string | null
  full_name?: string | null
  email?: string
  risk_score?: number | null
  risk_label?: string | null
  alert_count?: number
  alerts?: { negative_sentiment_30d?: number; high_risk?: number }
}

type AlertItem = {
  _id: string
  type?: string
  title?: string
  content?: string
  sent_at?: string
  is_read?: boolean
}

function formatDt(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN')
  } catch {
    return iso
  }
}

export default function AdvisorDashboardPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const [riskThreshold, setRiskThreshold] = useState('0.7')
  const [appliedThreshold, setAppliedThreshold] = useState(0.7)
  const [reloadKey, setReloadKey] = useState(0)

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<StudentRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([])

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null)
  const [detailPayload, setDetailPayload] = useState<unknown>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const thr = Number.parseFloat(riskThreshold)
      const t = Number.isFinite(thr) ? Math.min(1, Math.max(0, thr)) : 0.7
      const res = await dashboardService.getAdvisorDashboard({
        page,
        limit,
        risk_threshold: t,
      })
      const data = res.data as {
        student_table?: StudentRow[]
        recent_alerts?: AlertItem[]
        pagination?: Pagination
      }
      setRows(data.student_table ?? [])
      setRecentAlerts(data.recent_alerts ?? [])
      setPagination(data.pagination ?? null)
      setAppliedThreshold(t)
    } catch {
      toast.error('Không tải được dashboard cố vấn')
      setRows([])
      setRecentAlerts([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [page, limit, riskThreshold, reloadKey])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const applyThreshold = () => {
    setPage(1)
    setReloadKey(k => k + 1)
  }

  const openStudentDetail = async (studentId: string) => {
    setDetailStudentId(studentId)
    setDetailOpen(true)
    setDetailPayload(null)
    setDetailLoading(true)
    try {
      const res = await studentService.getStudentById(studentId, {})
      setDetailPayload(res.data)
    } catch {
      toast.error('Không tải được chi tiết sinh viên')
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <>
      <PageMeta
        title="Tổng quan cố vấn | Advisor"
        description="POST /api/dashboard/advisor — rủi ro & ưu tiên can thiệp"
      />
      <PageBreadcrumb pageTitle="Tổng quan rủi ro (cố vấn)" />

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Ngưỡng rủi ro cao (0–1) dùng khi tính cảnh báo trên bảng. Mỗi lần tải dashboard backend có thể
          đồng bộ tạo cảnh báo theo ngưỡng này.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Label htmlFor="adv-risk-th">risk_threshold</Label>
            <InputField
              id="adv-risk-th"
              step={0.05}
              min="0"
              max="1"
              type="number"
              value={riskThreshold}
              onChange={e => setRiskThreshold(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={applyThreshold}>
            Áp dụng & tải lại
          </Button>
          <span className="text-xs text-gray-500">Đang áp dụng: {appliedThreshold}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
            <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              Danh sách sinh viên (lớp cố vấn)
            </h2>
            {loading ? (
              <p className="py-8 text-gray-500">Đang tải...</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table className="text-left text-sm">
                    <TableHeader>
                      <TableRow className="border-b border-gray-200 dark:border-gray-700">
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Sinh viên
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Mã SV
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Rủi ro
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Nhãn
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Cảnh báo
                        </TableCell>
                        <TableCell isHeader className="px-3 py-2 font-semibold">
                          Thao tác
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <td className="px-3 py-8 text-gray-500" colSpan={6}>
                            Không có sinh viên hoặc chưa được gán lớp cố vấn.
                          </td>
                        </TableRow>
                      ) : (
                        rows.map(row => (
                          <TableRow
                            key={row.student_user_id}
                            className="border-b border-gray-100 dark:border-gray-800"
                          >
                            <TableCell className="px-3 py-2">
                              <div className="font-medium text-gray-800 dark:text-white/90">
                                {row.full_name ?? '—'}
                              </div>
                              <div className="text-xs text-gray-500">{row.email ?? ''}</div>
                            </TableCell>
                            <TableCell className="px-3 py-2">{row.student_code ?? '—'}</TableCell>
                            <TableCell className="px-3 py-2">
                              {row.risk_score != null ? row.risk_score.toFixed(3) : '—'}
                            </TableCell>
                            <TableCell className="px-3 py-2">{row.risk_label ?? '—'}</TableCell>
                            <TableCell className="px-3 py-2">
                              <span className="font-medium">{row.alert_count ?? 0}</span>
                              {row.alerts ? (
                                <span className="ml-1 text-xs text-gray-500">
                                  (âm: {row.alerts.negative_sentiment_30d ?? 0}, HR:{' '}
                                  {row.alerts.high_risk ?? 0})
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void openStudentDetail(row.student_user_id)}
                              >
                                Chi tiết
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {pagination && pagination.total_pages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      Trang {pagination.page}/{pagination.total_pages} — {pagination.total} sinh viên
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        Trước
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={page >= pagination.total_pages}
                        onClick={() => setPage(p => p + 1)}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="xl:col-span-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
            <h2 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white/90">
              Cảnh báo gần đây
            </h2>
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có bản ghi.</p>
            ) : (
              <ul className="max-h-[480px] space-y-3 overflow-y-auto text-sm">
                {recentAlerts.map(a => (
                  <li
                    key={a._id}
                    className="rounded-lg border border-gray-100 p-3 dark:border-gray-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-gray-800 dark:text-white/90">
                        {a.title ?? a.type ?? 'Thông báo'}
                      </span>
                      {!a.is_read ? (
                        <span className="shrink-0 rounded bg-brand-500/15 px-1.5 py-0.5 text-xs text-brand-600">
                          Mới
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">{formatDt(a.sent_at)}</p>
                    {a.content ? (
                      <p className="mt-2 line-clamp-3 text-gray-600 dark:text-gray-300">
                        {a.content}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={detailOpen}
        onClose={() => !detailLoading && setDetailOpen(false)}
        className="max-w-2xl p-6"
      >
        <h3 className="mb-4 text-lg font-semibold">
          Chi tiết sinh viên
          {detailStudentId ? (
            <span className="block break-all text-sm font-normal text-gray-500">{detailStudentId}</span>
          ) : null}
        </h3>
        {detailLoading ? (
          <p className="text-sm text-gray-500">Đang tải...</p>
        ) : detailPayload && typeof detailPayload === 'object' ? (
          <pre className="max-h-[60vh] overflow-auto rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-800/80">
            {JSON.stringify(detailPayload, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-gray-500">Không có dữ liệu.</p>
        )}
        <div className="mt-6 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setDetailOpen(false)}>
            Đóng
          </Button>
        </div>
      </Modal>
    </>
  )
}
