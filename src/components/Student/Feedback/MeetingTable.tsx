import Button from '@/components/ui/button/Button'
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table'
import { PaperPlaneIcon } from '@/icons'
import type { MeetingHint } from '@/models/Feedback'

type Props = {
  meetingHints: MeetingHint[]
  onFeedback: (meetingId: string) => void
}

export default function MeetingHintsTable({ meetingHints, onFeedback }: Props) {
  return (
    <div className="overflow-x-auto">
      <Table className="text-left text-sm">
        <TableHeader>
          <TableRow className="border-b border-gray-200 bg-gray-50/90 dark:border-gray-800 dark:bg-white/[0.04]">
            <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Buổi họp
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Lớp cố vấn
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Cố vấn học tập
            </TableCell>
            <TableCell isHeader className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Kết thúc
            </TableCell>
            <TableCell isHeader className="w-px whitespace-nowrap px-4 py-3 text-right text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Phản hồi
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {meetingHints.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                Chưa có buổi họp nào — khi lịch được thêm, bạn sẽ gửi phản hồi tại đây.
              </TableCell>
            </TableRow>
          ) : (
            meetingHints.map(row => (
              <TableRow
                key={row.meeting_id}
                className="border-b border-gray-100 bg-white transition-colors duration-150 last:border-0 hover:bg-gray-50/90 dark:border-gray-800/80 dark:bg-transparent dark:hover:bg-white/[0.03]"
              >
                <TableCell className="max-w-[220px] px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                  {row.meeting_time
                    ? new Date(row.meeting_time).toLocaleString('vi-VN')
                    : '—'}
                </TableCell>
                <TableCell className="max-w-[200px] px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {row.class_label}
                </TableCell>
                <TableCell className="max-w-[260px] truncate px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                  {row.advisor_label}
                </TableCell>
                <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                  {row.meeting_end_time ? new Date(row.meeting_end_time).toLocaleString('vi-VN') : '—'}
                </TableCell>
                <TableCell className="px-4 py-3 text-right align-middle">
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    startIcon={<PaperPlaneIcon className="size-6 shrink-0 text-blue-700" aria-hidden />}
                    onClick={() => onFeedback(row.meeting_id)}
                  >
                    {/* Gửi phản hồi */}
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
