import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import InputField from '@/components/form/input/InputField'
import Select from '@/components/form/Select'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { academicService } from '@/services/AcademicService'
import { dashboardService } from '@/services/DashboardService'
import { masterDataService } from '@/services/MasterDataService'
import { studentService } from '@/services/StudentService'
import {
  CheckLineIcon,
  CloseLineIcon,
  GroupIcon,
  ListIcon,
  PencilIcon,
  TableIcon,
  TimeIcon,
} from '@/icons'

type AcademicRow = {
  term_id?: string | { _id?: string; term_code?: string; term_name?: string }
  gpa_prev_sem?: number | null
  gpa_current?: number | null
  num_failed?: number | null
  attendance_rate?: number | null
  shcvht_participation?: number | null
  study_hours?: number | null
  motivation_score?: number | null
  stress_level?: number | null
  sentiment_score?: number | null
  recorded_at?: string
}

type TermItem = { _id: string; term_code: string; term_name: string }
type MyAdvisorData = {
  advisor?: {
    _id?: string
    email?: string
    profile?: { full_name?: string }
    advisor_info?: { staff_code?: string; title?: string }
  } | null
  advisor_class?: {
    _id?: string
    class_code?: string
    class_name?: string
    department_id?: string
    major_id?: string
    department_display?: string | null
    major_display?: string | null
    status?: string
  } | null
}

type AcademicFormState = {
  termId: string
  gpaPrev: string
  gpaCur: string
  numFailed: string
  attendance: string
  shcvht: string
  studyHours: string
  motivation: string
  stress: string
}

const initialFormState: AcademicFormState = {
  termId: '',
  gpaPrev: '',
  gpaCur: '',
  numFailed: '',
  attendance: '',
  shcvht: '',
  studyHours: '',
  motivation: '',
  stress: '',
}

function termIdOf(row: AcademicRow): string {
  const t = row.term_id
  if (t && typeof t === 'object' && '_id' in t) return String(t._id)
  if (t) return String(t)
  return ''
}

export default function AcademicPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AcademicRow[]>([])
  const [advisorLoading, setAdvisorLoading] = useState(false)
  const [advisorData, setAdvisorData] = useState<MyAdvisorData | null>(null)
  const [terms, setTerms] = useState<TermItem[]>([])
  const [defaultTermId, setDefaultTermId] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<AcademicFormState>(initialFormState)

  const resolveTermLabel = useMemo(() => {
    const byId = new Map(terms.map(t => [t._id, `${t.term_code} — ${t.term_name}`] as const))
    return (row: AcademicRow) => {
      const t = row.term_id
      if (t && typeof t === 'object') {
        const parts = [t.term_code, t.term_name].filter(Boolean)
        if (parts.length) return parts.join(' — ')
      }
      const id = termIdOf(row)
      return (id && byId.get(id)) || '—'
    }
  }, [terms])

  const setFormField = <K extends keyof AcademicFormState>(key: K, value: AcademicFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const gpaPrevByTerm = useMemo(() => {
    const sorted = [...rows].sort(
      (a, b) => new Date(b.recorded_at ?? 0).getTime() - new Date(a.recorded_at ?? 0).getTime()
    )
    const byTerm = new Map<string, number>()
    for (const row of sorted) {
      const termId = termIdOf(row)
      if (!termId || byTerm.has(termId)) continue
      if (row.gpa_prev_sem == null) continue
      byTerm.set(termId, Number(row.gpa_prev_sem))
    }
    return byTerm
  }, [rows])

  const lockedGpaPrevValue = form.termId ? gpaPrevByTerm.get(form.termId) : undefined
  const isGpaPrevLocked = lockedGpaPrevValue != null

  const onTermChange = (termId: string) => {
    const existingGpaPrev = gpaPrevByTerm.get(termId)
    setForm(prev => ({
      ...prev,
      termId,
      gpaPrev: existingGpaPrev != null ? String(existingGpaPrev) : '',
    }))
  }

  const loadTable = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dashboardService.getStudentDashboard({ history_limit: 24 })
      const d = res.data as { academic_trend?: AcademicRow[] }
      setRows(d.academic_trend ?? [])
    } catch {
      toast.error('Đã có lỗi xảy ra')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTerms = useCallback(async () => {
    try {
      const [listRes, activeRes] = await Promise.all([
        masterDataService.getTermsList({ page: 1, limit: 100 }),
        masterDataService.getActiveTerm(),
      ])
      const listData = listRes.data as { items?: TermItem[] }
      setTerms(listData.items ?? [])
      const active = activeRes.data as { _id?: string } | null
      if (active?._id) setDefaultTermId(String(active._id))
    } catch {
      toast.error('Đã có lỗi xảy ra')
    }
  }, [])

  const loadMyAdvisor = useCallback(async () => {
    setAdvisorLoading(true)
    try {
      const res = await studentService.getMyAdvisor()
      setAdvisorData((res.data as MyAdvisorData) ?? null)
    } catch {
      toast.error('Đã có lỗi xảy ra')
      setAdvisorData(null)
    } finally {
      setAdvisorLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTable()
    void loadTerms()
    void loadMyAdvisor()
  }, [loadTable, loadTerms, loadMyAdvisor])

  const openModal = () => {
    const initialTermId = defaultTermId || terms[0]?._id || ''
    const existingGpaPrev = initialTermId ? gpaPrevByTerm.get(initialTermId) : undefined
    setForm({
      ...initialFormState,
      termId: initialTermId,
      gpaPrev: existingGpaPrev != null ? String(existingGpaPrev) : '',
    })
    setModalOpen(true)
  }

  const submit = async () => {
    if (!form.termId) {
      toast.error('Chọn học kỳ (term_id)')
      return
    }
    const body: Record<string, unknown> = { term_id: form.termId }

    const numberFields: Array<{ value: string; key: string; integer?: boolean }> = [
      { value: form.gpaPrev, key: 'gpa_prev_sem' },
      { value: form.gpaCur, key: 'gpa_current' },
      { value: form.numFailed, key: 'num_failed', integer: true },
      { value: form.attendance, key: 'attendance_rate' },
      { value: form.shcvht, key: 'shcvht_participation', integer: true },
      { value: form.studyHours, key: 'study_hours' },
      { value: form.motivation, key: 'motivation_score', integer: true },
      { value: form.stress, key: 'stress_level', integer: true },
    ]

    for (const field of numberFields) {
      const raw = field.value.trim()
      if (!raw) continue
      const n = Number(raw)
      if (Number.isNaN(n) || (field.integer && !Number.isInteger(n))) {
        toast.error('Dữ liệu không hợp lệ')
        return
      }
      body[field.key] = n
    }

    setSaving(true)
    try {
      const res = await academicService.submitAcademic(body)
      toast.success(res.message || 'Đã lưu dữ liệu học tập')
      setModalOpen(false)
      void loadTable()
    } catch (error: any) {
      // Check if error has remaining time info
      if (error?.response?.data?.remainingTime) {
        const remainingMs = error.response.data.remainingTime
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000))
        
        if (remainingSeconds > 0) {
          const days = Math.floor(remainingSeconds / 86400)
          const hours = Math.floor((remainingSeconds % 86400) / 3600)
          const minutes = Math.floor((remainingSeconds % 3600) / 60)
          
          let timeMessage = ''
          if (days > 0) {
            timeMessage = `Còn ${days} ngày ${hours} giờ nữa mới được nộp.`
          } else if (hours > 0) {
            timeMessage = `Còn ${hours} giờ ${minutes} phút nữa mới được nộp.`
          } else {
            timeMessage = `Còn ${minutes} phút nữa mới được nộp.`
          }
          
          toast.error(timeMessage)
        } else {
          toast.error('Không thể nộp bài. Vui lòng thử lại.')
        }
      } else {
        toast.error(error?.response?.data?.message || 'Đã có lỗi xảy ra')
      }
    } finally {
      setSaving(false)
    }
  }

  const termOptions = terms.map(t => ({
    value: t._id,
    label: `${t.term_code} — ${t.term_name}`,
  }))

  return (
    <>
      <PageMeta title="Học tập | Sinh viên" description="Nộp / cập nhật dữ liệu học tập" />
      <PageBreadcrumb pageTitle="Học tập" />

      <section
        className="relative mb-8 overflow-hidden rounded-2xl border border-brand-200/45 bg-gradient-to-br from-brand-50 via-white to-teal-50/35 p-5 shadow-[0_12px_40px_-14px_rgba(70,95,255,0.24)] ring-1 ring-brand-500/10 dark:border-brand-500/20 dark:from-brand-950/45 dark:via-gray-900 dark:to-teal-950/20 dark:ring-brand-400/10 sm:p-6 md:flex md:items-center md:justify-between md:gap-8"
        aria-labelledby="academic-hero-title"
      >
        <div
          className="pointer-events-none absolute -right-14 -top-18 size-44 rounded-full bg-teal-400/15 blur-3xl dark:bg-teal-500/10"
          aria-hidden
        />
        <div className="relative z-10 max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/5 dark:text-brand-300 dark:ring-brand-500/25">
            <TableIcon className="size-3.5 shrink-0" aria-hidden />
            Dữ liệu học tập
          </p>
          <h2
            id="academic-hero-title"
            className="mt-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl"
          >
            Nộp chỉ số theo học kỳ, xem lịch sử và liên hệ cố vấn
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Bảng bên dưới đồng bộ từ dashboard; nút chính mở form gửi{' '}
            <code className="rounded bg-white/80 px-1 text-xs dark:bg-white/10">POST /academic/submit</code>.
          </p>
        </div>
        <div className="relative z-10 mt-5 flex shrink-0 flex-wrap gap-2 md:mt-0">
          <Button
            size="sm"
            variant="outline"
            className="font-semibold"
            onClick={() => void loadTable()}
            disabled={loading}
            startIcon={<ListIcon className="size-4 shrink-0" aria-hidden />}
          >
            Làm mới bảng
          </Button>
          <Button
            size="md"
            variant="primary"
            className="shadow-lg"
            startIcon={<PencilIcon className="size-[18px] shrink-0" aria-hidden />}
            onClick={openModal}
          >
            Nộp / cập nhật
          </Button>
        </div>
      </section>

      <div className="mb-6 rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.1)] ring-1 ring-gray-900/[0.035] transition-shadow duration-200 dark:border-gray-800 dark:bg-gray-900/50 dark:shadow-[0_12px_40px_-16px_rgba(0,0,0,0.45)] dark:ring-white/[0.05] sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white/90">
            <GroupIcon className="size-6 text-brand-500 dark:text-brand-400" aria-hidden />
            Cố vấn học tập của tôi
          </h2>
          <Button
            size="sm"
            variant="outline"
            className="font-semibold"
            onClick={() => void loadMyAdvisor()}
            disabled={advisorLoading}
            startIcon={
              advisorLoading ? (
                <TimeIcon className="size-4 shrink-0 animate-pulse" aria-hidden />
              ) : (
                <ListIcon className="size-4 shrink-0" aria-hidden />
              )
            }
          >
            {advisorLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>
        {!advisorData?.advisor ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-400">
            Chưa có thông tin cố vấn học tập. Vui lòng liên hệ quản trị để gán lớp/cố vấn.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-brand-100/80 bg-gradient-to-br from-brand-50/50 to-white p-4 dark:border-brand-500/20 dark:from-brand-950/25 dark:to-gray-900/50">
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                Họ tên cố vấn
              </p>
              <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                {advisorData.advisor.profile?.full_name || '—'}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Email
              </p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {advisorData.advisor.email || '—'}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Mã CB / Chức danh
              </p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {advisorData.advisor.advisor_info?.staff_code || '—'} /{' '}
                {advisorData.advisor.advisor_info?.title || '—'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200/90 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-white/[0.03]">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Lớp cố vấn
              </p>
              <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
                {advisorData.advisor_class?.class_code || '—'}
                {advisorData.advisor_class?.class_name
                  ? ` — ${advisorData.advisor_class.class_name}`
                  : ''}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Khoa / Ngành
              </p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {advisorData.advisor_class?.department_display || '—'}
              </p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {advisorData.advisor_class?.major_display || '—'}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Trạng thái lớp
              </p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {advisorData.advisor_class?.status || '—'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.1)] ring-1 ring-gray-900/[0.035] dark:border-gray-800 dark:bg-gray-900/50 dark:ring-white/[0.05] sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 text-lg font-bold text-gray-900 dark:border-gray-800 dark:text-white/90">
          <TimeIcon className="size-6 text-brand-500 dark:text-brand-400" aria-hidden />
          Lịch sử học tập
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
                    Học kỳ
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Ghi nhận
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    GPA hiện tại
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    GPA trước
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Môn trượt
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Tỉ lệ tham dự
                  </TableCell>
                  <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Stress (1–5)
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                      Chưa có bản ghi. Bấm <span className="font-semibold text-brand-600">Nộp / cập nhật</span>.
                    </TableCell>
                  </TableRow>
                ) : (
                  [...rows]
                    .sort(
                      (a, b) =>
                        new Date(b.recorded_at ?? 0).getTime() -
                        new Date(a.recorded_at ?? 0).getTime()
                    )
                    .map((row, i) => (
                      <TableRow
                        key={`${termIdOf(row)}-${row.recorded_at}-${i}`}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                      >
                        <TableCell className="max-w-[220px] px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                          {resolveTermLabel(row)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                          {row.recorded_at
                            ? new Date(row.recorded_at).toLocaleString('vi-VN')
                            : '—'}
                        </TableCell>
                        <TableCell className="px-4 py-3 tabular-nums">{row.gpa_current ?? '—'}</TableCell>
                        <TableCell className="px-4 py-3 tabular-nums">{row.gpa_prev_sem ?? '—'}</TableCell>
                        <TableCell className="px-4 py-3 tabular-nums">{row.num_failed ?? '—'}</TableCell>
                        <TableCell className="px-4 py-3 tabular-nums">
                          {row.attendance_rate != null
                            ? `${(Number(row.attendance_rate) * 100).toFixed(0)}%`
                            : '—'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs tabular-nums font-medium text-gray-800 dark:text-gray-200">
                          {row.stress_level ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        className="max-h-[90vh] max-w-2xl overflow-y-auto p-0"
      >
        <div className="border-b border-gray-100 bg-gradient-to-r from-brand-50/95 to-teal-50/40 px-6 py-4 dark:border-gray-800 dark:from-brand-950/50 dark:to-gray-900">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/90 text-brand-600 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/10 dark:text-brand-300 dark:ring-brand-500/25">
              <PencilIcon className="size-5" aria-hidden />
            </span>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white/90">
                Nộp / cập nhật dữ liệu học tập
              </h3>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                API <code className="rounded bg-white/80 px-1 font-mono text-[11px] dark:bg-white/10">POST /academic/submit</code> — upsert theo học kỳ.
              </p>
            </div>
          </div>
        </div>
        <div className="max-h-[calc(90vh-8rem)] overflow-y-auto p-6">
        <p className="mb-4 rounded-xl border border-amber-100/80 bg-amber-50/60 px-3 py-2 text-xs font-medium text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
          Lưu ý: chỉ được cập nhật cách nhau ít nhất <span className="font-bold">7 ngày</span>.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Học kỳ *</Label>
            <Select
              key={`term-${modalOpen}-${terms.length}-${defaultTermId}`}
              options={termOptions}
              placeholder="Chọn học kỳ"
              onChange={onTermChange}
              defaultValue={form.termId}
            />
          </div>
          <div>
            <Label htmlFor="gpa-prev">GPA kỳ trước (0–4)</Label>
            <InputField
              id="gpa-prev"
              type="number"
              min="0"
              max="4"
              step={0.01}
              value={form.gpaPrev}
              onChange={e => setFormField('gpaPrev', e.target.value)}
              disabled={saving || isGpaPrevLocked}
            />
            {isGpaPrevLocked ? (
              <p className="mt-1 text-xs text-gray-500">
                Học kỳ này đã có GPA kỳ trước. Giá trị được giữ nguyên theo dữ liệu cũ.
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="gpa-cur">GPA hiện tại (0–4)</Label>
            <InputField
              id="gpa-cur"
              type="number"
              min="0"
              max="4"
              step={0.01}
              value={form.gpaCur}
              onChange={e => setFormField('gpaCur', e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="failed">Số môn trượt</Label>
            <InputField
              id="failed"
              type="number"
              min="0"
              step={1}
              value={form.numFailed}
              onChange={e => setFormField('numFailed', e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="att">Tỉ lệ tham dự (0–1)</Label>
            <InputField
              id="att"
              type="number"
              min="0"
              max="1"
              step={0.01}
              value={form.attendance}
              onChange={e => setFormField('attendance', e.target.value)}
              disabled={saving}
              placeholder="VD: 0.92"
            />
          </div>
          <div>
            <Label htmlFor="sh">Tham gia SHCVHT (số nguyên ≥0)</Label>
            <InputField
              id="sh"
              type="number"
              min="0"
              step={1}
              value={form.shcvht}
              onChange={e => setFormField('shcvht', e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="hrs">Giờ tự học trong tuần (≥0)</Label>
            <InputField
              id="hrs"
              type="number"
              min="0"
              step={0.5}
              value={form.studyHours}
              onChange={e => setFormField('studyHours', e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="mot">Động lực (1–5)</Label>
            <InputField
              id="mot"
              type="number"
              min="1"
              max="5"
              step={1}
              value={form.motivation}
              onChange={e => setFormField('motivation', e.target.value)}
              disabled={saving}
            />
          </div>
          <div>
            <Label htmlFor="str">Mức stress (1–5)</Label>
            <InputField
              id="str"
              type="number"
              min="1"
              max="5"
              step={1}
              value={form.stress}
              onChange={e => setFormField('stress', e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-6 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            className="font-semibold"
            startIcon={<CloseLineIcon className="size-4 shrink-0" aria-hidden />}
            onClick={() => setModalOpen(false)}
          >
            Hủy
          </Button>
          <Button
            size="sm"
            variant="primary"
            className="font-semibold shadow-md"
            disabled={saving}
            startIcon={
              saving ? (
                <TimeIcon className="size-4 shrink-0 animate-pulse" aria-hidden />
              ) : (
                <CheckLineIcon className="size-4 shrink-0" aria-hidden />
              )
            }
            onClick={() => void submit()}
          >
            {saving ? 'Đang gửi...' : 'Gửi dữ liệu'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
