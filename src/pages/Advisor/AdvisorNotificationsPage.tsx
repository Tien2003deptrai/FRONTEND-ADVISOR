import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import InputField from '@/components/form/input/InputField'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { notificationService } from '@/services/NotificationService'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type NotifRow = {
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

export default function AdvisorNotificationsPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<NotifRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)

  const [genOpen, setGenOpen] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [riskThreshold, setRiskThreshold] = useState('0.7')
  const [negativeDays, setNegativeDays] = useState('30')

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await notificationService.listNotifications({ page, limit })
      const data = res.data as { items: NotifRow[]; pagination: Pagination }
      setRows(data.items ?? [])
      setPagination(data.pagination ?? null)
    } catch {
      toast.error('Không tải được thông báo')
      setRows([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const submitGenerate = async () => {
    const rt = Number.parseFloat(riskThreshold)
    const nd = Number.parseInt(negativeDays, 10)
    const body: Record<string, unknown> = {}
    if (Number.isFinite(rt)) body.risk_threshold = Math.min(1, Math.max(0, rt))
    if (Number.isFinite(nd)) body.negative_days = Math.min(180, Math.max(1, nd))

    setGenLoading(true)
    try {
      const res = await notificationService.generateAlerts(body)
      const d = res.data as { created_count?: number } | undefined
      toast.success(
        res.message ||
          `Đã xử lý tạo cảnh báo${d?.created_count != null ? ` (${d.created_count})` : ''}`
      )
      setGenOpen(false)
      setPage(1)
      void loadList()
    } catch {
      toast.error('Không chạy được generate')
    } finally {
      setGenLoading(false)
    }
  }

  return (
    <>
      <PageMeta
        title="Thông báo | Advisor"
        description="POST /api/notification/list và /notification/generate"
      />
      <PageBreadcrumb pageTitle="Thông báo & cảnh báo" />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
        {loading ? (
          <p className="py-8 text-gray-500">Đang tải...</p>
        ) : (
          <>
            <Table className="text-left text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-200 dark:border-gray-700">
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Thời gian
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Tiêu đề
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Đã đọc
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <td className="px-3 py-8 text-gray-500" colSpan={4}>
                      Không có thông báo.
                    </td>
                  </TableRow>
                ) : (
                  rows.map(row => (
                    <TableRow key={row._id} className="border-b border-gray-100 dark:border-gray-800">
                      <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                        {formatDt(row.sent_at)}
                      </TableCell>
                      <TableCell className="max-w-md px-3 py-2">
                        <div className="font-medium text-gray-800 dark:text-white/90">
                          {row.title ?? '—'}
                        </div>
                        {row.content ? (
                          <p className="mt-1 line-clamp-2 text-xs text-gray-500">{row.content}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="px-3 py-2">{row.is_read ? 'Có' : 'Chưa'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {pagination && pagination.total_pages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>
                  Trang {pagination.page}/{pagination.total_pages} — {pagination.total} bản ghi
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

      <Modal
        isOpen={genOpen}
        onClose={() => !genLoading && setGenOpen(false)}
        className="max-w-md p-6"
      >
        <h3 className="mb-2 text-lg font-semibold">Tạo / làm mới cảnh báo</h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Gọi <code className="text-xs">POST /notification/generate</code> trong phạm vi lớp của bạn
          (theo token). Có thể tinh chỉnh ngưỡng rủi ro và số ngày phản hồi tiêu cực.
        </p>
        <div className="space-y-3">
          <div>
            <Label htmlFor="n-risk">risk_threshold (0–1)</Label>
            <InputField
              id="n-risk"
              type="number"
              step={0.05}
              min="0"
              max="1"
              value={riskThreshold}
              onChange={e => setRiskThreshold(e.target.value)}
              disabled={genLoading}
            />
          </div>
          <div>
            <Label htmlFor="n-days">negative_days (1–180)</Label>
            <InputField
              id="n-days"
              type="number"
              min="1"
              max="180"
              value={negativeDays}
              onChange={e => setNegativeDays(e.target.value)}
              disabled={genLoading}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={genLoading} onClick={() => setGenOpen(false)}>
            Hủy
          </Button>
          <Button size="sm" disabled={genLoading} onClick={() => void submitGenerate()}>
            {genLoading ? 'Đang chạy...' : 'Xác nhận chạy'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
