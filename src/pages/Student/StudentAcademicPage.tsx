import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '../../components/common/PageMeta'
import PageBreadcrumb from '../../components/common/PageBreadCrumb'
import { Modal } from '../../components/ui/modal'
import Button from '../../components/ui/button/Button'
import Label from '../../components/form/Label'
import InputField from '../../components/form/input/InputField'
import Select from '../../components/form/Select'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { academicService } from '../../services/AcademicService'
import { dashboardService } from '../../services/DashboardService'
import { masterDataService } from '../../services/MasterDataService'
import { formatAxiosMessage } from '../../utils/formatAxiosMessage'

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

function termIdOf(row: AcademicRow): string {
  const t = row.term_id
  if (t && typeof t === 'object' && '_id' in t) return String(t._id)
  if (t) return String(t)
  return ''
}

export default function StudentAcademicPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<AcademicRow[]>([])
  const [terms, setTerms] = useState<TermItem[]>([])
  const [defaultTermId, setDefaultTermId] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [termId, setTermId] = useState('')
  const [gpaPrev, setGpaPrev] = useState('')
  const [gpaCur, setGpaCur] = useState('')
  const [numFailed, setNumFailed] = useState('')
  const [attendance, setAttendance] = useState('')
  const [shcvht, setShcvht] = useState('')
  const [studyHours, setStudyHours] = useState('')
  const [motivation, setMotivation] = useState('')
  const [stress, setStress] = useState('')

  const loadTable = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dashboardService.getStudentDashboard({ history_limit: 24 })
      const d = res.data as { academic_trend?: AcademicRow[] }
      setRows(d.academic_trend ?? [])
    } catch (e) {
      toast.error(formatAxiosMessage(e))
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
    } catch (e) {
      toast.error(formatAxiosMessage(e))
    }
  }, [])

  useEffect(() => {
    void loadTable()
    void loadTerms()
  }, [loadTable, loadTerms])

  const openModal = () => {
    setTermId(defaultTermId || terms[0]?._id || '')
    setGpaPrev('')
    setGpaCur('')
    setNumFailed('')
    setAttendance('')
    setShcvht('')
    setStudyHours('')
    setMotivation('')
    setStress('')
    setModalOpen(true)
  }

  const submit = async () => {
    if (!termId) {
      toast.error('Chọn học kỳ (term_id)')
      return
    }
    const body: Record<string, unknown> = { term_id: termId }
    const optFloat = (s: string, key: string, min: number, max: number) => {
      if (!s.trim()) return
      const n = Number(s)
      if (Number.isNaN(n) || n < min || n > max) {
        throw new Error(`${key} không hợp lệ (${min}–${max})`)
      }
      body[key] = n
    }
    const optInt = (s: string, key: string, min: number, max?: number) => {
      if (!s.trim()) return
      const n = parseInt(s, 10)
      if (Number.isNaN(n) || n < min || (max != null && n > max)) {
        throw new Error(
          max != null ? `${key} phải từ ${min} đến ${max}` : `${key} phải là số nguyên ≥ ${min}`
        )
      }
      body[key] = n
    }
    try {
      optFloat(gpaPrev, 'gpa_prev_sem', 0, 4)
      optFloat(gpaCur, 'gpa_current', 0, 4)
      optInt(numFailed, 'num_failed', 0)
      optFloat(attendance, 'attendance_rate', 0, 1)
      optInt(shcvht, 'shcvht_participation', 0)
      optFloat(studyHours, 'study_hours', 0, 1e6)
      optInt(motivation, 'motivation_score', 1, 5)
      optInt(stress, 'stress_level', 1, 5)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Dữ liệu không hợp lệ')
      return
    }

    setSaving(true)
    try {
      const res = await academicService.submitAcademic(body)
      toast.success(res.message || 'Đã lưu dữ liệu học tập')
      setModalOpen(false)
      void loadTable()
    } catch (e) {
      toast.error(formatAxiosMessage(e))
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
          Bảng từ <code className="text-xs">POST /dashboard/student</code> (academic_trend). Thêm/sửa qua{' '}
          <code className="text-xs">POST /academic/submit</code> — theo chuẩn UI: form trong modal.
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
          API <code>POST /academic/submit</code> — upsert theo học kỳ. Các trường số là tùy chọn ngoài học kỳ.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Học kỳ *</Label>
            <Select
              key={`term-${modalOpen}-${terms.length}-${defaultTermId}`}
              options={termOptions}
              placeholder="Chọn học kỳ"
              onChange={setTermId}
              defaultValue={termId}
            />
          </div>
          <div>
            <Label htmlFor="gpa-prev">GPA kỳ trước (0–4)</Label>
            <InputField id="gpa-prev" value={gpaPrev} onChange={e => setGpaPrev(e.target.value)} disabled={saving} />
          </div>
          <div>
            <Label htmlFor="gpa-cur">GPA hiện tại (0–4)</Label>
            <InputField id="gpa-cur" value={gpaCur} onChange={e => setGpaCur(e.target.value)} disabled={saving} />
          </div>
          <div>
            <Label htmlFor="failed">Số môn trượt</Label>
            <InputField id="failed" value={numFailed} onChange={e => setNumFailed(e.target.value)} disabled={saving} />
          </div>
          <div>
            <Label htmlFor="att">Tỉ lệ tham dự (0–1)</Label>
            <InputField id="att" value={attendance} onChange={e => setAttendance(e.target.value)} disabled={saving} placeholder="VD: 0.92" />
          </div>
          <div>
            <Label htmlFor="sh">Tham gia SHCVHT (số nguyên ≥0)</Label>
            <InputField id="sh" value={shcvht} onChange={e => setShcvht(e.target.value)} disabled={saving} />
          </div>
          <div>
            <Label htmlFor="hrs">Giờ tự học (≥0)</Label>
            <InputField id="hrs" value={studyHours} onChange={e => setStudyHours(e.target.value)} disabled={saving} />
          </div>
          <div>
            <Label htmlFor="mot">Động lực (1–5)</Label>
            <InputField id="mot" value={motivation} onChange={e => setMotivation(e.target.value)} disabled={saving} />
          </div>
          <div>
            <Label htmlFor="str">Mức stress (1–5)</Label>
            <InputField id="str" value={stress} onChange={e => setStress(e.target.value)} disabled={saving} />
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
