import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { feedbackService } from '@/services/FeedbackService'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type FeedbackRow = {
  _id: string
  class_id?: string
  student_user_id?: string
  advisor_user_id?: string
  meeting_id?: string
  feedback_text: string
  rating?: number
  sentiment_label?: string
  feedback_score?: number
  submitted_at?: string
  meeting_time?: string | null
  meeting_end_time?: string | null
  class_display?: string | null
  advisor_display?: string | null
}

function formatDate(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN')
  } catch {
    return iso
  }
}

const SENTIMENT_ALL = '__all__'

const emptyFilters = () => ({
  classId: '',
  studentId: '',
  advisorId: '',
  sentiment: SENTIMENT_ALL as string,
})

export type FeedbackListPageProps = {
  /** Khi set (ví dụ cố vấn), lọc cố định theo advisor_user_id và ẩn ô nhập advisor */
  presetAdvisorUserId?: string
}

export default function FeedbackListPage({ presetAdvisorUserId }: FeedbackListPageProps = {}) {
  const [page, setPage] = useState(1)
  const limit = 20
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)

  const [applied, setApplied] = useState(emptyFilters)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<FeedbackRow | null>(null)

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const body: Record<string, unknown> = { page, limit }
      if (applied.classId.trim()) body.class_id = applied.classId.trim()
      if (applied.studentId.trim()) body.student_user_id = applied.studentId.trim()
      if (applied.advisorId.trim()) body.advisor_user_id = applied.advisorId.trim()
      if (applied.sentiment && applied.sentiment !== SENTIMENT_ALL)
        body.sentiment_label = applied.sentiment

      const res = await feedbackService.listFeedback(body)
      const payload = res.data as { items: FeedbackRow[]; pagination: Pagination }
      setRows(payload.items ?? [])
      setPagination(payload.pagination ?? null)
    } catch {
      toast.error('Đã có lỗi xảy ra')
      setRows([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [page, limit, applied])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (!presetAdvisorUserId) return
    setApplied(d => ({ ...d, advisorId: presetAdvisorUserId }))
    setPage(1)
  }, [presetAdvisorUserId])

  const openDetail = (row: FeedbackRow) => {
    setDetailRow(row)
    setDetailOpen(true)
  }

  return (
    <>
      <PageMeta
        title="Phản hồi | Advisor"
        description="POST /api/feedback/list — xem phản hồi sau meeting"
      />
      <PageBreadcrumb
        pageTitle={presetAdvisorUserId ? 'Phản hồi (lớp của tôi)' : 'Phản hồi (danh sách)'}
      />

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
        {loading ? (
          <p className="py-6 text-gray-500">Đang tải...</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="text-left text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-200 dark:border-gray-700">
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Thời gian
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Lớp / Cố vấn
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Cảm xúc
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Đánh giá
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Nội dung (rút gọn)
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <td className="px-3 py-6 text-gray-500" colSpan={6}>
                      Không có bản ghi.
                    </td>
                  </TableRow>
                ) : (
                  rows.map(row => (
                    <TableRow
                      key={row._id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <TableCell className="max-w-[140px] whitespace-nowrap px-3 py-2 text-xs">
                        {formatDate(row.submitted_at)}
                      </TableCell>
                      <TableCell className="max-w-[200px] px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="line-clamp-2">{row.class_display || '—'}</div>
                        <div className="mt-0.5 line-clamp-1 text-gray-500">
                          {row.advisor_display || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2">{row.sentiment_label ?? '—'}</TableCell>
                      <TableCell className="px-3 py-2">
                        {row.rating != null ? row.rating : '—'}
                      </TableCell>
                      <TableCell className="max-w-md px-3 py-2">
                        <span className="line-clamp-2 text-gray-700 dark:text-gray-300">
                          {row.feedback_text}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => openDetail(row)}>
                          Chi tiết
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

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-2xl p-6">
        <h3 className="mb-4 text-lg font-semibold">Chi tiết phản hồi</h3>
        {detailRow && (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Buổi họp
              </dt>
              <dd className="mt-1 text-gray-800 dark:text-white/90">
                {detailRow.meeting_time ? formatDate(detailRow.meeting_time) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Lớp cố vấn
              </dt>
              <dd className="mt-1 text-gray-800 dark:text-white/90">
                {detailRow.class_display || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Cố vấn</dt>
              <dd className="mt-1 text-gray-800 dark:text-white/90">
                {detailRow.advisor_display || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Thời gian gửi
              </dt>
              <dd className="mt-1 text-gray-800 dark:text-white/90">
                {formatDate(detailRow.submitted_at)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Cảm xúc / điểm
              </dt>
              <dd className="mt-1 text-gray-800 dark:text-white/90">
                {detailRow.sentiment_label ?? '—'}
                {detailRow.feedback_score != null ? ` (${detailRow.feedback_score.toFixed(2)})` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Nội dung</dt>
              <dd className="mt-1 whitespace-pre-wrap text-gray-800 dark:text-white/90">
                {detailRow.feedback_text}
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
