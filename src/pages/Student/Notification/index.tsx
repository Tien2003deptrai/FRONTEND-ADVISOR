import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { notificationService } from '@/services/NotificationService'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type NotificationRow = {
  _id: string
  type?: string
  title?: string
  content?: string
  is_read?: boolean
  sent_at?: string
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<NotificationRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<NotificationRow | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await notificationService.listNotifications({ page, limit })
      const payload = res.data as { items: NotificationRow[]; pagination: Pagination }
      setRows(payload.items ?? [])
      setPagination(payload.pagination ?? null)
    } catch {
      toast.error('Đã có lỗi xảy ra')
      setRows([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const openDetail = (row: NotificationRow) => {
    setDetailRow(row)
    setDetailOpen(true)
  }

  return (
    <>
      <PageMeta title="Thông báo | Sinh viên" description="Danh sách thông báo" />
      <PageBreadcrumb pageTitle="Thông báo" />

      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        API <code className="text-xs">POST /notification/list</code> — backend gắn{' '}
        <code>recipient_user_id</code> theo tài khoản đăng nhập.
      </p>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
        {loading ? (
          <p className="text-gray-500">Đang tải...</p>
        ) : (
          <div className="overflow-x-auto">
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
                    Tiêu đề
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Đã đọc
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Chi tiết
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <td className="px-3 py-6 text-gray-500" colSpan={5}>
                      Không có thông báo.
                    </td>
                  </TableRow>
                ) : (
                  rows.map(row => (
                    <TableRow
                      key={row._id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                        {row.sent_at ? new Date(row.sent_at).toLocaleString('vi-VN') : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-2">{row.type ?? '—'}</TableCell>
                      <TableCell className="max-w-xs truncate px-3 py-2">
                        {row.title ?? '—'}
                      </TableCell>
                      <TableCell className="px-3 py-2">{row.is_read ? 'Có' : 'Chưa'}</TableCell>
                      <TableCell className="px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => openDetail(row)}>
                          Xem
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

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
      </div>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-lg p-6">
        <h3 className="mb-3 text-lg font-semibold">Chi tiết thông báo</h3>
        {detailRow && (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-medium text-gray-500">Tiêu đề</dt>
              <dd>{detailRow.title ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Loại</dt>
              <dd>{detailRow.type ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Nội dung</dt>
              <dd className="whitespace-pre-wrap text-gray-800 dark:text-white/90">
                {detailRow.content ?? '—'}
              </dd>
            </div>
          </dl>
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
