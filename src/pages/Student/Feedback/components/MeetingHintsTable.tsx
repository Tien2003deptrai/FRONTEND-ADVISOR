import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import type { MeetingHint } from '@/models/StudentFeedback'

type Props = {
  meetingHints: MeetingHint[]
  onFeedback: () => void
}

export default function MeetingHintsTable({ meetingHints, onFeedback }: Props) {
  return (
    <div className="overflow-x-auto">
      <Table className="text-left text-sm">
        <TableHeader>
          <TableRow className="border-b border-gray-200 dark:border-gray-700">
            <TableCell isHeader className="px-3 py-2 font-semibold">
              meeting_id
            </TableCell>
            <TableCell isHeader className="px-3 py-2 font-semibold">
              Lớp cố vấn
            </TableCell>
            <TableCell isHeader className="px-3 py-2 font-semibold">
              Cố vấn học tập
            </TableCell>
            <TableCell isHeader className="px-3 py-2 font-semibold">
              Thời gian họp
            </TableCell>
            <TableCell isHeader className="px-3 py-2 font-semibold">
              Lần feedback
            </TableCell>
            <TableCell isHeader className="px-3 py-2 font-semibold">
              Gần nhất
            </TableCell>
            <TableCell isHeader className="px-3 py-2 font-semibold">
              Hành động
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {meetingHints.length === 0 ? (
            <TableRow>
              <td className="px-3 py-5 text-gray-500" colSpan={7}>
                Chưa có meeting nào cho tài khoản này.
              </td>
            </TableRow>
          ) : (
            meetingHints.map(row => (
              <TableRow
                key={row.meeting_id}
                className="border-b border-gray-100 dark:border-gray-800"
              >
                <TableCell className="max-w-[180px] truncate px-3 py-2 font-mono text-xs">
                  {row.meeting_id}
                </TableCell>
                <TableCell className="max-w-[180px] truncate px-3 py-2 font-mono text-xs">
                  {row.class_label}
                </TableCell>
                <TableCell className="max-w-[260px] truncate px-3 py-2 text-xs">
                  {row.advisor_label}
                </TableCell>
                <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                  {row.meeting_time ? new Date(row.meeting_time).toLocaleString('vi-VN') : '—'}
                </TableCell>
                <TableCell className="px-3 py-2">{row.feedback_count}</TableCell>
                <TableCell className="whitespace-nowrap px-3 py-2 text-xs">
                  {row.latest_submitted_at
                    ? new Date(row.latest_submitted_at).toLocaleString('vi-VN')
                    : '—'}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Button size="sm" variant="outline" onClick={onFeedback}>
                    Gửi feedback
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
