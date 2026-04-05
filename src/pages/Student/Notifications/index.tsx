import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import Button from '@/components/ui/button/Button'
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
  title?: string
  content?: string
  sent_at?: string
  is_read?: boolean
  alert_id?: {
    alert_type?: string
    term_id?: { term_code?: string; term_name?: string } | string | null
  } | string | null
}

function termLabelFromRow(row: NotifRow): string {
  const a = row.alert_id
  if (!a || typeof a !== 'object') return '—'
  const t = a.term_id
  if (t && typeof t === 'object') {
    const parts = [t.term_code, t.term_name].filter(Boolean)
    if (parts.length) return parts.join(' — ')
  }
  return '—'
}

function alertTypeLabel(row: NotifRow): string {
  const a = row.alert_id
  if (a && typeof a === 'object' && a.alert_type) return a.alert_type
  return '—'
}

function formatDt(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN')
  } catch {
    return iso
  }
}

export default function StudentNotificationsPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const [listKey, setListKey] = useState(0)
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<NotifRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)

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
  }, [loadList, listKey])

  return (
    <>
      <PageMeta title="Thông báo | Sinh viên" description="Thông báo và cảnh báo dành cho bạn" />
      <PageBreadcrumb pageTitle="Thông báo" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Cảnh báo rủi ro, cảm xúc và thông tin hệ thống gửi đến tài khoản của bạn.
        </p>
        <Button size="sm" variant="outline" onClick={() => setListKey(k => k + 1)} disabled={loading}>
          Làm mới
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/3 dark:shadow-none">
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
                    Loại
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Học kỳ
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
                    <td className="px-3 py-8 text-gray-500" colSpan={5}>
                      Không có thông báo.
                    </td>
                  </TableRow>
                ) : (
                  rows.map(row => (
                    <TableRow key={row._id} className="border-b border-gray-100 dark:border-gray-800">
                      <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                        {formatDt(row.sent_at)}
                      </TableCell>
                      <TableCell className="px-3 py-2">{alertTypeLabel(row)}</TableCell>
                      <TableCell className="px-3 py-2">{termLabelFromRow(row)}</TableCell>
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
    </>
  )
}
