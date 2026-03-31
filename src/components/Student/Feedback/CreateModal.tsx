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
  SENTIMENT_OPTS,
  SENTIMENT_SKIP,
  type FeedbackCreateForm,
} from '@/models/Feedback'

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
          m.meeting_time ? new Date(m.meeting_time).toLocaleString('vi-VN') : m.meeting_id
        }`,
      })),
    [meetingHints]
  )
  const selectedMeeting = meetingHints.find(m => m.meeting_id === form.meetingId)

  const handleSubmit = async () => {
    if (!form.meetingId.trim()) {
      toast.error('Chọn meeting cần phản hồi')
      return
    }
    if (form.text.trim().length < 30) {
      toast.error('Nội dung phản hồi tối thiểu 30 ký tự')
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
      className="max-h-[90vh] max-w-lg overflow-y-auto p-6"
    >
      <h3 className="mb-2 text-lg font-semibold">Gửi phản hồi sau buổi SHCVHT</h3>
      <p className="mb-4 text-xs text-gray-500">
        Chọn meeting từ danh sách của bạn rồi gửi phản hồi. Nội dung tối thiểu 30 ký tự.
      </p>
      <div className="space-y-3">
        <div>
          <Label>Meeting *</Label>
          <Select
            key={`meeting-${isOpen}-${meetingHints.length}-${form.meetingId}`}
            options={meetingOptions}
            placeholder={
              loadingMeetings
                ? 'Đang tải meetings...'
                : meetingOptions.length
                  ? 'Chọn meeting'
                  : 'Chưa có meeting'
            }
            onChange={v => setForm(prev => ({ ...prev, meetingId: v }))}
            defaultValue={form.meetingId}
          />
          {selectedMeeting && (
            <p className="mt-2 text-xs text-gray-500">
              Lớp: <code>{selectedMeeting.class_label}</code> • Cố vấn:{' '}
              <code>{selectedMeeting.advisor_label}</code>
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="fb-text">Nội dung *</Label>
          <TextArea
            rows={5}
            value={form.text}
            onChange={v => setForm(prev => ({ ...prev, text: v }))}
            disabled={saving}
            hint={`${form.text.trim().length}/30+ ký tự`}
          />
        </div>
        <div>
          <Label>Đánh giá (tùy chọn)</Label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                disabled={saving}
                onClick={() => setForm(prev => ({ ...prev, rating: star }))}
                className={`text-2xl leading-none transition-colors ${
                  star <= form.rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'
                }`}
                aria-label={`Chọn ${star} sao`}
                title={`${star} sao`}
              >
                ★
              </button>
            ))}
            {form.rating > 0 && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setForm(prev => ({ ...prev, rating: 0 }))}
                className="ml-2 text-xs text-gray-500 underline"
              >
                Bỏ chọn
              </button>
            )}
          </div>
        </div>
        <div>
          <Label>Cảm xúc (tùy)</Label>
          <Select
            key={`sent-${isOpen}`}
            options={SENTIMENT_OPTS}
            placeholder="Chọn"
            onChange={v => setForm(prev => ({ ...prev, sentiment: v }))}
            defaultValue={form.sentiment}
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button size="sm" variant="outline" disabled={saving} onClick={onClose}>
          Hủy
        </Button>
        <Button
          size="sm"
          disabled={saving || loadingMeetings || meetingOptions.length === 0}
          onClick={() => void handleSubmit()}
        >
          {saving ? 'Đang gửi...' : 'Gửi'}
        </Button>
      </div>
    </Modal>
  )
}
