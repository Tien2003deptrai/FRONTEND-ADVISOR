import { useMemo } from 'react'
import Chart from 'react-apexcharts'
import type { ApexOptions } from 'apexcharts'

export type AlertOpenRow = {
  _id?: string
  alert_type?: string
  severity?: string
  status?: string
  detected_at?: string
  student_user_id?: string
}

export type AlertCards = {
  risk_open?: number
  sentiment_open?: number
  anomaly_open?: number
}

type StudentRowLite = {
  risk_label?: number | string | null
}

type Props = {
  studentTable: StudentRowLite[]
  alertCards: AlertCards | null
  riskAlerts: AlertOpenRow[]
  sentimentAlerts: AlertOpenRow[]
  anomalyAlerts: AlertOpenRow[]
  paginationTotal: number
  unreadNotifications: number
  noAdvisorClass: boolean
}

const DONUT_COLORS = ['#3b82f6', '#8b5cf6', '#f97316']

function countBySeverity(alerts: AlertOpenRow[]): Record<string, number> {
  const m: Record<string, number> = {}
  for (const a of alerts) {
    const s = a.severity ?? 'UNKNOWN'
    m[s] = (m[s] ?? 0) + 1
  }
  return m
}

function colorForSeverity(severity: string): string {
  const key = severity.toUpperCase()
  if (key === 'HIGH' || key === 'CRITICAL') return '#dc2626'
  if (key === 'MEDIUM' || key === 'MODERATE') return '#eab308'
  if (key === 'LOW') return '#22c55e'
  return '#6366f1'
}

function countRiskLabels(rows: StudentRowLite[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) {
    let key: string
    if (r.risk_label === null || r.risk_label === undefined) {
      key = 'Chưa có'
    } else {
      const val = String(r.risk_label)
      if (val === '-1') key = 'High'
      else if (val === '0') key = 'Medium'
      else if (val === '1') key = 'Low'
      else key = val
    }
    m.set(key, (m.get(key) ?? 0) + 1)
  }
  return m
}

function colorForLabel(label: string): string {
  if (label === 'High') return '#dc2626'
  if (label === 'Medium') return '#eab308'
  if (label === 'Low') return '#22c55e'
  return '#9ca3af'
}

export default function AdvisorDashboardCharts({
  studentTable,
  alertCards,
  riskAlerts,
  sentimentAlerts,
  anomalyAlerts,
  paginationTotal,
  unreadNotifications,
  noAdvisorClass,
}: Props) {
  const riskOpen = alertCards?.risk_open ?? 0
  const sentimentOpen = alertCards?.sentiment_open ?? 0
  const anomalyOpen = alertCards?.anomaly_open ?? 0
  const totalOpenAlerts = riskOpen + sentimentOpen + anomalyOpen

  const severityMerged = useMemo(
    () => [...riskAlerts, ...sentimentAlerts, ...anomalyAlerts],
    [riskAlerts, sentimentAlerts, anomalyAlerts]
  )
  const severityCounts = useMemo(() => countBySeverity(severityMerged), [severityMerged])
  const severityCategories = useMemo(
    () => Object.keys(severityCounts).sort(),
    [severityCounts]
  )
  const severityColors = useMemo(
    () => severityCategories.map(colorForSeverity),
    [severityCategories]
  )
  const severitySeries = useMemo(
    () => severityCategories.map(c => severityCounts[c] ?? 0),
    [severityCategories, severityCounts]
  )

  const labelMap = useMemo(() => countRiskLabels(studentTable), [studentTable])
  const labelCategories = useMemo(() => {
    const keys = Array.from(labelMap.keys())
    const order = ['Chưa có', 'High', 'Medium', 'Low']
    const rest = keys.filter(k => !order.includes(k)).sort()
    return [...order.filter(k => keys.includes(k)), ...rest]
  }, [labelMap])
  const labelColors = useMemo(
    () => labelCategories.map(colorForLabel),
    [labelCategories]
  )
  const labelSeries = useMemo(
    () => [{ name: 'Sinh viên', data: labelCategories.map(c => labelMap.get(c) ?? 0) }],
    [labelCategories, labelMap]
  )

  const donutOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'donut',
        fontFamily: 'Outfit, sans-serif',
        toolbar: { show: false },
        background: 'transparent',
      },
      labels: ['Cảnh báo RISK', 'Cảnh báo SENTIMENT', 'Cảnh báo ANOMALY'],
      colors: DONUT_COLORS,
      legend: {
        position: 'bottom',
        fontSize: '12px',
        labels: { colors: '#64748b' },
      },
      dataLabels: { 
        enabled: true,
        style: { 
          fontSize: '14px',
          fontWeight: 700,
          colors: ['#ffffff', '#ffffff', '#ffffff'],
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Tổng cảnh báo',
                formatter: () => String(totalOpenAlerts),
              },
            },
          },
        },
      },
      stroke: { show: false },
    }),
    [totalOpenAlerts]
  )

  const donutSeries = useMemo(() => [riskOpen, sentimentOpen, anomalyOpen], [riskOpen, sentimentOpen, anomalyOpen])

  const barSeverityOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'bar',
        fontFamily: 'Outfit, sans-serif',
        toolbar: { show: false },
        background: 'transparent',
      },
      colors: severityColors.length ? severityColors : ['#6366f1'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 6,
          borderRadiusApplication: 'end',
          distributed: true,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: severityCategories.length ? severityCategories : ['—'],
        labels: { style: { fontSize: '11px', colors: '#64748b' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
      },
      tooltip: { y: { formatter: (val: number) => `${val} bản ghi` } },
      legend: { show: false },
    }),
    [severityCategories]
  )

  const barSeveritySeries = useMemo(
    () => [
      {
        name: 'Cảnh báo',
        data:
          severitySeries.length > 0
            ? severitySeries
            : [0],
      },
    ],
    [severitySeries]
  )

  const barLabelOptions = useMemo<ApexOptions>(
    () => ({
      chart: {
        type: 'bar',
        fontFamily: 'Outfit, sans-serif',
        toolbar: { show: false },
        background: 'transparent',
      },
      colors: labelColors.length ? labelColors : ['#6366f1'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 6,
          borderRadiusApplication: 'end',
          distributed: true,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: labelCategories.length ? labelCategories : ['—'],
        labels: { style: { fontSize: '11px', colors: '#64748b' } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4,
        yaxis: { lines: { show: true } },
      },
      tooltip: { y: { formatter: (val: number) => `${val} SV` } },
      legend: { show: false },
    }),
    [labelCategories]
  )

  if (noAdvisorClass) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-gray-200 bg-white/50 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/3 dark:text-gray-400">
        Chưa có lớp cố vấn ACTIVE — không có thống kê. Liên hệ ADMIN để gán lớp.
      </div>
    )
  }

  const hasDonutData = riskOpen > 0 || sentimentOpen > 0
  const hasSeverityData = severityMerged.length > 0
  const hasLabelData = studentTable.length > 0

  return (
    <div className="mb-6 space-y-6">

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi title="Sinh viên lớp cố vấn" value={paginationTotal} accent="default" />
        <Kpi title="Cảnh báo RISK đang mở" value={riskOpen} accent="danger" />
        <Kpi title="Cảnh báo SENTIMENT đang mở" value={sentimentOpen} accent="warn" />
        <Kpi title="Cảnh báo ANOMALY đang mở" value={anomalyOpen} accent="warn" />
        <Kpi title="Thông báo chưa đọc (20 mới nhất)" value={unreadNotifications} accent="default" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
            Cảnh báo đang mở theo loại
          </h3>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Từ trường <code className="text-xs">alert_cards</code> trên API — RISK vs SENTIMENT vs ANOMALY.
          </p>
          {hasDonutData ? (
            <Chart options={donutOptions} series={donutSeries} type="donut" height={300} />
          ) : (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              Không có cảnh báo OPEN loại RISK/SENTIMENT/ANOMALY cho sinh viên lớp bạn.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
          <h3 className="mb-1 text-base font-semibold text-gray-800 dark:text-white/90">
            Mức độ nghiêm trọng (cảnh báo mở)
          </h3>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
            Gộp <code className="text-xs">risk_alerts</code>, <code className="text-xs">sentiment_alerts</code> và <code className="text-xs">anomaly_alerts</code>{' '}
            (tối đa 20 mỗi loại từ API).
          </p>
          {hasSeverityData ? (
            <Chart options={barSeverityOptions} series={barSeveritySeries} type="bar" height={300} />
          ) : (
            <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
              Chưa có bản ghi cảnh báo mở để thống kê mức độ.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Kpi({
  title,
  value,
  accent,
}: {
  title: string
  value: string | number
  accent: 'default' | 'muted' | 'warn' | 'danger'
}) {
  const valueClass =
    accent === 'warn'
      ? 'text-amber-700 dark:text-amber-400'
      : accent === 'danger'
        ? 'text-red-600 dark:text-red-400'
        : accent === 'muted'
          ? 'text-gray-500 dark:text-gray-400'
          : 'text-gray-800 dark:text-white/90'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums sm:text-2xl ${valueClass}`}>
        {value}
      </p>
    </div>
  )
}
