import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'
import { toast } from 'sonner'
import PageMeta from '@/components/common/PageMeta'
import PageBreadcrumb from '@/components/common/PageBreadCrumb'
import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { dashboardService } from '@/services/DashboardService'

type AcademicRow = {
  term_id?: string | { _id?: string; term_code?: string; term_name?: string }
  gpa_prev_sem?: number | null
  gpa_current?: number | null
  num_failed?: number | null
  attendance_rate?: number | null
  sentiment_score?: number | null
  recorded_at?: string
}

type SentimentAgg = {
  _id: { month?: string; sentiment_label?: string }
  count: number
}

type StudentDashboardData = {
  student_user_id?: string
  risk_score?: number | null
  risk_label?: string | null
  risk_term_code?: string | null
  academic_trend: AcademicRow[]
  sentiment_trend: SentimentAgg[]
}

function termLabel(row: AcademicRow): string {
  const t = row.term_id
  if (t && typeof t === 'object') {
    const parts = [t.term_code, t.term_name].filter(Boolean)
    if (parts.length) return parts.join(' — ')
  }
  return '—'
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<StudentDashboardData | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await dashboardService.getStudentDashboard({
        history_limit: 12,
        risk_threshold: 0.7,
      })
      setData(res.data as StudentDashboardData)
    } catch {
      toast.error('Đã có lỗi xảy ra')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const gpaChart = useMemo(() => {
    const rows = [...(data?.academic_trend ?? [])].sort(
      (a, b) => new Date(a.recorded_at ?? 0).getTime() - new Date(b.recorded_at ?? 0).getTime()
    )
    const categories = rows.map((r, i) =>
      r.recorded_at ? new Date(r.recorded_at).toLocaleDateString('vi-VN') : `#${i + 1}`
    )
    const series = [
      {
        name: 'GPA hiện tại',
        data: rows.map(r => (r.gpa_current != null ? Number(r.gpa_current) : null)),
      },
      {
        name: 'GPA kỳ trước',
        data: rows.map(r => (r.gpa_prev_sem != null ? Number(r.gpa_prev_sem) : null)),
      },
    ]
    return {
      options: {
        chart: { toolbar: { show: false }, fontFamily: 'inherit' },
        xaxis: { categories, labels: { rotate: -35 } },
        stroke: { curve: 'smooth', width: 2 },
        dataLabels: { enabled: false },
        legend: { position: 'top' as const },
        yaxis: { min: 0, max: 4, tickAmount: 4 },
      },
      series,
    }
  }, [data?.academic_trend])

  const sentimentChart = useMemo(() => {
    const raw = data?.sentiment_trend ?? []
    const months = Array.from(
      new Set(raw.map(r => r._id?.month).filter(Boolean))
    ).sort() as string[]
    const labels = ['POSITIVE', 'NEUTRAL', 'NEGATIVE']
    const series = labels.map(lab => ({
      name: lab,
      data: months.map(m => {
        const row = raw.find(r => r._id?.month === m && r._id?.sentiment_label === lab)
        return row ? row.count : 0
      }),
    }))
    return {
      months,
      options: {
        chart: { stacked: true, toolbar: { show: false }, fontFamily: 'inherit' },
        xaxis: { categories: months },
        plotOptions: { bar: { horizontal: false, columnWidth: '55%' } },
        dataLabels: { enabled: false },
        legend: { position: 'top' as const },
      },
      series,
    }
  }, [data?.sentiment_trend])

  return (
    <>
      <PageMeta title="Dashboard sinh viên | Advisor" description="Risk, học tập, cảm xúc" />
      <PageBreadcrumb pageTitle="Dashboard sinh viên" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Tổng quan rủi ro, điểm học tập và phản hồi của bạn. Dùng menu để nộp học tập, gửi phản hồi
          hoặc xem thông báo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Link to="/student/academic">
            <Button size="sm">Học tập</Button>
          </Link>
          <Link to="/student/feedback">
            <Button size="sm" variant="outline">
              Phản hồi
            </Button>
          </Link>
          <Link to="/student/notifications">
            <Button size="sm" variant="outline">
              Thông báo
            </Button>
          </Link>
        </div>
      </div>

      {loading && !data ? (
        <p className="text-gray-500">Đang tải...</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Điểm rủi ro (0–1)</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {data?.risk_score != null ? data.risk_score.toFixed(3) : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Mức rủi ro</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {data?.risk_label ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Học kỳ (dự báo rủi ro)</p>
              <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {data?.risk_term_code ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-sm dark:border-gray-800 dark:bg-white/3 dark:shadow-none">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Số lần ghi nhận học tập</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
                {data?.academic_trend?.length ?? 0}
              </p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
              <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
                Xu hướng GPA
              </h2>
              {gpaChart.series[0].data.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có dữ liệu học tập.</p>
              ) : (
                <Chart
                  options={gpaChart.options as ApexOptions}
                  series={gpaChart.series}
                  type="line"
                  height={280}
                />
              )}
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
              <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
                Cảm xúc phản hồi theo tháng
              </h2>
              {sentimentChart.months.length === 0 ? (
                <p className="text-sm text-gray-500">Chưa có dữ liệu cảm xúc.</p>
              ) : (
                <Chart
                  options={sentimentChart.options as ApexOptions}
                  series={sentimentChart.series}
                  type="bar"
                  height={280}
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
            <h2 className="mb-3 text-base font-semibold text-gray-800 dark:text-white/90">
              Lịch sử học tập gần đây
            </h2>
            <div className="overflow-x-auto">
              <Table className="text-left text-sm">
                <TableHeader>
                  <TableRow className="border-b border-gray-200 dark:border-gray-700">
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Học kỳ
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
                      Tỉ lệ tham dự
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Môn trượt
                    </TableCell>
                    <TableCell isHeader className="px-3 py-2 font-semibold">
                      Cảm xúc (điểm)
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.academic_trend ?? []).length === 0 ? (
                    <TableRow>
                      <td className="px-3 py-4 text-gray-500" colSpan={7}>
                        Chưa có bản ghi.
                      </td>
                    </TableRow>
                  ) : (
                    [...(data?.academic_trend ?? [])]
                      .sort(
                        (a, b) =>
                          new Date(b.recorded_at ?? 0).getTime() -
                          new Date(a.recorded_at ?? 0).getTime()
                      )
                      .map((row, idx) => (
                        <TableRow
                          key={`${row.recorded_at}-${idx}`}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <TableCell className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200">
                            {termLabel(row)}
                          </TableCell>
                          <TableCell className="px-3 py-2 whitespace-nowrap text-xs">
                            {row.recorded_at
                              ? new Date(row.recorded_at).toLocaleString('vi-VN')
                              : '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2">{row.gpa_current ?? '—'}</TableCell>
                          <TableCell className="px-3 py-2">{row.gpa_prev_sem ?? '—'}</TableCell>
                          <TableCell className="px-3 py-2">
                            {row.attendance_rate != null
                              ? `${(Number(row.attendance_rate) * 100).toFixed(0)}%`
                              : '—'}
                          </TableCell>
                          <TableCell className="px-3 py-2">{row.num_failed ?? '—'}</TableCell>
                          <TableCell className="px-3 py-2">
                            {row.sentiment_score != null ? row.sentiment_score.toFixed(2) : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </>
  )
}
