import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import InputField from '@/components/form/input/InputField'
import Select from '@/components/form/Select'
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
const SENTIMENT_OPTIONS = [
  { value: SENTIMENT_ALL, label: 'Tất cả cảm xúc' },
  { value: 'POSITIVE', label: 'POSITIVE' },
  { value: 'NEUTRAL', label: 'NEUTRAL' },
  { value: 'NEGATIVE', label: 'NEGATIVE' },
]

const emptyFilters = () => ({
  classId: '',
  studentId: '',
  advisorId: '',
  sentiment: SENTIMENT_ALL as string,
})

export default function FeedbackListPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<FeedbackRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)

  const [draft, setDraft] = useState(emptyFilters)
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

  const openDetail = (row: FeedbackRow) => {
    setDetailRow(row)
    setDetailOpen(true)
  }

  const applyFilters = () => {
    setApplied({ ...draft })
    setPage(1)
  }

  return (
    <>
      <PageMeta
        title="Phản hồi | Advisor"
        description="POST /api/feedback/list — xem phản hồi sau meeting"
      />
      <PageBreadcrumb pageTitle="Phản hồi (danh sách)" />

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Lọc theo lớp, sinh viên, cố vấn hoặc cảm xúc (MongoId phải hợp lệ). API:{' '}
          <code className="text-xs">POST /feedback/list</code>.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0">
            <Label htmlFor="fb-class">class_id</Label>
            <InputField
              id="fb-class"
              value={draft.classId}
              onChange={e => setDraft(d => ({ ...d, classId: e.target.value }))}
              placeholder="ObjectId lớp cố vấn"
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="fb-stu">student_user_id</Label>
            <InputField
              id="fb-stu"
              value={draft.studentId}
              onChange={e => setDraft(d => ({ ...d, studentId: e.target.value }))}
              placeholder="ObjectId sinh viên"
            />
          </div>
          <div className="min-w-0">
            <Label htmlFor="fb-adv">advisor_user_id</Label>
            <InputField
              id="fb-adv"
              value={draft.advisorId}
              onChange={e => setDraft(d => ({ ...d, advisorId: e.target.value }))}
              placeholder="ObjectId cố vấn"
            />
          </div>
          <div className="min-w-0">
            <Label>Cảm xúc</Label>
            <Select
              key={`fb-sent-${draft.sentiment}`}
              options={SENTIMENT_OPTIONS}
              placeholder="Chọn cảm xúc"
              onChange={v => setDraft(d => ({ ...d, sentiment: v }))}
              defaultValue={draft.sentiment}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={applyFilters}>
            Áp dụng lọc
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const z = emptyFilters()
              setDraft(z)
              setApplied(z)
              setPage(1)
            }}
          >
            Xóa lọc
          </Button>
        </div>
      </div>

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
                    <td className="px-3 py-6 text-gray-500" colSpan={5}>
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
              <dt className="font-medium text-gray-500">ID</dt>
              <dd className="break-all">{detailRow._id}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">class_id</dt>
              <dd className="break-all">{String(detailRow.class_id ?? '—')}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">student_user_id</dt>
              <dd className="break-all">{String(detailRow.student_user_id ?? '—')}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">advisor_user_id</dt>
              <dd className="break-all">{String(detailRow.advisor_user_id ?? '—')}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">meeting_id</dt>
              <dd className="break-all">{String(detailRow.meeting_id ?? '—')}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Thời gian gửi</dt>
              <dd>{formatDate(detailRow.submitted_at)}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Cảm xúc / điểm</dt>
              <dd>
                {detailRow.sentiment_label ?? '—'}
                {detailRow.feedback_score != null ? ` (score: ${detailRow.feedback_score})` : ''}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Nội dung</dt>
              <dd className="whitespace-pre-wrap text-gray-800 dark:text-white/90">
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
