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
import { academicService } from '@/services/AcademicService'
import { dashboardService } from '@/services/DashboardService'
import { masterDataService } from '@/services/MasterDataService'
import { studentService } from '@/services/StudentService'

type AcademicRow = {
  term_id?: string | { _id?: string }
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

  const setFormField = <K extends keyof AcademicFormState>(key: K, value: AcademicFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
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
    setForm({
      ...initialFormState,
      termId: defaultTermId || terms[0]?._id || '',
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
    } catch {
      toast.error('Đã có lỗi xảy ra')
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Bảng từ <code className="text-xs">POST /dashboard/student</code> (academic_trend).
          Thêm/sửa qua <code className="text-xs">POST /academic/submit</code> — theo chuẩn UI: form
          trong modal.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void loadTable()} disabled={loading}>
            Làm mới bảng
          </Button>
          <Button size="sm" onClick={openModal}>
            Nộp / cập nhật
          </Button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Cố vấn học tập của tôi
          </h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void loadMyAdvisor()}
            disabled={advisorLoading}
          >
            {advisorLoading ? 'Đang tải...' : 'Làm mới'}
          </Button>
        </div>
        {!advisorData?.advisor ? (
          <p className="text-sm text-gray-500">
            Chưa có thông tin cố vấn học tập. Vui lòng liên hệ quản trị để gán lớp/cố vấn.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-xs text-gray-500">Họ tên cố vấn</p>
              <p className="font-medium text-gray-800 dark:text-white/90">
                {advisorData.advisor.profile?.full_name || '—'}
              </p>
              <p className="mt-2 text-xs text-gray-500">Email</p>
              <p className="text-sm">{advisorData.advisor.email || '—'}</p>
              <p className="mt-2 text-xs text-gray-500">Mã CB / Chức danh</p>
              <p className="text-sm">
                {advisorData.advisor.advisor_info?.staff_code || '—'} /{' '}
                {advisorData.advisor.advisor_info?.title || '—'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <p className="text-xs text-gray-500">Lớp cố vấn</p>
              <p className="font-medium text-gray-800 dark:text-white/90">
                {advisorData.advisor_class?.class_code || '—'}{' '}
                {advisorData.advisor_class?.class_name
                  ? `— ${advisorData.advisor_class.class_name}`
                  : ''}
              </p>
              <p className="mt-2 text-xs text-gray-500">department_id / major_id</p>
              <p className="break-all text-sm">
                {advisorData.advisor_class?.department_id || '—'} /{' '}
                {advisorData.advisor_class?.major_id || '—'}
              </p>
              <p className="mt-2 text-xs text-gray-500">Trạng thái lớp</p>
              <p className="text-sm">{advisorData.advisor_class?.status || '—'}</p>
            </div>
          </div>
        )}
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
                    Học kỳ (id)
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Ghi nhận
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    GPA HT
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    GPA trước
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Trượt
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Tham dự
                  </TableCell>
                  <TableCell isHeader className="px-3 py-2 font-semibold">
                    Động lực / Stress
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <td className="px-3 py-6 text-gray-500" colSpan={7}>
                      Chưa có bản ghi. Bấm «Nộp / cập nhật».
                    </td>
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
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <TableCell className="max-w-[120px] truncate px-3 py-2 font-mono text-xs">
                          {termIdOf(row) || '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                          {row.recorded_at
                            ? new Date(row.recorded_at).toLocaleString('vi-VN')
                            : '—'}
                        </TableCell>
                        <TableCell className="px-3 py-2">{row.gpa_current ?? '—'}</TableCell>
                        <TableCell className="px-3 py-2">{row.gpa_prev_sem ?? '—'}</TableCell>
                        <TableCell className="px-3 py-2">{row.num_failed ?? '—'}</TableCell>
                        <TableCell className="px-3 py-2">
                          {row.attendance_rate != null
                            ? `${(Number(row.attendance_rate) * 100).toFixed(0)}%`
                            : '—'}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-xs">
                          {row.motivation_score ?? '—'} / {row.stress_level ?? '—'}
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
        className="max-h-[90vh] max-w-2xl overflow-y-auto p-6"
      >
        <h3 className="mb-4 text-lg font-semibold">Nộp / cập nhật dữ liệu học tập</h3>
        <p className="mb-4 text-xs text-gray-500">
          API <code>POST /academic/submit</code> — upsert theo học kỳ. Các trường số là tùy chọn
          ngoài học kỳ.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Học kỳ *</Label>
            <Select
              key={`term-${modalOpen}-${terms.length}-${defaultTermId}`}
              options={termOptions}
              placeholder="Chọn học kỳ"
              onChange={value => setFormField('termId', value)}
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
              disabled={saving}
            />
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
            <Label htmlFor="hrs">Giờ tự học (≥0)</Label>
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
        <div className="mt-6 flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={saving} onClick={() => setModalOpen(false)}>
            Hủy
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void submit()}>
            {saving ? 'Đang gửi...' : 'Gửi'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
