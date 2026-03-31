import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { feedbackService } from '@/services/FeedbackService'
import { meetingService } from '@/services/MeetingService'
import useAuthStore from '@/stores/authStore'
import {
  type FeedbackRow,
  type FeedbackCreateForm,
  type MeetingApiItem,
  type MeetingHint,
  type Pagination,
  SENTIMENT_SKIP,
  buildMeetingHintFromApiItem,
  normalizeRefId,
} from '@/models/StudentFeedback'
import MeetingHintsTable from './components/MeetingHintsTable'
import FeedbackCreateModal from './components/FeedbackCreateModal'

export default function FeedbackPage() {
  const userId = useAuthStore(s => s.user?._id)
  const [page, setPage] = useState(1)
  const limit = 15
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [meetingHints, setMeetingHints] = useState<MeetingHint[]>([])

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRow, setDetailRow] = useState<FeedbackRow | null>(null)

  const [createOpen, setCreateOpen] = useState(false)

  const fetchPage = useCallback(
    async (p: number) => {
      if (!userId) return
      setLoading(true)
      try {
        const res = await feedbackService.listFeedback({
          page: p,
          limit,
          student_user_id: userId,
        })
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
    },
    [limit, userId]
  )

  const loadMeetingHints = useCallback(async () => {
    if (!userId) return
    try {
      const [meetingRes, fbRes] = await Promise.all([
        meetingService.listMyMeetings({
          page: 1,
          limit: 50,
        }),
        feedbackService.listFeedback({
          page: 1,
          limit: 50,
          student_user_id: userId,
        }),
      ])

      const meetingPayload = meetingRes.data as {
        items?: MeetingApiItem[]
      }
      const fbPayload = fbRes.data as { items?: FeedbackRow[] }
      const feedbackByMeeting = new Map<string, { count: number; latest?: string }>()
      for (const fb of fbPayload.items ?? []) {
        const mid = normalizeRefId(fb.meeting_id)
        if (!mid) continue
        const prev = feedbackByMeeting.get(mid) ?? { count: 0, latest: undefined }
        prev.count += 1
        if (
          fb.submitted_at &&
          (!prev.latest || new Date(fb.submitted_at).getTime() > new Date(prev.latest).getTime())
        ) {
          prev.latest = fb.submitted_at
        }
        feedbackByMeeting.set(mid, prev)
      }

      const items = (meetingPayload.items ?? []).map(m =>
        buildMeetingHintFromApiItem(m, feedbackByMeeting)
      )
      setMeetingHints(
        [...items].sort(
          (a, b) =>
            new Date(b.meeting_time ?? b.latest_submitted_at ?? 0).getTime() -
            new Date(a.meeting_time ?? a.latest_submitted_at ?? 0).getTime()
        )
      )
    } catch {
      setMeetingHints([])
    }
  }, [userId])

  useEffect(() => {
    void fetchPage(page)
  }, [page, fetchPage])

  useEffect(() => {
    void loadMeetingHints()
  }, [loadMeetingHints])

  const openDetail = (row: FeedbackRow) => {
    setDetailRow(row)
    setDetailOpen(true)
  }

  const openCreate = () => {
    setCreateOpen(true)
  }

  const openCreateForMeeting = () => {
    setCreateOpen(true)
  }

  const submitFeedback = async (form: FeedbackCreateForm): Promise<boolean> => {
    const body: Record<string, unknown> = {
      meeting_id: form.meetingId.trim(),
      feedback_text: form.text.trim(),
    }
    if (form.rating >= 1 && form.rating <= 5) body.rating = form.rating
    if (form.sentiment && form.sentiment !== SENTIMENT_SKIP) body.sentiment_label = form.sentiment
    try {
      const res = await feedbackService.submitFeedback(body)
      toast.success(res.message || 'Đã gửi phản hồi')
      setPage(1)
      await fetchPage(1)
      await loadMeetingHints()
      return true
    } catch {
      toast.error('Đã có lỗi xảy ra')
      return false
    }
  }

  return (
    <>
      <PageMeta title="Phản hồi | Sinh viên" description="Gửi và xem phản hồi SHCVHT" />
      <PageBreadcrumb pageTitle="Phản hồi" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Danh sách: <code className="text-xs">POST /feedback/list</code> (lọc theo tài khoản). Gửi
          mới: <code className="text-xs">POST /feedback</code> — form trong modal.
        </p>
        <Button size="sm" onClick={openCreate}>
          Gửi phản hồi mới
        </Button>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
        <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
          Lớp cố vấn & meeting của tôi
        </h2>
        <p className="mb-3 text-xs text-gray-500">
          Danh sách lấy từ API <code>POST /meeting/my</code> theo tài khoản STUDENT.
        </p>
        <MeetingHintsTable meetingHints={meetingHints} onFeedback={openCreateForMeeting} />
      </div>

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
                    Cảm xúc
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Rating
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Tóm tắt
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
                      Chưa có phản hồi.
                    </td>
                  </TableRow>
                ) : (
                  rows.map(row => (
                    <TableRow
                      key={row._id}
                      className="border-b border-gray-100 dark:border-gray-800"
                    >
                      <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                        {row.submitted_at
                          ? new Date(row.submitted_at).toLocaleString('vi-VN')
                          : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-2">{row.sentiment_label ?? '—'}</TableCell>
                      <TableCell className="px-3 py-2">{row.rating ?? '—'}</TableCell>
                      <TableCell className="max-w-xs truncate px-3 py-2">
                        {row.feedback_text}
                      </TableCell>
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

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-xl p-6">
        <h3 className="mb-3 text-lg font-semibold">Chi tiết phản hồi</h3>
        {detailRow && (
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="font-medium text-gray-500">ID</dt>
              <dd className="break-all">{detailRow._id}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">meeting_id</dt>
              <dd className="break-all">{String(detailRow.meeting_id ?? '—')}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Nội dung</dt>
              <dd className="whitespace-pre-wrap">{detailRow.feedback_text}</dd>
            </div>
          </dl>
        )}
        <div className="mt-6 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setDetailOpen(false)}>
            Đóng
          </Button>
        </div>
      </Modal>

      <FeedbackCreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={submitFeedback}
      />
    </>
  )
}
