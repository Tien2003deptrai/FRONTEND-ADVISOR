import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import Select from '@/components/form/Select'
import TextArea from '@/components/form/input/TextArea'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { feedbackService } from '@/services/FeedbackService'
import { meetingService } from '@/services/MeetingService'
import useAuthStore from '@/stores/authStore'
import { formatAxiosMessage } from '@/utils/formatAxiosMessage'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type FeedbackRow = {
  _id: string
  meeting_id?: string | { _id?: string }
  class_id?: string | { _id?: string }
  advisor_user_id?: string | { _id?: string }
  feedback_text: string
  rating?: number
  sentiment_label?: string
  submitted_at?: string
}

type MeetingHint = {
  meeting_id: string
  class_id: string
  advisor_user_id: string
  class_label: string
  advisor_label: string
  meeting_time?: string
  meeting_end_time?: string
  feedback_count: number
  latest_submitted_at?: string
}

const SENTIMENT_SKIP = '__skip__'
const SENTIMENT_OPTS = [
  { value: SENTIMENT_SKIP, label: 'Không gửi nhãn (tùy chọn)' },
  { value: 'POSITIVE', label: 'POSITIVE' },
  { value: 'NEUTRAL', label: 'NEUTRAL' },
  { value: 'NEGATIVE', label: 'NEGATIVE' },
]

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
  const [saving, setSaving] = useState(false)
  const [meetingId, setMeetingId] = useState('')
  const [text, setText] = useState('')
  const [rating, setRating] = useState(0)
  const [sentiment, setSentiment] = useState(SENTIMENT_SKIP)

  const normalizeRefId = (v: unknown): string => {
    if (!v) return ''
    if (typeof v === 'object' && v !== null && '_id' in v) {
      return String((v as { _id?: unknown })._id ?? '')
    }
    return String(v)
  }

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
      } catch (e) {
        toast.error(formatAxiosMessage(e))
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
        items?: Array<{
          _id?: string
          class_id?:
            | string
            | {
                _id?: string
                class_code?: string
                class_name?: string
              }
          advisor_user_id?:
            | string
            | {
                _id?: string
                email?: string
                profile?: { full_name?: string }
                advisor_info?: { staff_code?: string; title?: string }
              }
          meeting_time?: string
          meeting_end_time?: string
        }>
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

      const items = (meetingPayload.items ?? []).map(m => {
        const meetingId = normalizeRefId(m._id)
        const fbStat = feedbackByMeeting.get(meetingId)
        const classRaw = m.class_id
        const advisorRaw = m.advisor_user_id
        const classCode =
          typeof classRaw === 'object' && classRaw !== null && 'class_code' in classRaw
            ? String((classRaw as { class_code?: string }).class_code ?? '')
            : ''
        const className =
          typeof classRaw === 'object' && classRaw !== null && 'class_name' in classRaw
            ? String((classRaw as { class_name?: string }).class_name ?? '')
            : ''
        const advisorName =
          typeof advisorRaw === 'object' && advisorRaw !== null && 'profile' in advisorRaw
            ? String(
                (advisorRaw as { profile?: { full_name?: string } }).profile?.full_name ?? ''
              )
            : ''
        const advisorEmail =
          typeof advisorRaw === 'object' && advisorRaw !== null && 'email' in advisorRaw
            ? String((advisorRaw as { email?: string }).email ?? '')
            : ''
        const advisorStaffCode =
          typeof advisorRaw === 'object' && advisorRaw !== null && 'advisor_info' in advisorRaw
            ? String(
                (advisorRaw as { advisor_info?: { staff_code?: string } }).advisor_info
                  ?.staff_code ?? ''
              )
            : ''
        return {
          meeting_id: meetingId,
          class_id: normalizeRefId(m.class_id),
          advisor_user_id: normalizeRefId(m.advisor_user_id),
          class_label:
            [classCode, className].filter(Boolean).join(' — ') ||
            normalizeRefId(m.class_id) ||
            '—',
          advisor_label:
            [advisorName, advisorStaffCode && `(${advisorStaffCode})`, advisorEmail]
              .filter(Boolean)
              .join(' • ') ||
            normalizeRefId(m.advisor_user_id) ||
            '—',
          meeting_time: m.meeting_time,
          meeting_end_time: m.meeting_end_time,
          feedback_count: fbStat?.count ?? 0,
          latest_submitted_at: fbStat?.latest,
        } satisfies MeetingHint
      })
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
    setMeetingId('')
    setText('')
    setRating(0)
    setSentiment(SENTIMENT_SKIP)
    setCreateOpen(true)
  }

  const openCreateForMeeting = (meetingId: string) => {
    setMeetingId(meetingId)
    setText('')
    setRating(0)
    setSentiment(SENTIMENT_SKIP)
    setCreateOpen(true)
  }

  const submitFeedback = async () => {
    if (!meetingId.trim()) {
      toast.error('Chọn meeting cần phản hồi')
      return
    }
    if (text.trim().length < 30) {
      toast.error('Nội dung phản hồi tối thiểu 30 ký tự')
      return
    }
    const body: Record<string, unknown> = {
      meeting_id: meetingId.trim(),
      feedback_text: text.trim(),
    }
    if (rating >= 1 && rating <= 5) body.rating = rating
    if (sentiment && sentiment !== SENTIMENT_SKIP) body.sentiment_label = sentiment

    setSaving(true)
    try {
      const res = await feedbackService.submitFeedback(body)
      toast.success(res.message || 'Đã gửi phản hồi')
      setCreateOpen(false)
      setPage(1)
      await fetchPage(1)
      await loadMeetingHints()
    } catch (e) {
      toast.error(formatAxiosMessage(e))
    } finally {
      setSaving(false)
    }
  }

  const meetingOptions = meetingHints.map(m => ({
    value: m.meeting_id,
    label: `${m.class_label} • ${m.meeting_time ? new Date(m.meeting_time).toLocaleString('vi-VN') : m.meeting_id}`,
  }))
  const selectedMeeting = meetingHints.find(m => m.meeting_id === meetingId)

  return (
    <>
      <PageMeta title="Phản hồi | Sinh viên" description="Gửi và xem phản hồi SHCVHT" />
      <PageBreadcrumb pageTitle="Phản hồi" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Danh sách: <code className="text-xs">POST /feedback/list</code> (lọc theo tài khoản). Gửi mới:{' '}
          <code className="text-xs">POST /feedback</code> — form trong modal.
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
        <div className="overflow-x-auto">
          <Table className="text-left text-sm">
            <TableHeader>
              <TableRow className="border-b border-gray-200 dark:border-gray-700">
                <TableCell isHeader className="px-3 py-2 font-semibold">
                  meeting_id
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold">
                  Lớp cố vấn
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold">
                  Cố vấn học tập
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold">
                  Thời gian họp
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold">
                  Lần feedback
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold">
                  Gần nhất
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold">
                  Hành động
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetingHints.length === 0 ? (
                <TableRow>
                  <td className="px-3 py-5 text-gray-500" colSpan={7}>
                    Chưa có meeting nào cho tài khoản này.
                  </td>
                </TableRow>
              ) : (
                meetingHints.map(row => (
                  <TableRow key={row.meeting_id} className="border-b border-gray-100 dark:border-gray-800">
                    <TableCell className="max-w-[180px] truncate px-3 py-2 font-mono text-xs">
                      {row.meeting_id}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate px-3 py-2 font-mono text-xs">
                      {row.class_label}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate px-3 py-2 text-xs">
                      {row.advisor_label}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                      {row.meeting_time ? new Date(row.meeting_time).toLocaleString('vi-VN') : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2">{row.feedback_count}</TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                      {row.latest_submitted_at
                        ? new Date(row.latest_submitted_at).toLocaleString('vi-VN')
                        : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      <Button size="sm" variant="outline" onClick={() => openCreateForMeeting(row.meeting_id)}>
                        Gửi feedback
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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
                    <TableRow key={row._id} className="border-b border-gray-100 dark:border-gray-800">
                      <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                        {row.submitted_at
                          ? new Date(row.submitted_at).toLocaleString('vi-VN')
                          : '—'}
                      </TableCell>
                      <TableCell className="px-3 py-2">{row.sentiment_label ?? '—'}</TableCell>
                      <TableCell className="px-3 py-2">{row.rating ?? '—'}</TableCell>
                      <TableCell className="max-w-xs truncate px-3 py-2">{row.feedback_text}</TableCell>
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

      <Modal
        isOpen={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        className="max-h-[90vh] max-w-lg overflow-y-auto p-6"
      >
        <h3 className="mb-2 text-lg font-semibold">Gửi phản hồi sau buổi SHCVHT</h3>
        <p className="mb-4 text-xs text-gray-500">
          Chọn meeting từ danh sách của bạn rồi gửi phản hồi. Nội dung tối thiểu 30 ký tự.
        </p>
        <div className="space-y-3">
          <div>
            <Label>Meeting *</Label>
            <Select
              key={`meeting-${createOpen}-${meetingHints.length}-${meetingId}`}
              options={meetingOptions}
              placeholder={
                meetingOptions.length
                  ? 'Chọn meeting'
                  : 'Chưa có meeting trong lịch sử feedback'
              }
              onChange={setMeetingId}
              defaultValue={meetingId}
            />
            {selectedMeeting && (
              <p className="mt-2 text-xs text-gray-500">
                Lớp: <code>{selectedMeeting.class_label}</code> • Cố vấn:{' '}
                <code>{selectedMeeting.advisor_label}</code>
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="fb-text">Nội dung *</Label>
            <TextArea
              rows={5}
              value={text}
              onChange={setText}
              disabled={saving}
              hint={`${text.trim().length}/30+ ký tự`}
            />
          </div>
          <div>
            <Label>Đánh giá (tùy chọn)</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  disabled={saving}
                  onClick={() => setRating(star)}
                  className={`text-2xl leading-none transition-colors ${
                    star <= rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'
                  }`}
                  aria-label={`Chọn ${star} sao`}
                  title={`${star} sao`}
                >
                  ★
                </button>
              ))}
              {rating > 0 && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setRating(0)}
                  className="ml-2 text-xs text-gray-500 underline"
                >
                  Bỏ chọn
                </button>
              )}
            </div>
          </div>
          <div>
            <Label>Cảm xúc (tùy)</Label>
            <Select
              key={`sent-${createOpen}`}
              options={SENTIMENT_OPTS}
              placeholder="Chọn"
              onChange={setSentiment}
              defaultValue={sentiment}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={saving} onClick={() => setCreateOpen(false)}>
            Hủy
          </Button>
          <Button
            size="sm"
            disabled={saving || meetingOptions.length === 0}
            onClick={() => void submitFeedback()}
          >
            {saving ? 'Đang gửi...' : 'Gửi'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
