import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { dashboardService } from '@/services/DashboardService'
import AdvisorDashboardCharts, {
  type AlertCards,
  type AlertOpenRow,
} from './AdvisorDashboardCharts'
import AdvisorStudentDetailModal from './AdvisorStudentDetailModal'

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
  risk_label?: number | string | null
  alert_count?: number
  alerts?: { negative_sentiment_30d?: number; high_risk?: number }
}

type AlertItem = {
  _id: string
  title?: string
  content?: string
  sent_at?: string
  is_read?: boolean
  alert_id?: {
    _id?: string
    alert_type?: string
    severity?: string
    status?: string
    detected_at?: string
    student_user_id?: string
  } | null
}

function formatRiskLabel(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return '—'
  // Convert numeric values to text labels
  if (v === -1 || v === '-1') return 'High'
  if (v === 0 || v === '0') return 'Medium'
  if (v === 1 || v === '1') return 'Low'
  return String(v)
}

function riskLabelBadgeClass(label: number | string | null | undefined): string {
  const normalized = formatRiskLabel(label)
  if (normalized === 'High') return 'bg-red-500/15 text-red-700 dark:text-red-400'
  if (normalized === 'Medium') return 'bg-amber-500/15 text-amber-800 dark:text-amber-400'
  if (normalized === 'Low') return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400'
  return 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
}

function severityBadgeClass(sev?: string): string {
  const s = (sev ?? '').toUpperCase()
  if (s === 'HIGH' || s === 'CRITICAL')
    return 'bg-red-500/15 text-red-700 dark:text-red-400'
  if (s === 'MEDIUM') return 'bg-amber-500/15 text-amber-800 dark:text-amber-400'
  if (s === 'LOW') return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400'
  return 'bg-gray-500/15 text-gray-600 dark:text-gray-400'
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
  const riskThreshold = '0.7'

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<StudentRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [recentAlerts, setRecentAlerts] = useState<AlertItem[]>([])
  const [alertCards, setAlertCards] = useState<AlertCards | null>(null)
  const [riskAlerts, setRiskAlerts] = useState<AlertOpenRow[]>([])
  const [sentimentAlerts, setSentimentAlerts] = useState<AlertOpenRow[]>([])
  const [noAdvisorClass, setNoAdvisorClass] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const thr = Number.parseFloat(riskThreshold)
      const t = Number.isFinite(thr) ? Math.min(1, Math.max(0, thr)) : 0
      const res = await dashboardService.getAdvisorDashboard({
        page,
        limit,
        risk_threshold: t,
      })
      const data = res.data as {
        student_table?: StudentRow[]
        recent_alerts?: AlertItem[]
        pagination?: Pagination
        alert_cards?: AlertCards
        risk_alerts?: AlertOpenRow[]
        sentiment_alerts?: AlertOpenRow[]
      }
      setRows(data.student_table ?? [])
      setRecentAlerts(data.recent_alerts ?? [])
      setPagination(data.pagination ?? null)
      setAlertCards(data.alert_cards ?? null)
      setRiskAlerts(data.risk_alerts ?? [])
      setSentimentAlerts(data.sentiment_alerts ?? [])
      const p = data.pagination
      const emptyClass =
        (p?.total ?? 0) === 0 &&
        (data.student_table?.length ?? 0) === 0 &&
        (data.recent_alerts?.length ?? 0) === 0
      setNoAdvisorClass(emptyClass)
    } catch {
      toast.error('Không tải được dashboard cố vấn')
      setRows([])
      setRecentAlerts([])
      setPagination(null)
      setAlertCards(null)
      setRiskAlerts([])
      setSentimentAlerts([])
      setNoAdvisorClass(false)
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const openStudentDetail = (studentId: string) => {
    setDetailStudentId(studentId)
    setDetailOpen(true)
  }

  const closeStudentDetail = () => {
    setDetailOpen(false)
    setDetailStudentId(null)
  }

  const unreadRecent = recentAlerts.filter(a => !a.is_read).length
  const paginationTotal = pagination?.total ?? 0

  return (
    <>
      <PageMeta
        title="Tổng quan cố vấn | Advisor"
        description="POST /api/dashboard/advisor — rủi ro & ưu tiên can thiệp"
      />
      <PageBreadcrumb pageTitle="Tổng quan rủi ro (cố vấn)" />

      <AdvisorDashboardCharts
        studentTable={rows}
        alertCards={alertCards}
        riskAlerts={riskAlerts}
        sentimentAlerts={sentimentAlerts}
        paginationTotal={paginationTotal}
        unreadNotifications={unreadRecent}
        noAdvisorClass={noAdvisorClass}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/3 dark:shadow-none">
            <h2 className="mb-4 border-b border-gray-100 pb-3 text-lg font-semibold text-gray-900 dark:border-gray-800 dark:text-white/90">
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
                            <TableCell className="px-3 py-2">
                              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${riskLabelBadgeClass(row.risk_label)}`}>
                                {formatRiskLabel(row.risk_label)}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <span className="font-medium">{row.alert_count ?? 0}</span>
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openStudentDetail(row.student_user_id)}
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
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/3 dark:shadow-none">
            <h2 className="mb-4 border-b border-gray-100 pb-3 text-lg font-semibold text-gray-900 dark:border-gray-800 dark:text-white/90">
              Cảnh báo gần đây
            </h2>
            {recentAlerts.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có bản ghi.</p>
            ) : (
              <ul className="max-h-[480px] space-y-3 overflow-y-auto text-sm">
                {recentAlerts.map(a => (
                  <li
                    key={a._id}
                    className="rounded-lg border border-gray-100 p-3 transition-colors duration-200 hover:border-gray-200 hover:bg-gray-50/80 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-white/4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          {a.title ?? a.alert_id?.alert_type ?? 'Thông báo'}
                        </span>
                        {a.alert_id?.severity ? (
                          <span
                            className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${severityBadgeClass(a.alert_id.severity)}`}
                          >
                            {a.alert_id.severity}
                          </span>
                        ) : null}
                      </div>
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

      <AdvisorStudentDetailModal
        isOpen={detailOpen}
        studentUserId={detailStudentId}
        onClose={closeStudentDetail}
      />
    </>
  )
}
