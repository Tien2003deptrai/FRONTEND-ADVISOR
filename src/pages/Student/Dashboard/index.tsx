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
import {
  ArrowRightIcon,
  BoltIcon,
  CalenderIcon,
  ChatIcon,
  ListIcon,
  PieChartIcon,
  TimeIcon,
} from '@/icons'

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

function formatRiskLabel(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return '—'
  // Convert numeric values to text labels
  if (v === -1 || v === '-1') return 'High'
  if (v === 0 || v === '0') return 'Medium'
  if (v === 1 || v === '1') return 'Low'
  return String(v)
}

function riskScoreTone(score: number | null | undefined): string {
  if (score == null || Number.isNaN(score)) {
    return 'border-gray-200/90 bg-white dark:border-gray-800 dark:bg-white/[0.03]'
  }
  if (score >= 0.7)
    return 'border-rose-200/80 bg-gradient-to-br from-rose-50/90 to-white dark:border-rose-500/25 dark:from-rose-950/40 dark:to-gray-900/80'
  if (score >= 0.4)
    return 'border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white dark:border-amber-500/20 dark:from-amber-950/35 dark:to-gray-900/80'
  return 'border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-white dark:border-emerald-500/20 dark:from-emerald-950/30 dark:to-gray-900/80'
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
        dataLabels: { 
          enabled: true,
          style: {
            fontSize: '12px',
            fontWeight: '600',
          },
          offsetY: -10,
        },
        markers: {
          size: 5,
          strokeWidth: 2,
          hover: { size: 7 },
        },
        legend: { position: 'top' as const },
        yaxis: { min: 0, max: 4, tickAmount: 4 },
        tooltip: {
          y: {
            formatter: (val: number) => val != null ? val.toFixed(2) : '',
          },
        },
      },
      series,
    }
  }, [data?.academic_trend])

  const sentimentChart = useMemo(() => {
    const rows = [...(data?.academic_trend ?? [])].sort(
      (a, b) => new Date(a.recorded_at ?? 0).getTime() - new Date(b.recorded_at ?? 0).getTime()
    )
    const categories = rows.map((r, i) =>
      r.recorded_at ? new Date(r.recorded_at).toLocaleDateString('vi-VN') : `#${i + 1}`
    )
    
    // Map sentiment scores to POSITIVE/NEUTRAL/NEGATIVE lines
    const sentimentData = rows.map(r => {
      const score = r.sentiment_score
      if (score == null) return { positive: null, neutral: null, negative: null }
      if (score > 0.33) return { positive: score, neutral: null, negative: null }
      if (score < -0.33) return { positive: null, neutral: null, negative: score }
      return { positive: null, neutral: score, negative: null }
    })
    
    const series = [
      {
        name: 'POSITIVE',
        data: sentimentData.map(d => d.positive),
      },
      {
        name: 'NEUTRAL',
        data: sentimentData.map(d => d.neutral),
      },
      {
        name: 'NEGATIVE',
        data: sentimentData.map(d => d.negative),
      },
    ]
    
    return {
      months: categories,
      options: {
        chart: { 
          toolbar: { show: false }, 
          fontFamily: 'inherit',
        },
        xaxis: { 
          categories,
          labels: { rotate: -35 },
        },
        stroke: { 
          curve: 'smooth', 
          width: 3,
        },
        dataLabels: { 
          enabled: true,
          formatter: (val: number) => val != null ? val.toFixed(2) : '',
          style: {
            fontSize: '11px',
            fontWeight: '600',
          },
          offsetY: -10,
        },
        markers: {
          size: 5,
          strokeWidth: 2,
          hover: { size: 7 },
        },
        yaxis: {
          min: -1,
          max: 1,
          tickAmount: 5,
          forceNiceScale: false,
          labels: {
            formatter: (val: number) => val.toFixed(1),
          },
        },
        colors: ['#22c55e', '#eab308', '#dc2626'],
        legend: { position: 'top' as const },
        tooltip: {
          y: {
            formatter: (val: number) => val != null ? val.toFixed(2) : '',
          },
        },
      },
      series,
    }
  }, [data?.academic_trend])

  return (
    <>
      <PageMeta title="Dashboard sinh viên | Advisor" description="Risk, học tập, cảm xúc" />
      <PageBreadcrumb pageTitle="Dashboard sinh viên" />

      <section
        className="relative mb-8 overflow-hidden rounded-2xl border border-brand-200/45 bg-gradient-to-br from-brand-50 via-white to-violet-50/40 p-5 shadow-[0_12px_40px_-14px_rgba(70,95,255,0.26)] ring-1 ring-brand-500/10 dark:border-brand-500/20 dark:from-brand-950/45 dark:via-gray-900 dark:to-violet-950/30 dark:ring-brand-400/10 sm:p-6 md:flex md:items-center md:justify-between md:gap-8"
        aria-labelledby="student-dash-hero-title"
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-brand-400/18 blur-3xl dark:bg-brand-500/12"
          aria-hidden
        />
        <div className="relative z-10 max-w-2xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/5 dark:text-brand-300 dark:ring-brand-500/25">
            <PieChartIcon className="size-3.5 shrink-0" aria-hidden />
            Tổng quan cá nhân
          </p>
          <h2
            id="student-dash-hero-title"
            className="mt-3 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl"
          >
            Rủi ro, học tập và cảm xúc trên một màn hình
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Theo dõi KPI, biểu đồ và lịch sử ghi nhận. Dùng các nút bên phải để nộp học tập, gửi phản
            hồi hoặc xem thông báo.
          </p>
        </div>
        <div className="relative z-10 mt-5 flex shrink-0 flex-wrap gap-2 md:mt-0">
          <Button
            size="sm"
            variant="outline"
            className="font-semibold"
            onClick={() => void load()}
            disabled={loading}
            startIcon={
              loading ? (
                <TimeIcon className="size-4 shrink-0 animate-pulse" aria-hidden />
              ) : (
                <ListIcon className="size-4 shrink-0" aria-hidden />
              )
            }
          >
            {loading ? 'Đang tải...' : 'Làm mới'}
          </Button>
          <Link to="/student/academic">
            <Button
              size="sm"
              variant="primary"
              className="shadow-md"
              endIcon={<ArrowRightIcon className="size-4 shrink-0 opacity-90" aria-hidden />}
            >
              Học tập
            </Button>
          </Link>
          <Link to="/student/feedback">
            <Button
              size="sm"
              variant="outline"
              className="font-semibold"
              startIcon={<ChatIcon className="size-4 shrink-0" aria-hidden />}
            >
              Phản hồi
            </Button>
          </Link>
          <Link to="/student/notifications">
            <Button
              size="sm"
              variant="outline"
              className="font-semibold"
              startIcon={<BoltIcon className="size-4 shrink-0" aria-hidden />}
            >
              Thông báo
            </Button>
          </Link>
        </div>
      </section>

      {loading && !data ? (
        <div className="space-y-3 py-4" aria-busy="true">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-white/10" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div
              className={`rounded-2xl border p-4 shadow-[0_8px_28px_-12px_rgba(15,23,42,0.12)] ring-1 ring-gray-900/[0.03] dark:ring-white/[0.04] sm:p-5 xl:col-span-1 ${riskScoreTone(data?.risk_score ?? null)}`}
            >
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                <BoltIcon className="size-3.5 text-brand-600 dark:text-brand-400" aria-hidden />
                Điểm rủi ro (0–1)
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">
                {data?.risk_score != null ? data.risk_score.toFixed(3) : '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-theme-sm ring-1 ring-gray-900/[0.02] dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Mức rủi ro
              </p>
              <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                {formatRiskLabel(data?.risk_label)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-theme-sm ring-1 ring-gray-900/[0.02] dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none sm:p-5">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <CalenderIcon className="size-3.5 shrink-0 text-brand-500" aria-hidden />
                Học kỳ (dự báo)
              </p>
              <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">
                {data?.risk_term_code ?? '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200/90 bg-white p-4 shadow-theme-sm ring-1 ring-gray-900/[0.02] dark:border-gray-800 dark:bg-white/[0.03] dark:shadow-none sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Số lần ghi nhận
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                {data?.academic_trend?.length ?? 0}
              </p>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_36px_-14px_rgba(15,23,42,0.1)] ring-1 ring-gray-900/[0.025] dark:border-gray-800 dark:bg-gray-900/40 dark:ring-white/[0.05]">
              <h2 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 text-base font-bold text-gray-900 dark:border-gray-800 dark:text-white/90">
                <PieChartIcon className="size-5 text-brand-500 dark:text-brand-400" aria-hidden />
                Xu hướng GPA
              </h2>
              {gpaChart.series[0].data.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  <CalenderIcon className="size-10 text-gray-300 dark:text-gray-600" aria-hidden />
                  Chưa có dữ liệu học tập.
                </div>
              ) : (
                <Chart
                  options={gpaChart.options as ApexOptions}
                  series={gpaChart.series}
                  type="line"
                  height={280}
                />
              )}
            </div>
            <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_36px_-14px_rgba(15,23,42,0.1)] ring-1 ring-gray-900/[0.025] dark:border-gray-800 dark:bg-gray-900/40 dark:ring-white/[0.05]">
              <h2 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 text-base font-bold text-gray-900 dark:border-gray-800 dark:text-white/90">
                <ChatIcon className="size-5 text-brand-500 dark:text-brand-400" aria-hidden />
                Xu hướng cảm xúc phản hồi
              </h2>
              {sentimentChart.series[0].data.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                  <ChatIcon className="size-10 text-gray-300 dark:text-gray-600" aria-hidden />
                  Chưa có dữ liệu cảm xúc.
                </div>
              ) : (
                <Chart
                  options={sentimentChart.options as ApexOptions}
                  series={sentimentChart.series}
                  type="line"
                  height={280}
                />
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/90 bg-white p-5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.1)] ring-1 ring-gray-900/[0.035] dark:border-gray-800 dark:bg-gray-900/50 dark:ring-white/[0.05] sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-3 text-base font-bold text-gray-900 dark:border-gray-800 dark:text-white/90">
              <TimeIcon className="size-5 text-brand-500 dark:text-brand-400" aria-hidden />
              Lịch sử học tập gần đây
            </h2>
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
                      GPA HT
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      GPA trước
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Tỉ lệ tham dự
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Môn trượt
                    </TableCell>
                    <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Cảm xúc (điểm)
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.academic_trend ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                        Chưa có bản ghi.
                      </TableCell>
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
                          className="border-b border-gray-100 transition-colors hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                        >
                          <TableCell className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {termLabel(row)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
                            {row.recorded_at
                              ? new Date(row.recorded_at).toLocaleString('vi-VN')
                              : '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 tabular-nums">{row.gpa_current ?? '—'}</TableCell>
                          <TableCell className="px-4 py-3 tabular-nums">{row.gpa_prev_sem ?? '—'}</TableCell>
                          <TableCell className="px-4 py-3 tabular-nums">
                            {row.attendance_rate != null
                              ? `${(Number(row.attendance_rate) * 100).toFixed(0)}%`
                              : '—'}
                          </TableCell>
                          <TableCell className="px-4 py-3 tabular-nums">{row.num_failed ?? '—'}</TableCell>
                          <TableCell className="px-4 py-3 tabular-nums text-sm font-medium text-gray-800 dark:text-gray-200">
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
