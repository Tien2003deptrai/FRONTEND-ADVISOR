import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import TextArea from '@/components/form/input/TextArea'
import MultiSelect from '@/components/form/MultiSelect'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { meetingService } from '@/services/MeetingService'
import { advisorClassService } from '@/services/AdvisorClassService'
import { classMemberService } from '@/services/ClassMemberService'
import { masterDataService } from '@/services/MasterDataService'
import { feedbackService } from '@/services/FeedbackService'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type ClassPop = { _id?: string; class_code?: string; class_name?: string }

type StudentInMeeting = {
  _id: string
  username?: string
  email?: string
  profile?: { full_name?: string }
  student_info?: { student_code?: string }
}

type MeetingRow = {
  _id: string
  class_id?: string | ClassPop
  meeting_time?: string
  meeting_end_time?: string
  notes_summary?: string
  student_user_ids?: (string | StudentInMeeting)[]
}

type FeedbackForMeeting = {
  _id: string
  student_user_id?: string
  feedback_text: string
  rating?: number
  sentiment_label?: string
  submitted_at?: string
  class_display?: string | null
  advisor_display?: string | null
  meeting_time?: string | null
}

type DetailTab = 'students' | 'feedback'

function studentsFromMeeting(m: MeetingRow): StudentInMeeting[] {
  const raw = m.student_user_ids
  if (!Array.isArray(raw)) return []
  return raw.map(item => {
    if (item && typeof item === 'object' && '_id' in item) {
      const u = item as StudentInMeeting
      return { ...u, _id: String(u._id) }
    }
    return { _id: String(item) }
  })
}

type MemberRow = {
  _id: string
  student?: {
    _id?: string
    username?: string
    email?: string
    profile?: { full_name?: string }
  } | null
}

function classLabel(m: MeetingRow): string {
  const c = m.class_id
  if (c && typeof c === 'object') {
    const parts = [c.class_code, c.class_name].filter(Boolean)
    return parts.length ? parts.join(' — ') : String(c._id ?? '')
  }
  return c ? String(c) : '—'
}

function formatDt(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('vi-VN')
  } catch {
    return iso
  }
}

const NOTES_MIN = 30

export default function AdvisorMeetingsPage() {
  const [page, setPage] = useState(1)
  const limit = 15
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState<MeetingRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [classId, setClassId] = useState<string | null>(null)
  const [classDisplayLabel, setClassDisplayLabel] = useState<string | null>(null)
  const [loadingPrep, setLoadingPrep] = useState(false)
  const [studentOptions, setStudentOptions] = useState<{ value: string; text: string }[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [meetingStart, setMeetingStart] = useState('')
  const [meetingEnd, setMeetingEnd] = useState('')
  const [notesRaw, setNotesRaw] = useState('')
  const [termId, setTermId] = useState('')
  const [termOptions, setTermOptions] = useState<{ value: string; label: string }[]>([])
  const [termSelectKey, setTermSelectKey] = useState(0)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailMeeting, setDetailMeeting] = useState<MeetingRow | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('students')
  const [feedbackRows, setFeedbackRows] = useState<FeedbackForMeeting[]>([])
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const loadMeetings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await meetingService.listAdvisorMeetings({ page, limit })
      const data = res.data as { items: MeetingRow[]; pagination: Pagination }
      setRows(data.items ?? [])
      setPagination(data.pagination ?? null)
    } catch {
      toast.error('Không tải được danh sách họp')
      setRows([])
      setPagination(null)
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    void loadMeetings()
  }, [loadMeetings])

  const openDetail = (row: MeetingRow) => {
    setDetailMeeting(row)
    setDetailTab('students')
    setFeedbackRows([])
    setDetailOpen(true)
  }

  const loadFeedbackForMeeting = useCallback(async (meetingId: string) => {
    setFeedbackLoading(true)
    try {
      const res = await feedbackService.listFeedback({
        meeting_id: meetingId,
        page: 1,
        limit: 50,
      })
      const data = res.data as { items?: FeedbackForMeeting[] }
      setFeedbackRows(data.items ?? [])
    } catch {
      toast.error('Không tải được phản hồi')
      setFeedbackRows([])
    } finally {
      setFeedbackLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!detailOpen || !detailMeeting || detailTab !== 'feedback') return
    void loadFeedbackForMeeting(detailMeeting._id)
  }, [detailOpen, detailMeeting, detailTab, loadFeedbackForMeeting])

  const closeDetail = () => {
    setDetailOpen(false)
    setDetailMeeting(null)
    setFeedbackRows([])
  }

  const openCreate = async () => {
    setCreateOpen(true)
    setSelectedStudents([])
    setMeetingStart('')
    setMeetingEnd('')
    setNotesRaw('')
    setTermId('')
    setLoadingPrep(true)
    try {
      const [clsRes, termsRes, activeRes] = await Promise.all([
        advisorClassService.getMyAdvisorClasses({}),
        masterDataService.getTermsList({ page: 1, limit: 50 }),
        masterDataService.getActiveTerm().catch(() => null),
      ])
      const cls = clsRes.data as {
        _id?: string
        class_code?: string
        class_name?: string
      } | null
      setClassId(cls?._id ? String(cls._id) : null)
      const cParts = [cls?.class_code, cls?.class_name].filter(Boolean)
      setClassDisplayLabel(cParts.length ? cParts.join(' — ') : null)

      const tdata = termsRes.data as { items?: { _id: string; term_code?: string; term_name?: string }[] }
      const opts =
        tdata.items?.map(t => ({
          value: t._id,
          label:
            t.term_code && t.term_name
              ? `${t.term_code} — ${t.term_name}`
              : (t.term_code ?? t.term_name ?? 'Học kỳ'),
        })) ?? []
      setTermOptions(opts)

      const active = activeRes?.data as { _id?: string } | undefined
      if (active?._id) {
        setTermId(String(active._id))
      } else {
        setTermId('')
      }
      setTermSelectKey(k => k + 1)

      if (cls?._id) {
        const memRes = await classMemberService.listMembers({ page: 1, limit: 50 })
        const mdata = memRes.data as { items: MemberRow[] }
        const studs = mdata.items ?? []
        setStudentOptions(
          studs.map(r => {
            const name =
              r.student?.profile?.full_name ||
              r.student?.username ||
              (r.student?._id ? 'Sinh viên' : '')
            return {
              value: String(r.student?._id ?? ''),
              text: `${name}${r.student?.email ? ` (${r.student.email})` : ''}`,
            }
          }).filter(o => o.value)
        )
      } else {
        setStudentOptions([])
        toast.message('Chưa có lớp cố vấn — không thể mời sinh viên')
      }
    } catch {
      toast.error('Không tải được dữ liệu form')
    } finally {
      setLoadingPrep(false)
    }
  }

  const submitCreate = async () => {
    if (!classId) {
      toast.error('Thiếu lớp cố vấn')
      return
    }
    if (selectedStudents.length === 0) {
      toast.error('Chọn ít nhất một sinh viên')
      return
    }
    if (!meetingStart || !meetingEnd) {
      toast.error('Nhập thời gian bắt đầu và kết thúc')
      return
    }
    if (notesRaw.trim().length < NOTES_MIN) {
      toast.error(`Nội dung ghi chú tối thiểu ${NOTES_MIN} ký tự (theo API)`)
      return
    }
    const startIso = new Date(meetingStart).toISOString()
    const endIso = new Date(meetingEnd).toISOString()
    if (new Date(endIso) <= new Date(startIso)) {
      toast.error('Giờ kết thúc phải sau giờ bắt đầu')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        class_id: classId,
        student_user_ids: selectedStudents,
        meeting_time: startIso,
        meeting_end_time: endIso,
        notes_raw: notesRaw.trim(),
      }
      if (termId) body.term_id = termId
      const res = await meetingService.createMeeting(body)
      toast.success(res.message || 'Đã tạo cuộc họp')
      setCreateOpen(false)
      setPage(1)
      void loadMeetings()
    } catch {
      toast.error('Tạo họp thất bại')
    } finally {
      setSaving(false)
    }
  }

  const detailStudentList = detailMeeting ? studentsFromMeeting(detailMeeting) : []

  return (
    <>
      <PageMeta
        title="Cuộc họp tư vấn | Advisor"
        description="POST /api/meeting/ — tạo lịch họp với sinh viên"
      />
      <PageBreadcrumb pageTitle="Cuộc họp tư vấn" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Quản lý lịch họp tư vấn với sinh viên trong lớp cố vấn của bạn.
        </p>
        <Button size="sm" onClick={() => void openCreate()}>
          Tạo cuộc họp
        </Button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none">
        {loading ? (
          <p className="py-8 text-gray-500">Đang tải...</p>
        ) : (
          <>
            <Table className="text-left text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-200 dark:border-gray-700">
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Lớp
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Bắt đầu
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Kết thúc
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Thao tác
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <td className="px-3 py-8 text-gray-500" colSpan={4}>
                      Chưa có cuộc họp nào.
                    </td>
                  </TableRow>
                ) : (
                  rows.map(row => (
                    <TableRow key={row._id} className="border-b border-gray-100 dark:border-gray-800">
                      <TableCell className="px-3 py-2">{classLabel(row)}</TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-xs">
                        {formatDt(row.meeting_time)}
                      </TableCell>
                      <TableCell className="px-3 py-2 whitespace-nowrap text-xs">
                        {formatDt(row.meeting_end_time)}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        <Button size="sm" variant="outline" onClick={() => openDetail(row)}>
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {pagination && pagination.total_pages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>
                  Trang {pagination.page}/{pagination.total_pages} — {pagination.total} buổi
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
        isOpen={detailOpen}
        onClose={closeDetail}
        className="max-w-3xl p-6"
      >
        {detailMeeting ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
              Chi tiết cuộc họp
            </h3>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-gray-500">Lớp</dt>
                <dd className="font-medium text-gray-800 dark:text-white/90">
                  {classLabel(detailMeeting)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Thời gian</dt>
                <dd className="text-gray-800 dark:text-white/90">
                  {formatDt(detailMeeting.meeting_time)} → {formatDt(detailMeeting.meeting_end_time)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Tóm tắt</dt>
                <dd className="text-gray-800 dark:text-white/90 whitespace-pre-wrap">
                  {detailMeeting.notes_summary ?? '—'}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setDetailTab('students')}
                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  detailTab === 'students'
                    ? 'bg-brand-500 text-white shadow-theme-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Danh sách sinh viên
              </button>
              <button
                type="button"
                onClick={() => setDetailTab('feedback')}
                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                  detailTab === 'feedback'
                    ? 'bg-brand-500 text-white shadow-theme-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                Phản hồi mới nhất sau họp
              </button>
            </div>

            <div className="mt-4 h-[700px] max-h-[50vh] overflow-auto">
              {detailTab === 'students' ? (
                <Table className="text-left text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                      <TableCell isHeader className="px-3 py-2 font-semibold">
                        Họ tên
                      </TableCell>
                      <TableCell isHeader className="px-3 py-2 font-semibold">
                        Email
                      </TableCell>
                      <TableCell isHeader className="px-3 py-2 font-semibold">
                        Mã SV
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailStudentList.length === 0 ? (
                      <TableRow>
                        <td className="px-3 py-6 text-gray-500" colSpan={3}>
                          Chưa có danh sách sinh viên cho cuộc họp này.
                        </td>
                      </TableRow>
                    ) : (
                      detailStudentList.map(s => (
                        <TableRow
                          key={s._id}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <TableCell className="px-3 py-2">
                            {s.profile?.full_name ?? s.username ?? 'Sinh viên'}
                          </TableCell>
                          <TableCell className="px-3 py-2">{s.email ?? '—'}</TableCell>
                          <TableCell className="px-3 py-2">
                            {s.student_info?.student_code ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              ) : feedbackLoading ? (
                <p className="py-8 text-center text-gray-500">Đang tải phản hồi...</p>
              ) : (
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
                        Nội dung
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbackRows.length === 0 ? (
                      <TableRow>
                        <td className="px-3 py-6 text-gray-500" colSpan={5}>
                          Chưa có phản hồi sau buổi họp này.
                        </td>
                      </TableRow>
                    ) : (
                      feedbackRows.map(fb => (
                        <TableRow
                          key={fb._id}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                            {formatDt(fb.submitted_at)}
                          </TableCell>
                          <TableCell className="max-w-[200px] px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                            <div className="line-clamp-2">{fb.class_display || '—'}</div>
                            <div className="mt-0.5 line-clamp-1 text-gray-500">
                              {fb.advisor_display || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-2">{fb.sentiment_label ?? '—'}</TableCell>
                          <TableCell className="px-3 py-2">
                            {fb.rating != null ? fb.rating : '—'}
                          </TableCell>
                          <TableCell className="max-w-md px-3 py-2">
                            <span className="line-clamp-3 text-gray-700 dark:text-gray-300">
                              {fb.feedback_text}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </>
        ) : null}
      </Modal>

      <Modal
        isOpen={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        className="max-w-lg p-6"
      >
        <h3 className="mb-4 text-lg font-semibold">Tạo cuộc họp tư vấn</h3>
        {loadingPrep ? (
          <p className="text-sm text-gray-500">Đang tải...</p>
        ) : (
          <div className="space-y-4">
            <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-300">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Lớp cố vấn
              </span>
              <span className="mt-1 block font-medium text-gray-900 dark:text-white/90">
                {classDisplayLabel || 'Chưa có lớp'}
              </span>
            </p>
            <div>
              <Label htmlFor="m-term">Học kỳ (tuỳ chọn)</Label>
              <select
                id="m-term"
                key={termSelectKey}
                value={termId}
                onChange={e => setTermId(e.target.value)}
                disabled={saving}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option value="">— Không gửi term_id —</option>
                {termOptions.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="m-start">Bắt đầu</Label>
              <input
                id="m-start"
                type="datetime-local"
                value={meetingStart}
                onChange={e => setMeetingStart(e.target.value)}
                disabled={saving}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <Label htmlFor="m-end">Kết thúc</Label>
              <input
                id="m-end"
                type="datetime-local"
                value={meetingEnd}
                onChange={e => setMeetingEnd(e.target.value)}
                disabled={saving}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <MultiSelect
              label="Sinh viên tham dự"
              options={studentOptions}
              value={selectedStudents}
              onChange={setSelectedStudents}
              disabled={saving || !classId}
              placeholder="Chọn sinh viên trong lớp"
            />
            <div>
              <Label htmlFor="m-notes">Nội dung / ghi chú buổi họp (≥ {NOTES_MIN} ký tự)</Label>
              <TextArea
                rows={5}
                value={notesRaw}
                onChange={v => setNotesRaw(v)}
                disabled={saving}
              />
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={saving} onClick={() => setCreateOpen(false)}>
            Hủy
          </Button>
          <Button size="sm" disabled={saving || loadingPrep} onClick={() => void submitCreate()}>
            {saving ? 'Đang lưu...' : 'Tạo'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
