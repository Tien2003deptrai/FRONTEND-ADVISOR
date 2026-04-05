import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import InputField from '@/components/form/input/InputField'
import Select from '@/components/form/Select'
import MultiSelect from '@/components/form/MultiSelect'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { advisorClassService } from '@/services/AdvisorClassService'
import { classMemberService } from '@/services/ClassMemberService'
import { userService } from '@/services/UserService'
import { studentService } from '@/services/StudentService'
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

type UpsertClassFormState = {
  classCode: string
  className: string
  deptId: string
  majorId: string
  cohortYear: string
  status: 'ACTIVE' | 'INACTIVE'
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
  const [upsertForm, setUpsertForm] = useState<UpsertClassFormState>({
    classCode: '',
    className: '',
    deptId: '',
    majorId: '',
    cohortYear: '',
    status: 'ACTIVE',
  })
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
  const [addModalMemberTotal, setAddModalMemberTotal] = useState<number | null>(null)

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
    } catch {
      toast.error('Đã có lỗi xảy ra')
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
    } catch {
      toast.error('Đã có lỗi xảy ra')
    } finally {
      setLoadingClass(false)
    }
  }

  const fetchOwnClass = async () => {
    setLoadingClass(true)
    try {
      const res = await advisorClassService.getMyAdvisorClasses({})
      setAdvisorClass(res.data as AdvisorClassDoc)
    } catch {
      toast.error('Đã có lỗi xảy ra')
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
    } catch {
      toast.error('Đã có lỗi xảy ra')
      return
    }

    if (advisorClass) {
      const deptLocked =
        isAdmin && advisorOrgDeptId ? advisorOrgDeptId : String(advisorClass.department_id ?? '')
      setUpsertForm({
        classCode: advisorClass.class_code ?? '',
        className: advisorClass.class_name ?? '',
        deptId: deptLocked,
        majorId: advisorClass.major_id ? String(advisorClass.major_id) : MAJOR_NONE,
        cohortYear: advisorClass.cohort_year != null ? String(advisorClass.cohort_year) : '',
        status: advisorClass.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      })
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
      let defDept = ''
      if (isAdmin && selectedAdvisorId) {
        defDept = advisorOrgDeptId
      } else if (isAdvisor && authUser?.org?.department_id) {
        defDept = normalizeRefId(authUser.org.department_id)
      }
      setUpsertForm({
        classCode: '',
        className: '',
        deptId: defDept,
        majorId: MAJOR_NONE,
        cohortYear: '',
        status: 'ACTIVE',
      })
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
    setUpsertForm(prev => ({ ...prev, deptId: v, majorId: MAJOR_NONE }))
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
    if (isAdmin && advisorOrgDeptId && upsertForm.deptId !== advisorOrgDeptId) {
      toast.error('Khoa lớp phải trùng khoa trong hồ sơ cố vấn (backend kiểm tra).')
      return
    }
    if (!upsertForm.classCode.trim() || !upsertForm.deptId) {
      toast.error('Mã lớp và khoa là bắt buộc')
      return
    }
    setSavingClass(true)
    try {
      const body: Record<string, unknown> = {
        advisor_user_id: advId,
        class_code: upsertForm.classCode.trim(),
        department_id: upsertForm.deptId,
        status: upsertForm.status,
      }
      if (upsertForm.className.trim()) body.class_name = upsertForm.className.trim()
      if (upsertForm.majorId && upsertForm.majorId !== MAJOR_NONE) body.major_id = upsertForm.majorId
      if (upsertForm.cohortYear.trim()) {
        const y = parseInt(upsertForm.cohortYear, 10)
        if (!Number.isNaN(y)) body.cohort_year = y
      }
      const res = await advisorClassService.upsertAdvisorClass(body)
      toast.success(res.message || 'Lưu lớp cố vấn thành công')
      setUpsertOpen(false)
      if (isAdmin && selectedAdvisorId) await fetchClassForAdvisor(selectedAdvisorId)
      else if (isAdvisor) await fetchOwnClass()
    } catch {
      toast.error('Đã có lỗi xảy ra')
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
    } catch {
      toast.error('Đã có lỗi xảy ra')
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
    const advisorIdForApi = isAdmin ? selectedAdvisorId : authUser?._id ? String(authUser._id) : ''
    if (!advisorIdForApi) {
      toast.error(
        isAdmin ? 'Chọn cố vấn và đảm bảo đã tải lớp của cố vấn đó' : 'Không xác định được tài khoản cố vấn'
      )
      return
    }
    if (advisorClass && String(advisorClass.advisor_user_id) !== String(advisorIdForApi)) {
      toast.error('Lớp hiện tại không khớp cố vấn. Hãy chọn lại cố vấn hoặc tải lại trang.')
      return
    }
    setSelectedStudentIds([])
    setAddModalMemberTotal(null)
    setLoadingLists(true)
    try {
      const memberBody: Record<string, unknown> = { page: 1, limit: 1 }
      if (isAdmin) memberBody.class_id = currentClassId

      const [memRes, studRes] = await Promise.all([
        classMemberService.listMembers(memberBody),
        studentService.listStudents({
          page: 1,
          limit: 100,
          class_id: currentClassId,
          advisor_user_id: advisorIdForApi,
        }),
      ])

      const memData = memRes.data as { pagination?: { total?: number } }
      setAddModalMemberTotal(memData.pagination?.total ?? 0)

      const studData = studRes.data as { items?: UserItem[] }
      const studs = studData.items ?? []
      setStudentOptions(
        studs.map(s => ({
          value: s._id,
          text: `${s.profile?.full_name ?? s.username} (${s.email})`,
        }))
      )
      setAddMembersOpen(true)
    } catch {
      toast.error('Không tải được danh sách sinh viên phù hợp lớp')
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
    } catch {
      toast.error('Đã có lỗi xảy ra')
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
                  <p className="mt-2 text-sm text-error-500 dark:text-error-400">
                    {ADVISOR_NO_DEPT_MSG}
                  </p>
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
                [
                  'Khóa/cohort',
                  advisorClass.cohort_year != null ? String(advisorClass.cohort_year) : '—',
                ],
                ['Trạng thái', advisorClass.status ?? '—'],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div
                key={k}
                className="flex gap-2 border-b border-gray-100 pb-2 dark:border-gray-800"
              >
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
              value={upsertForm.classCode}
              onChange={e => setUpsertForm(prev => ({ ...prev, classCode: e.target.value }))}
              disabled={savingClass}
            />
          </div>
          <div>
            <Label htmlFor="ac-class-name">Tên lớp</Label>
            <InputField
              id="ac-class-name"
              value={upsertForm.className}
              onChange={e => setUpsertForm(prev => ({ ...prev, className: e.target.value }))}
              disabled={savingClass}
            />
          </div>
          <div>
            <Label>Khoa * (phải trùng khoa của cố vấn)</Label>
            {isAdmin && advisorOrgDeptId ? (
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90">
                {(() => {
                  const d = deptPicklist.find(x => String(x._id) === String(advisorOrgDeptId))
                  return d ? `${d.department_code} — ${d.department_name}` : advisorOrgDeptId
                })()}
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  (khóa theo hồ sơ cố vấn — trùng backend)
                </span>
              </p>
            ) : (
              <Select
                key={`dept-${upsertOpen}-${upsertForm.deptId}`}
                options={deptOptions}
                placeholder="Chọn khoa"
                onChange={v => void handleUpsertDeptChange(v)}
                defaultValue={upsertForm.deptId}
              />
            )}
          </div>
          <div>
            <Label>Ngành (tuỳ chọn)</Label>
            <Select
              key={`maj-${upsertOpen}-${upsertForm.deptId}-${majorPicklist.length}-${upsertForm.majorId || MAJOR_NONE}`}
              options={[{ value: MAJOR_NONE, label: '— Không chọn —' }, ...majorOptions]}
              placeholder="Ngành"
              onChange={v => setUpsertForm(prev => ({ ...prev, majorId: v }))}
              defaultValue={upsertForm.majorId || MAJOR_NONE}
            />
          </div>
          <div>
            <Label htmlFor="ac-cohort">Cohort / năm khóa (tuỳ chọn)</Label>
            <InputField
              id="ac-cohort"
              type="number"
              value={upsertForm.cohortYear}
              onChange={e => setUpsertForm(prev => ({ ...prev, cohortYear: e.target.value }))}
              disabled={savingClass}
            />
          </div>
          <div>
            <Label htmlFor="ac-status">Trạng thái</Label>
            <select
              id="ac-status"
              value={upsertForm.status}
              onChange={e =>
                setUpsertForm(prev => ({
                  ...prev,
                  status: e.target.value as 'ACTIVE' | 'INACTIVE',
                }))
              }
              disabled={savingClass}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={savingClass}
            onClick={() => setUpsertOpen(false)}
          >
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
        className="relative max-h-[70vh] max-w-lg overflow-auto p-6"
      >
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white/90">
          Thêm sinh viên vào lớp
        </h3>
        {advisorClass ? (
          <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/5 dark:text-gray-300">
            <p>
              <span className="text-gray-500 dark:text-gray-400">Lớp: </span>
              <span className="font-medium text-gray-900 dark:text-white/90">
                {advisorClass.class_code}
                {advisorClass.class_name ? ` — ${advisorClass.class_name}` : ''}
              </span>
            </p>
            <p className="mt-1">
              <span className="text-gray-500 dark:text-gray-400">Cố vấn: </span>
              <span className="font-medium">
                {selectedAdvisor?.profile?.full_name ??
                  selectedAdvisor?.username ??
                  (isAdvisor ? authUser?.profile?.full_name ?? authUser?.username : '—')}
              </span>
            </p>
            {addModalMemberTotal != null ? (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                Đang có <strong>{addModalMemberTotal}</strong> thành viên trong lớp (xem đầy đủ ở tab
                «Thành viên lớp»). Chỉ hiển thị sinh viên còn có thể thêm (đúng khoa/ngành, chưa thuộc lớp
                ACTIVE khác, chưa ACTIVE trong lớp này).
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Danh sách lấy từ API <code className="rounded bg-gray-100 px-1 text-[10px] dark:bg-gray-800">POST /students</code> kèm{' '}
          <code className="rounded bg-gray-100 px-1 text-[10px] dark:bg-gray-800">class_id</code> và{' '}
          <code className="rounded bg-gray-100 px-1 text-[10px] dark:bg-gray-800">advisor_user_id</code>.
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
        <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Button
            size="sm"
            variant="outline"
            disabled={savingMembers}
            onClick={() => setAddMembersOpen(false)}
          >
            Hủy
          </Button>
          <Button size="sm" disabled={savingMembers} className="min-w-[120px]" onClick={() => void submitAddMembers()}>
            {savingMembers ? 'Đang thêm...' : 'Thêm'}
          </Button>
        </div>
      </Modal>
    </>
  )
}
