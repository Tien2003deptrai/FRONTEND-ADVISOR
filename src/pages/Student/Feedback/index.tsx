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
import {
  AngleLeftIcon,
  AngleRightIcon,
  CalenderIcon,
  ChatIcon,
  CloseLineIcon,
  EyeIcon,
  TimeIcon,
} from '@/icons'

function sentimentPillClass(label?: string | null): string {
  const s = (label ?? '').toLowerCase()
  if (s.includes('positive') || s.includes('tích cực') || s.includes('vui'))
    return 'border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200'
  if (s.includes('negative') || s.includes('tiêu cực') || s.includes('buồn'))
    return 'border-rose-200/80 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200'
  if (s.includes('neutral') || s.includes('trung lập'))
    return 'border-amber-200/80 bg-amber-50 text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100'
  return 'border-gray-200/80 bg-gray-100 text-gray-800 dark:border-gray-600 dark:bg-white/10 dark:text-gray-200'
}

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
    const meeting = meetingHints.find(m => m.meeting_id === meetingId)
    if (meeting && meeting.feedback_count > 0) {
      toast.info('Bạn đã gửi phản hồi cho buổi họp này rồi')
      return
    }
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string }; status?: number } }
      const status = err.response?.status
      const message = err.response?.data?.message

      if (status === 409 || message?.includes('already submitted')) {
        toast.error('Bạn đã gửi phản hồi cho buổi họp này rồi')
      } else if (status === 422) {
        toast.error(message || 'Không thể gửi phản hồi: kiểm tra thời gian hoặc điều kiện gửi')
      } else {
        toast.error('Đã có lỗi xảy ra')
      }
      return false
    }
  }

  return (
    <>
      <PageMeta title="Phản hồi | Sinh viên" description="Gửi và xem phản hồi SHCVHT" />
      <PageBreadcrumb pageTitle="Phản hồi" />

      <section
        className="relative mb-8 overflow-hidden rounded-2xl border border-brand-200/45 bg-gradient-to-br from-brand-50 via-white to-violet-50/40 p-5 shadow-[0_12px_40px_-14px_rgba(70,95,255,0.26)] ring-1 ring-brand-500/10 dark:border-brand-500/20 dark:from-brand-950/45 dark:via-gray-900 dark:to-violet-950/30 dark:ring-brand-400/10 sm:p-6"
        aria-labelledby="student-fb-hero-title"
      >
        <div
          className="pointer-events-none absolute -right-14 -top-16 size-44 rounded-full bg-brand-400/18 blur-3xl dark:bg-brand-500/12"
          aria-hidden
        />
        <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/5 dark:text-brand-300 dark:ring-brand-500/25">
          <ChatIcon className="size-3.5 shrink-0" aria-hidden />
          SHCVHT
        </p>
        <h2
          id="student-fb-hero-title"
          className="mt-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl"
        >
          Phản hồi sau buổi họp — trong 24 giờ
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Chọn buổi họp ở bảng bên dưới, gửi nội dung và xem lại lịch sử. Mỗi buổi chỉ gửi một lần.
        </p>
      </section>

      <div className="mb-6 rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.1)] ring-1 ring-gray-900/[0.035] dark:border-gray-800 dark:bg-gray-900/50 dark:ring-white/[0.05] sm:p-6">
        <h2 className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-4 text-lg font-bold text-gray-900 dark:border-gray-800 dark:text-white/90">
          <CalenderIcon className="size-6 text-brand-500 dark:text-brand-400" aria-hidden />
          Lớp cố vấn & buổi họp
        </h2>
        <div className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2.5 text-xs font-medium text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
          Chọn đúng buổi họp theo thời gian, sau đó bấm <span className="font-bold">Gửi phản hồi</span> — chỉ
          trong vòng 24h sau khi kết thúc buổi.
        </div>
        <MeetingTable
          meetingHints={meetingHints}
          onFeedback={openCreateForMeeting}
        />
      </div>

      <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.1)] ring-1 ring-gray-900/[0.035] dark:border-gray-800 dark:bg-gray-900/50 dark:ring-white/[0.05] sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 text-lg font-bold text-gray-900 dark:border-gray-800 dark:text-white/90">
          <TimeIcon className="size-6 text-brand-500 dark:text-brand-400" aria-hidden />
          Phản hồi đã gửi
        </h2>
        {loading ? (
          <div className="space-y-3 py-4" aria-busy="true">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-gray-100 dark:bg-white/10" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="text-left text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-200 bg-gray-50/90 dark:border-gray-800 dark:bg-white/[0.04]">
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Gửi lúc
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Lớp & cố vấn
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Cảm xúc
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Đánh giá
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Nội dung
                  </TableCell>
                  <TableCell isHeader className="w-px whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Xem
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      Bạn chưa gửi phản hồi nào — hãy chọn buổi họp ở bảng phía trên để bắt đầu.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(row => (
                    <TableRow
                      key={row._id}
                      className="border-b border-gray-100 bg-white transition-colors duration-150 last:border-0 hover:bg-gray-50/90 dark:border-gray-800/80 dark:bg-transparent dark:hover:bg-white/[0.03]"
                    >
                      <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                        {row.submitted_at
                          ? new Date(row.submitted_at).toLocaleString('vi-VN')
                          : '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px] px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                        <div className="line-clamp-2 font-medium text-gray-800 dark:text-gray-200">
                          {row.class_display || '—'}
                        </div>
                        <div className="mt-0.5 line-clamp-1 text-gray-500 dark:text-gray-500">
                          {row.advisor_display || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span
                          className={`inline-flex max-w-[10rem] items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${sentimentPillClass(row.sentiment_label)}`}
                        >
                          <span className="line-clamp-1">{row.sentiment_label ?? '—'}</span>
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm tabular-nums text-gray-800 dark:text-gray-200">
                        {row.rating ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {row.feedback_text}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right align-middle">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="font-semibold"
                          startIcon={<EyeIcon className="size-6 shrink-0 text-gray-700 dark:text-gray-200" aria-hidden />}
                          onClick={() => openDetail(row)}
                        >
                          {/* Chi tiết */}
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
          <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
            <p className="tabular-nums">
              <span className="font-medium text-gray-800 dark:text-white/90">{pagination.page}</span>
              <span className="mx-1 text-gray-400">/</span>
              {pagination.total_pages} trang ·{' '}
              <span className="font-medium text-gray-800 dark:text-white/90">{pagination.total}</span> bản ghi
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="!px-2.5 font-semibold"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                aria-label="Trang trước"
                startIcon={<AngleLeftIcon className="size-4" aria-hidden />}
              >
                <span className="sr-only">Trang trước</span>
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="!px-2.5 font-semibold"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage(p => p + 1)}
                aria-label="Trang sau"
                endIcon={<AngleRightIcon className="size-4" aria-hidden />}
              >
                <span className="sr-only">Trang sau</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} className="max-w-xl overflow-hidden p-0">
        <div className="border-b border-gray-100 bg-gradient-to-r from-brand-50/95 to-violet-50/50 px-6 py-4 dark:border-gray-800 dark:from-brand-950/50 dark:to-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/90 text-brand-600 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/10 dark:text-brand-300 dark:ring-brand-500/25">
                <EyeIcon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white/90">
                  Chi tiết phản hồi
                </h3>
                {detailRow?.submitted_at ? (
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    {new Date(detailRow.submitted_at).toLocaleString('vi-VN')}
                  </p>
                ) : null}
              </div>
            </div>
            {detailRow?.sentiment_label ? (
              <span
                className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-bold ${sentimentPillClass(detailRow.sentiment_label)}`}
              >
                {detailRow.sentiment_label}
              </span>
            ) : null}
          </div>
        </div>
        <div className="p-6">
          {detailRow && (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Buổi họp
                </dt>
                <dd className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {detailRow.meeting_time
                    ? new Date(detailRow.meeting_time).toLocaleString('vi-VN')
                    : '—'}
                </dd>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Đánh giá
                </dt>
                <dd className="mt-1 text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                  {detailRow.rating ?? '—'}
                </dd>
              </div>
              <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Lớp cố vấn
                </dt>
                <dd className="mt-1 text-gray-800 dark:text-gray-200">{detailRow.class_display || '—'}</dd>
              </div>
              <div className="sm:col-span-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-white/[0.03]">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Cố vấn
                </dt>
                <dd className="mt-1 text-gray-800 dark:text-gray-200">{detailRow.advisor_display || '—'}</dd>
              </div>
              <div className="sm:col-span-2 rounded-xl border border-brand-100/80 bg-gradient-to-br from-brand-50/40 to-white p-4 dark:border-brand-500/20 dark:from-brand-950/25 dark:to-gray-900/40">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  Nội dung
                </dt>
                <dd className="mt-2 whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                  {detailRow.feedback_text}
                </dd>
              </div>
            </dl>
          )}
        </div>
        <div className="flex justify-end border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
          <Button
            size="sm"
            variant="outline"
            className="font-semibold"
            startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
            onClick={() => setDetailOpen(false)}
          >
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
