import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import Select from '@/components/form/Select'
import TextArea from '@/components/form/input/TextArea'
import { meetingService } from '@/services/MeetingService'
import {
  type MeetingHint,
  SENTIMENT_SKIP,
  type FeedbackCreateForm,
} from '@/models/Feedback'
import { ChatIcon, CloseLineIcon, PaperPlaneIcon, TimeIcon } from '@/icons'

type Props = {
  isOpen: boolean
  initialMeetingId?: string
  onClose: () => void
  onSubmit: (form: FeedbackCreateForm) => Promise<boolean>
}

export default function FeedbackCreateModal({
  isOpen,
  initialMeetingId,
  onClose,
  onSubmit,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [loadingMeetings, setLoadingMeetings] = useState(false)
  const [meetingHints, setMeetingHints] = useState<
    MeetingHint[]
  >([])
  const [form, setForm] = useState<FeedbackCreateForm>({
    meetingId: '',
    text: '',
    rating: 0,
    sentiment: SENTIMENT_SKIP,
  })

  const loadMeetings = async () => {
    setLoadingMeetings(true)
    try {
      const res = await meetingService.getInfoMeeting({ page: 1, limit: 100 })
      const hints = res.data?.items ?? []
      setMeetingHints(
        [...hints].sort(
          (a, b) =>
            new Date(b.meeting_time ?? 0).getTime() - new Date(a.meeting_time ?? 0).getTime()
        )
      )
    } catch {
      toast.error('Đã có lỗi xảy ra')
      setMeetingHints([])
    } finally {
      setLoadingMeetings(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setForm({
      meetingId: initialMeetingId ?? '',
      text: '',
      rating: 0,
      sentiment: SENTIMENT_SKIP,
    })
    void loadMeetings()
  }, [isOpen, initialMeetingId])

  const meetingOptions = useMemo(
    () =>
      meetingHints.map(m => ({
        value: m.meeting_id,
        label: `${m.class_label} • ${
          m.meeting_time
            ? new Date(m.meeting_time).toLocaleString('vi-VN')
            : 'Buổi họp (chưa có giờ)'
        }`,
      })),
    [meetingHints]
  )
  const selectedMeeting = meetingHints.find(m => m.meeting_id === form.meetingId)

  const handleSubmit = async () => {
    if (!form.meetingId.trim()) {
      toast.error('Chọn buổi họp cần phản hồi')
      return
    }
    if (form.text.trim().length < 20) {
      toast.error('Nội dung phản hồi tối thiểu 20 ký tự (theo hệ thống)')
      return
    }
    setSaving(true)
    try {
      const ok = await onSubmit(form)
      if (ok) onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !saving && onClose()}
      className="max-h-[90vh] max-w-lg overflow-hidden p-0"
    >
      <div className="border-b border-gray-100 bg-gradient-to-r from-brand-50/95 to-violet-50/50 px-6 py-4 dark:border-gray-800 dark:from-brand-950/50 dark:to-gray-900">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/90 text-brand-600 shadow-sm ring-1 ring-brand-200/70 dark:bg-white/10 dark:text-brand-300 dark:ring-brand-500/25">
            <ChatIcon className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white/90">
              Gửi phản hồi sau buổi SHCVHT
            </h3>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Mỗi buổi họp chỉ một lần phản hồi cho mỗi sinh viên.
            </p>
          </div>
        </div>
      </div>
      <div className="max-h-[calc(90vh-7rem)] overflow-y-auto p-6">
      <p className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs font-medium text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100">
        Chọn buổi họp từ danh sách, nhập nội dung tối thiểu 20 ký tự trước khi gửi.
      </p>
      <div className="space-y-3">
        <div>
          <Label>Buổi họp *</Label>
          <Select
            key={`meeting-${isOpen}-${meetingHints.length}-${form.meetingId}`}
            options={meetingOptions}
            placeholder={
              loadingMeetings
                ? 'Đang tải danh sách...'
                : meetingOptions.length
                  ? 'Chọn buổi họp'
                  : 'Chưa có buổi họp'
            }
            onChange={v => setForm(prev => ({ ...prev, meetingId: v }))}
            defaultValue={form.meetingId}
          />
          {selectedMeeting && (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Lớp: {selectedMeeting.class_label} · Cố vấn: {selectedMeeting.advisor_label}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="fb-text">Nội dung*</Label>
          <TextArea
            rows={5}
            value={form.text}
            onChange={v => setForm(prev => ({ ...prev, text: v }))}
            disabled={saving}
            hint={`${form.text.trim().length}/20+ ký tự`}
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
          onClick={onClose}
        >
          Hủy
        </Button>
        <Button
          size="sm"
          variant="primary"
          className="font-semibold shadow-md"
          disabled={saving || loadingMeetings || meetingOptions.length === 0}
          startIcon={
            saving ? (
              <TimeIcon className="size-4 shrink-0 animate-pulse" aria-hidden />
            ) : (
              <PaperPlaneIcon className="size-4 shrink-0" aria-hidden />
            )
          }
          onClick={() => void handleSubmit()}
        >
          {saving ? 'Đang gửi...' : 'Gửi phản hồi'}
        </Button>
      </div>
    </Modal>
  )
}
