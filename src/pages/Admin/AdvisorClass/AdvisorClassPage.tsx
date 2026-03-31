import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import InputField from '@/components/form/input/InputField'
import Select from '@/components/form/Select'
import MultiSelect from '@/components/form/MultiSelect'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { advisorClassService } from '@/services/AdvisorClassService'
import { classMemberService } from '@/services/ClassMemberService'
import { userService } from '@/services/UserService'
import { masterDataService } from '@/services/MasterDataService'
import useAuthStore from '@/stores/authStore'

type TabKey = 'class' | 'members'

type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

type UserItem = {
  _id: string
  username: string
  email: string
  profile?: { full_name?: string }
  org?: {
    department_id?: string | { _id?: string }
    major_id?: string | { _id?: string }
  }
  role: string
}

type DepartmentItem = {
  _id: string
  department_code: string
  department_name: string
}

type MajorItem = {
  _id: string
  major_code: string
  major_name: string
}

type AdvisorClassDoc = {
  _id: string
  class_code: string
  class_name?: string
  advisor_user_id: string
  department_id?: string
  major_id?: string
  cohort_year?: number
  status?: string
}

type MemberRow = {
  _id: string
  class_id: string
  student_user_id: string
  joined_at?: string
  status: string
  student?: {
    _id: string
    username: string
    email: string
    profile?: { full_name?: string }
    student_info?: { student_code?: string }
  } | null
}

function formatAxiosMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message ?? err.message
  }
  return 'Đã có lỗi xảy ra'
}

function isNotFound(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 404
}

const MAJOR_NONE = '__none__'

/** ObjectId hoặc object populate từ Mongo → chuỗi id */
function normalizeRefId(raw: unknown): string {
  if (raw == null || raw === '') return ''
  if (typeof raw === 'object' && raw !== null && '_id' in raw) {
    return String((raw as { _id: unknown })._id)
  }
  return String(raw)
}

const ADVISOR_NO_DEPT_MSG =
  'Cố vấn chưa có khoa trong hồ sơ (org.department_id). Khi tạo cố vấn phải gửi đủ org.department_id và org.major_id (cùng lúc). Sửa user trong DB hoặc tạo lại tài khoản cố vấn kèm khoa/ngành — xem admin-provisioning-flow.'

export default function AdvisorClassPage() {
  const authUser = useAuthStore(s => s.user)
  const isAdmin = authUser?.role === 'ADMIN'
  const isAdvisor = authUser?.role === 'ADVISOR'

  const [tab, setTab] = useState<TabKey>('class')
  const [loadingClass, setLoadingClass] = useState(false)
  const [loadingLists, setLoadingLists] = useState(false)

  const [advisors, setAdvisors] = useState<UserItem[]>([])
  const [selectedAdvisorId, setSelectedAdvisorId] = useState('')
  const [advisorClass, setAdvisorClass] = useState<AdvisorClassDoc | null>(null)

  const [classDetailOpen, setClassDetailOpen] = useState(false)

  const [upsertOpen, setUpsertOpen] = useState(false)
  const [savingClass, setSavingClass] = useState(false)
  const [upClassCode, setUpClassCode] = useState('')
  const [upClassName, setUpClassName] = useState('')
  const [upDeptId, setUpDeptId] = useState('')
  const [upMajorId, setUpMajorId] = useState('')
  const [upCohortYear, setUpCohortYear] = useState('')
  const [upStatus, setUpStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE')
  const [deptPicklist, setDeptPicklist] = useState<DepartmentItem[]>([])
  const [majorPicklist, setMajorPicklist] = useState<MajorItem[]>([])

  const [memberPage, setMemberPage] = useState(1)
  const memberLimit = 20
  const [memberPagination, setMemberPagination] = useState<Pagination | null>(null)
  const [members, setMembers] = useState<MemberRow[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [savingMembers, setSavingMembers] = useState(false)
  const [studentOptions, setStudentOptions] = useState<{ value: string; text: string }[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  const selectedAdvisor = useMemo(
    () => advisors.find(a => a._id === selectedAdvisorId),
    [advisors, selectedAdvisorId]
  )
  const advisorOrgDeptId = useMemo(
    () => normalizeRefId(selectedAdvisor?.org?.department_id),
    [selectedAdvisor]
  )

  const currentClassId = advisorClass?._id ?? null

  const loadAdvisors = useCallback(async () => {
    if (!isAdmin) return
    try {
      const res = await userService.getUsers({ role: 'ADVISOR', limit: 100, page: 1 })
      const data = res.data as { items?: UserItem[] }
      setAdvisors(data.items ?? [])
    } catch (e) {
      toast.error(formatAxiosMessage(e))
    }
  }, [isAdmin])

  useEffect(() => {
    void loadAdvisors()
  }, [loadAdvisors])

  const fetchClassForAdvisor = async (advisorId: string) => {
    if (!advisorId) {
      setAdvisorClass(null)
      return
    }
    setLoadingClass(true)
    try {
      const res = await advisorClassService.getMyAdvisorClasses({ advisor_user_id: advisorId })
      setAdvisorClass(res.data as AdvisorClassDoc)
    } catch (e) {
      if (isNotFound(e)) setAdvisorClass(null)
      else toast.error(formatAxiosMessage(e))
    } finally {
      setLoadingClass(false)
    }
  }

  const fetchOwnClass = async () => {
    setLoadingClass(true)
    try {
      const res = await advisorClassService.getMyAdvisorClasses({})
      setAdvisorClass(res.data as AdvisorClassDoc)
    } catch (e) {
      if (isNotFound(e)) setAdvisorClass(null)
      else toast.error(formatAxiosMessage(e))
    } finally {
      setLoadingClass(false)
    }
  }

  useEffect(() => {
    if (isAdvisor) void fetchOwnClass()
  }, [isAdvisor])

  useEffect(() => {
    if (isAdmin && selectedAdvisorId) void fetchClassForAdvisor(selectedAdvisorId)
    if (isAdmin && !selectedAdvisorId) setAdvisorClass(null)
  }, [isAdmin, selectedAdvisorId])

  const openUpsertModal = async () => {
    const advId = isAdmin ? selectedAdvisorId : authUser?._id
    if (!advId) {
      toast.error(isAdmin ? 'Chọn cố vấn trước' : 'Không xác định được tài khoản')
      return
    }
    if (isAdmin && selectedAdvisorId && !advisorOrgDeptId) {
      toast.error(ADVISOR_NO_DEPT_MSG)
      return
    }
    try {
      const resDept = await masterDataService.getDepartmentsList({ page: 1, limit: 100 })
      const d = resDept.data as { items: DepartmentItem[] }
      setDeptPicklist(d.items ?? [])
    } catch (e) {
      toast.error(formatAxiosMessage(e))
      return
    }

    if (advisorClass) {
      setUpClassCode(advisorClass.class_code ?? '')
      setUpClassName(advisorClass.class_name ?? '')
      const deptLocked = isAdmin && advisorOrgDeptId ? advisorOrgDeptId : String(advisorClass.department_id ?? '')
      setUpDeptId(deptLocked)
      setUpMajorId(advisorClass.major_id ? String(advisorClass.major_id) : MAJOR_NONE)
      setUpCohortYear(advisorClass.cohort_year != null ? String(advisorClass.cohort_year) : '')
      setUpStatus((advisorClass.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE')
      if (advisorClass.department_id) {
        try {
          const rm = await masterDataService.getMajorsList({
            department_id: advisorClass.department_id,
            limit: 100,
            page: 1,
          })
          const md = rm.data as { items: MajorItem[] }
          setMajorPicklist(md.items ?? [])
        } catch {
          setMajorPicklist([])
        }
      } else setMajorPicklist([])
    } else {
      setUpClassCode('')
      setUpClassName('')
      let defDept = ''
      if (isAdmin && selectedAdvisorId) {
        defDept = advisorOrgDeptId
      } else if (isAdvisor && authUser?.org?.department_id) {
        defDept = normalizeRefId(authUser.org.department_id)
      }
      setUpDeptId(defDept)
      setUpMajorId(MAJOR_NONE)
      setUpCohortYear('')
      setUpStatus('ACTIVE')
      if (defDept) {
        try {
          const rm = await masterDataService.getMajorsList({
            department_id: defDept,
            limit: 100,
            page: 1,
          })
          const md = rm.data as { items: MajorItem[] }
          setMajorPicklist(md.items ?? [])
        } catch {
          setMajorPicklist([])
        }
      } else setMajorPicklist([])
    }

    setUpsertOpen(true)
  }

  const handleUpsertDeptChange = async (v: string) => {
    setUpDeptId(v)
    setUpMajorId(MAJOR_NONE)
    if (!v) {
      setMajorPicklist([])
      return
    }
    try {
      const rm = await masterDataService.getMajorsList({
        department_id: v,
        limit: 100,
        page: 1,
      })
      const md = rm.data as { items: MajorItem[] }
      setMajorPicklist(md.items ?? [])
    } catch {
      setMajorPicklist([])
    }
  }

  const submitUpsert = async () => {
    const advId = isAdmin ? selectedAdvisorId : authUser?._id
    if (!advId) {
      toast.error('Thiếu cố vấn')
      return
    }
    if (isAdmin && !advisorOrgDeptId) {
      toast.error(ADVISOR_NO_DEPT_MSG)
      return
    }
    if (isAdmin && advisorOrgDeptId && upDeptId !== advisorOrgDeptId) {
      toast.error('Khoa lớp phải trùng khoa trong hồ sơ cố vấn (backend kiểm tra).')
      return
    }
    if (!upClassCode.trim() || !upDeptId) {
      toast.error('Mã lớp và khoa là bắt buộc')
      return
    }
    setSavingClass(true)
    try {
      const body: Record<string, unknown> = {
        advisor_user_id: advId,
        class_code: upClassCode.trim(),
        department_id: upDeptId,
        status: upStatus,
      }
      if (upClassName.trim()) body.class_name = upClassName.trim()
      if (upMajorId && upMajorId !== MAJOR_NONE) body.major_id = upMajorId
      if (upCohortYear.trim()) {
        const y = parseInt(upCohortYear, 10)
        if (!Number.isNaN(y)) body.cohort_year = y
      }
      const res = await advisorClassService.upsertAdvisorClass(body)
      toast.success(res.message || 'Lưu lớp cố vấn thành công')
      setUpsertOpen(false)
      if (isAdmin && selectedAdvisorId) await fetchClassForAdvisor(selectedAdvisorId)
      else if (isAdvisor) await fetchOwnClass()
    } catch (e) {
      toast.error(formatAxiosMessage(e))
    } finally {
      setSavingClass(false)
    }
  }

  const loadMembers = useCallback(async () => {
    if (!currentClassId) {
      setMembers([])
      setMemberPagination(null)
      return
    }
    setLoadingMembers(true)
    try {
      const body: Record<string, unknown> = { page: memberPage, limit: memberLimit }
      if (isAdmin) body.class_id = currentClassId
      const res = await classMemberService.listMembers(body)
      const data = res.data as { items: MemberRow[]; pagination: Pagination }
      setMembers(data.items ?? [])
      setMemberPagination(data.pagination ?? null)
    } catch (e) {
      toast.error(formatAxiosMessage(e))
    } finally {
      setLoadingMembers(false)
    }
  }, [currentClassId, isAdmin, memberPage])

  useEffect(() => {
    if (tab === 'members') void loadMembers()
  }, [tab, loadMembers])

  useEffect(() => {
    setMemberPage(1)
  }, [currentClassId])

  const openAddMembersModal = async () => {
    if (!currentClassId) {
      toast.error('Chưa có lớp — tạo lớp ở tab Lớp cố vấn trước')
      return
    }
    setSelectedStudentIds([])
    setLoadingLists(true)
    try {
      const res = await userService.getUsers({ role: 'STUDENT', limit: 100, page: 1 })
      const data = res.data as { items: UserItem[] }
      let studs = data.items ?? []
      if (advisorClass?.department_id) {
        const did = normalizeRefId(advisorClass.department_id)
        studs = studs.filter(s => normalizeRefId(s.org?.department_id) === did)
      }
      setStudentOptions(
        studs.map(s => ({
          value: s._id,
          text: `${s.profile?.full_name ?? s.username} (${s.email})`,
        }))
      )
      setAddMembersOpen(true)
    } catch (e) {
      toast.error(formatAxiosMessage(e))
    } finally {
      setLoadingLists(false)
    }
  }

  const submitAddMembers = async () => {
    if (!currentClassId || selectedStudentIds.length === 0) {
      toast.error('Chọn ít nhất một sinh viên')
      return
    }
    setSavingMembers(true)
    try {
      const res = await classMemberService.addMembers({
        class_id: currentClassId,
        student_user_ids: selectedStudentIds,
      })
      toast.success(res.message || 'Đã thêm thành viên')
      setAddMembersOpen(false)
      setSelectedStudentIds([])
      void loadMembers()
    } catch (e) {
      toast.error(formatAxiosMessage(e))
    } finally {
      setSavingMembers(false)
    }
  }

  const openClassDetail = () => {
    if (!advisorClass) return
    setClassDetailOpen(true)
  }

  const advisorOptions = advisors.map(a => ({
    value: a._id,
    label: `${a.profile?.full_name ?? a.username} (${a.email})`,
  }))

  const deptOptions = deptPicklist.map(d => ({
    value: d._id,
    label: `${d.department_code} — ${d.department_name}`,
  }))

  const majorOptions = majorPicklist.map(m => ({
    value: m._id,
    label: `${m.major_code} — ${m.major_name}`,
  }))

  const canManageClass = isAdmin
  const canManageMembers = isAdmin || isAdvisor
  /** ADMIN: đủ chọn cố vấn và cố vấn đã có khoa trong org (backend bắt buộc). */
  const adminCanUpsertClass = isAdmin && !!selectedAdvisorId && !!advisorOrgDeptId

  return (
    <>
      <PageMeta
        title="Lớp cố vấn & thành viên | Advisor"
        description="Quản lý lớp cố vấn và danh sách sinh viên trong lớp"
      />
      <PageBreadcrumb pageTitle="Lớp cố vấn & thành viên" />

      <div className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab('class')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'class'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Lớp cố vấn
            </button>
            <button
              type="button"
              onClick={() => setTab('members')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === 'members'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              Thành viên lớp
            </button>
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            API: <code className="text-xs">POST /api/advisor-classes</code> (ADMIN, tạo/cập nhật),{' '}
            <code className="text-xs">POST /api/advisor-classes/my</code> (xem lớp),{' '}
            <code className="text-xs">POST /api/class-members/list</code>,{' '}
            <code className="text-xs">/add</code>. Chi tiết: <code>docs/admin-apis.md</code>.
          </p>
        </div>

        {tab === 'class' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
            {isAdmin && (
              <div className="mb-4 max-w-xl">
                <Label>Chọn cố vấn</Label>
                <Select
                  key={`adv-${advisors.length}`}
                  options={advisorOptions}
                  placeholder="Chọn tài khoản ADVISOR"
                  onChange={setSelectedAdvisorId}
                  defaultValue={selectedAdvisorId}
                />
                {selectedAdvisorId && !advisorOrgDeptId ? (
                  <p className="mt-2 text-sm text-error-500 dark:text-error-400">{ADVISOR_NO_DEPT_MSG}</p>
                ) : null}
              </div>
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Thông tin lớp
              </h2>
              {canManageClass && (
                <Button
                  size="sm"
                  onClick={() => void openUpsertModal()}
                  disabled={isAdmin && !adminCanUpsertClass}
                >
                  {advisorClass ? 'Cập nhật lớp' : 'Tạo lớp'}
                </Button>
              )}
            </div>

            {loadingClass ? (
              <p className="py-6 text-gray-500">Đang tải...</p>
            ) : (
              <Table className="text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-gray-700">
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Mã lớp
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Tên lớp
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Trạng thái
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Thao tác
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advisorClass ? (
                    <TableRow className="border-b border-gray-100 dark:border-gray-800">
                      <TableCell className="px-3 py-2">{advisorClass.class_code}</TableCell>
                      <TableCell className="px-3 py-2">{advisorClass.class_name ?? '—'}</TableCell>
                      <TableCell className="px-3 py-2">{advisorClass.status ?? '—'}</TableCell>
                      <TableCell className="px-3 py-2">
                        <Button size="sm" variant="outline" onClick={openClassDetail}>
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <td className="px-3 py-6 text-gray-500" colSpan={4}>
                        {isAdmin && !selectedAdvisorId
                          ? 'Chọn cố vấn để xem hoặc tạo lớp.'
                          : 'Chưa có lớp cố vấn. ADMIN có thể bấm «Tạo lớp».'}
                      </td>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}

            {isAdvisor && !canManageClass && (
              <p className="mt-2 text-sm text-gray-500">
                Cố vấn chỉ xem lớp của mình. Tạo/cập nhật lớp do ADMIN thực hiện (theo API).
              </p>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Danh sách thành viên
              </h2>
              {canManageMembers && (
                <Button
                  size="sm"
                  onClick={() => void openAddMembersModal()}
                  disabled={!currentClassId}
                >
                  Thêm sinh viên
                </Button>
              )}
            </div>

            {!currentClassId ? (
              <p className="text-sm text-gray-500">
                Chưa có <code>class_id</code>. Hãy tạo/xem lớp ở tab «Lớp cố vấn» trước.
              </p>
            ) : loadingMembers ? (
              <p className="py-6 text-gray-500">Đang tải...</p>
            ) : (
              <>
                <Table className="text-left text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                      <TableCell isHeader className="px-3 py-2 font-semibold">
                        Sinh viên
                      </TableCell>
                      <TableCell isHeader className="px-3 py-2 font-semibold">
                        Email
                      </TableCell>
                      <TableCell isHeader className="px-3 py-2 font-semibold">
                        Mã SV
                      </TableCell>
                      <TableCell isHeader className="px-3 py-2 font-semibold">
                        Trạng thái
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.length === 0 ? (
                      <TableRow>
                        <td className="px-3 py-6 text-gray-500" colSpan={4}>
                          Chưa có thành viên.
                        </td>
                      </TableRow>
                    ) : (
                      members.map(row => (
                        <TableRow
                          key={row._id}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <TableCell className="px-3 py-2">
                            {row.student?.profile?.full_name ?? row.student?.username ?? '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2">{row.student?.email ?? '—'}</TableCell>
                          <TableCell className="px-3 py-2">
                            {row.student?.student_info?.student_code ?? '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2">{row.status}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {memberPagination && memberPagination.total_pages > 1 && (
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      Trang {memberPagination.page}/{memberPagination.total_pages} —{' '}
                      {memberPagination.total} thành viên
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={memberPage <= 1}
                        onClick={() => setMemberPage(p => Math.max(1, p - 1))}
                      >
                        Trước
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={memberPage >= memberPagination.total_pages}
                        onClick={() => setMemberPage(p => p + 1)}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={classDetailOpen}
        onClose={() => setClassDetailOpen(false)}
        className="max-w-lg p-6"
      >
        <h3 className="mb-4 text-lg font-semibold">Chi tiết lớp cố vấn</h3>
        {advisorClass && (
          <dl className="space-y-2 text-sm">
            {(
              [
                ['ID', advisorClass._id],
                ['Mã lớp', advisorClass.class_code],
                ['Tên', advisorClass.class_name ?? '—'],
                ['Cố vấn (user)', String(advisorClass.advisor_user_id)],
                ['department_id', String(advisorClass.department_id ?? '—')],
                ['major_id', advisorClass.major_id ? String(advisorClass.major_id) : '—'],
                ['Khóa/cohort', advisorClass.cohort_year != null ? String(advisorClass.cohort_year) : '—'],
                ['Trạng thái', advisorClass.status ?? '—'],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="flex gap-2 border-b border-gray-100 pb-2 dark:border-gray-800">
                <dt className="w-32 shrink-0 font-medium text-gray-500">{k}</dt>
                <dd className="break-all text-gray-800 dark:text-white/90">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-6 flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setClassDetailOpen(false)}>
            Đóng
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={upsertOpen}
        onClose={() => !savingClass && setUpsertOpen(false)}
        className="max-w-md p-6"
      >
        <h3 className="mb-4 text-lg font-semibold">
          {advisorClass ? 'Cập nhật lớp cố vấn' : 'Tạo lớp cố vấn'}
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="ac-class-code">Mã lớp *</Label>
            <InputField
              id="ac-class-code"
              value={upClassCode}
              onChange={e => setUpClassCode(e.target.value)}
              disabled={savingClass}
            />
          </div>
          <div>
            <Label htmlFor="ac-class-name">Tên lớp</Label>
            <InputField
              id="ac-class-name"
              value={upClassName}
              onChange={e => setUpClassName(e.target.value)}
              disabled={savingClass}
            />
          </div>
          <div>
            <Label>Khoa * (phải trùng khoa của cố vấn)</Label>
            {isAdmin && advisorOrgDeptId ? (
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90">
                {(() => {
                  const d = deptPicklist.find(x => String(x._id) === String(advisorOrgDeptId))
                  return d
                    ? `${d.department_code} — ${d.department_name}`
                    : advisorOrgDeptId
                })()}
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  (khóa theo hồ sơ cố vấn — trùng backend)
                </span>
              </p>
            ) : (
              <Select
                key={`dept-${upsertOpen}-${upDeptId}`}
                options={deptOptions}
                placeholder="Chọn khoa"
                onChange={v => void handleUpsertDeptChange(v)}
                defaultValue={upDeptId}
              />
            )}
          </div>
          <div>
            <Label>Ngành (tuỳ chọn)</Label>
            <Select
              key={`maj-${upsertOpen}-${upDeptId}-${majorPicklist.length}-${upMajorId || MAJOR_NONE}`}
              options={[{ value: MAJOR_NONE, label: '— Không chọn —' }, ...majorOptions]}
              placeholder="Ngành"
              onChange={setUpMajorId}
              defaultValue={upMajorId || MAJOR_NONE}
            />
          </div>
          <div>
            <Label htmlFor="ac-cohort">Cohort / năm khóa (tuỳ chọn)</Label>
            <InputField
              id="ac-cohort"
              type="number"
              value={upCohortYear}
              onChange={e => setUpCohortYear(e.target.value)}
              disabled={savingClass}
            />
          </div>
          <div>
            <Label htmlFor="ac-status">Trạng thái</Label>
            <select
              id="ac-status"
              value={upStatus}
              onChange={e => setUpStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
              disabled={savingClass}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={savingClass} onClick={() => setUpsertOpen(false)}>
            Hủy
          </Button>
          <Button size="sm" disabled={savingClass} onClick={() => void submitUpsert()}>
            {savingClass ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={addMembersOpen}
        onClose={() => !savingMembers && setAddMembersOpen(false)}
        className="max-w-lg p-6"
      >
        <h3 className="mb-4 text-lg font-semibold">Thêm sinh viên vào lớp</h3>
        <p className="mb-3 text-xs text-gray-500">
          Chỉ sinh viên đúng khoa (và ngành nếu lớp có ngành) mới được backend chấp nhận. Danh
          sách đã lọc sơ theo khoa của lớp.
        </p>
        {loadingLists ? (
          <p className="text-sm text-gray-500">Đang tải danh sách sinh viên...</p>
        ) : (
          <MultiSelect
            label="Chọn sinh viên"
            options={studentOptions}
            value={selectedStudentIds}
            onChange={setSelectedStudentIds}
            disabled={savingMembers}
            placeholder="Chọn một hoặc nhiều"
          />
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button size="sm" variant="outline" disabled={savingMembers} onClick={() => setAddMembersOpen(false)}>
            Hủy
          </Button>
          <Button size="sm" disabled={savingMembers} onClick={() => void submitAddMembers()}>
            {savingMembers ? 'Đang thêm...' : 'Thêm'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
