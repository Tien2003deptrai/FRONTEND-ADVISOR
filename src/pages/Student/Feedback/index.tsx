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
  type MeetingHint,
  type Pagination,
  SENTIMENT_SKIP,
} from '@/models'
import { MeetingTable, FeedbackCreateModal } from '@/components/Student'

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
  const [selectedMeetingId, setSelectedMeetingId] = useState('')

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
      const res = await meetingService.getInfoMeeting({
        page: 1,
        limit: 50,
      })
      const items = res.data?.items ?? []
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

  const openCreateForMeeting = (meetingId: string) => {
    setSelectedMeetingId(meetingId)
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

      <div className="mb-6">
        <p className="max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Gửi phản hồi sau buổi họp SHCVHT và xem lại lịch sử đã gửi.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none">
        <h2 className="mb-1 border-b border-gray-100 pb-3 text-base font-semibold text-gray-900 dark:border-gray-800 dark:text-white/90">
          Lớp cố vấn & buổi họp
        </h2>
        <p className="mb-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
          Chọn buổi họp theo thời gian, sau đó bấm «Gửi feedback».
        </p>
        <MeetingTable
          meetingHints={meetingHints}
          onFeedback={openCreateForMeeting}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none">
        <h2 className="mb-4 border-b border-gray-100 pb-3 text-base font-semibold text-gray-900 dark:border-gray-800 dark:text-white/90">
          Phản hồi đã gửi
        </h2>
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
                    Lớp / Cố vấn
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
                    <td className="px-3 py-6 text-gray-500" colSpan={6}>
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
                      <TableCell className="max-w-[200px] px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        <div className="line-clamp-2">{row.class_display || '—'}</div>
                        <div className="mt-0.5 line-clamp-1 text-gray-500">
                          {row.advisor_display || '—'}
                        </div>
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
        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white/90">
          Chi tiết phản hồi
        </h3>
        {detailRow && (
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Buổi họp
              </dt>
              <dd className="mt-1 text-gray-800 dark:text-gray-200">
                {detailRow.meeting_time
                  ? new Date(detailRow.meeting_time).toLocaleString('vi-VN')
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Lớp cố vấn
              </dt>
              <dd className="mt-1 text-gray-800 dark:text-gray-200">
                {detailRow.class_display || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Cố vấn
              </dt>
              <dd className="mt-1 text-gray-800 dark:text-gray-200">
                {detailRow.advisor_display || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Nội dung
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
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

      <FeedbackCreateModal
        isOpen={createOpen}
        initialMeetingId={selectedMeetingId}
        onClose={() => setCreateOpen(false)}
        onSubmit={submitFeedback}
      />
    </>
  )
}
