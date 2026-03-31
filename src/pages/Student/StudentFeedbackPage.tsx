import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '../../components/common/PageMeta'
import PageBreadcrumb from '../../components/common/PageBreadCrumb'
import { Modal } from '../../components/ui/modal'
import Button from '../../components/ui/button/Button'
import Label from '../../components/form/Label'
import InputField from '../../components/form/input/InputField'
import Select from '../../components/form/Select'
import TextArea from '../../components/form/input/TextArea'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { feedbackService } from '../../services/FeedbackService'
import useAuthStore from '../../stores/authStore'
import { formatAxiosMessage } from '../../utils/formatAxiosMessage'

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

export default function StudentFeedbackPage() {
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
  const [rating, setRating] = useState('')
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
      const res = await feedbackService.listFeedback({
        page: 1,
        limit: 200,
        student_user_id: userId,
      })
      const payload = res.data as { items?: FeedbackRow[] }
      const map = new Map<string, MeetingHint>()
      for (const row of payload.items ?? []) {
        const meetingId = normalizeRefId(row.meeting_id)
        if (!meetingId) continue
        const classId = normalizeRefId(row.class_id)
        const advisorId = normalizeRefId(row.advisor_user_id)
        const prev = map.get(meetingId)
        if (!prev) {
          map.set(meetingId, {
            meeting_id: meetingId,
            class_id: classId,
            advisor_user_id: advisorId,
            feedback_count: 1,
            latest_submitted_at: row.submitted_at,
          })
        } else {
          prev.feedback_count += 1
          if (
            row.submitted_at &&
            (!prev.latest_submitted_at ||
              new Date(row.submitted_at).getTime() > new Date(prev.latest_submitted_at).getTime())
          ) {
            prev.latest_submitted_at = row.submitted_at
          }
          if (!prev.class_id && classId) prev.class_id = classId
          if (!prev.advisor_user_id && advisorId) prev.advisor_user_id = advisorId
        }
      }
      setMeetingHints(
        [...map.values()].sort(
          (a, b) =>
            new Date(b.latest_submitted_at ?? 0).getTime() -
            new Date(a.latest_submitted_at ?? 0).getTime()
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
    setRating('')
    setSentiment(SENTIMENT_SKIP)
    setCreateOpen(true)
  }

  const openCreateForMeeting = (meetingId: string) => {
    setMeetingId(meetingId)
    setText('')
    setRating('')
    setSentiment(SENTIMENT_SKIP)
    setCreateOpen(true)
  }

  const submitFeedback = async () => {
    if (!meetingId.trim()) {
      toast.error('Nhập meeting_id (MongoId buổi SHCVHT)')
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
    if (rating.trim()) {
      const r = parseInt(rating, 10)
      if (Number.isNaN(r) || r < 1 || r > 5) {
        toast.error('rating 1–5')
        return
      }
      body.rating = r
    }
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
          Hiện backend chưa có endpoint riêng cho STUDENT để list meeting/class. Bảng dưới suy ra từ feedback bạn đã gửi.
        </p>
        <div className="overflow-x-auto">
          <Table className="text-left text-sm">
            <TableHeader>
              <TableRow className="border-b border-gray-200 dark:border-gray-700">
                <TableCell isHeader className="px-3 py-2 font-semibold">
                  meeting_id
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold">
                  class_id
                </TableCell>
                <TableCell isHeader className="px-3 py-2 font-semibold">
                  advisor_user_id
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
                  <td className="px-3 py-5 text-gray-500" colSpan={6}>
                    Chưa suy ra được meeting từ feedback lịch sử. Bạn vẫn có thể bấm «Gửi phản hồi mới» và nhập meeting_id.
                  </td>
                </TableRow>
              ) : (
                meetingHints.map(row => (
                  <TableRow key={row.meeting_id} className="border-b border-gray-100 dark:border-gray-800">
                    <TableCell className="max-w-[180px] truncate px-3 py-2 font-mono text-xs">
                      {row.meeting_id}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate px-3 py-2 font-mono text-xs">
                      {row.class_id || '—'}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate px-3 py-2 font-mono text-xs">
                      {row.advisor_user_id || '—'}
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
          Cần <code>meeting_id</code> hợp lệ (lấy từ lịch / thông báo buổi họp). Nội dung tối thiểu 30 ký tự.
        </p>
        <div className="space-y-3">
          <div>
            <Label htmlFor="meet">meeting_id *</Label>
            <InputField id="meet" value={meetingId} onChange={e => setMeetingId(e.target.value)} disabled={saving} />
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
            <Label htmlFor="rate">Đánh giá (1–5, tùy)</Label>
            <InputField id="rate" value={rating} onChange={e => setRating(e.target.value)} disabled={saving} />
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
          <Button size="sm" disabled={saving} onClick={() => void submitFeedback()}>
            {saving ? 'Đang gửi...' : 'Gửi'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
