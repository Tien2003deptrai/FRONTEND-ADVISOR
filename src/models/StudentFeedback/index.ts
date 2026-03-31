export type Pagination = {
  page: number
  limit: number
  total: number
  total_pages: number
}

export type FeedbackRow = {
  _id: string
  meeting_id?: string | { _id?: string }
  class_id?: string | { _id?: string }
  advisor_user_id?: string | { _id?: string }
  feedback_text: string
  rating?: number
  sentiment_label?: string
  submitted_at?: string
}

export type MeetingHint = {
  meeting_id: string
  class_id: string
  advisor_user_id: string
  class_label: string
  advisor_label: string
  meeting_time?: string
  meeting_end_time?: string
  feedback_count: number
  latest_submitted_at?: string
}

export type FeedbackCreateForm = {
  meetingId: string
  text: string
  rating: number
  sentiment: string
}

export type MeetingApiItem = {
  _id?: string
  class_id?:
    | string
    | {
        _id?: string
        class_code?: string
        class_name?: string
      }
  advisor_user_id?:
    | string
    | {
        _id?: string
        email?: string
        profile?: { full_name?: string }
        advisor_info?: { staff_code?: string; title?: string }
      }
  meeting_time?: string
  meeting_end_time?: string
}

export const SENTIMENT_SKIP = '__skip__'
export const SENTIMENT_OPTS = [
  { value: SENTIMENT_SKIP, label: 'Không gửi nhãn (tùy chọn)' },
  { value: 'POSITIVE', label: 'POSITIVE' },
  { value: 'NEUTRAL', label: 'NEUTRAL' },
  { value: 'NEGATIVE', label: 'NEGATIVE' },
]

export function normalizeRefId(v: unknown): string {
  if (!v) return ''
  if (typeof v === 'object' && v !== null && '_id' in v) {
    return String((v as { _id?: unknown })._id ?? '')
  }
  return String(v)
}

export function buildMeetingHintFromApiItem(
  item: MeetingApiItem,
  feedbackByMeeting: Map<string, { count: number; latest?: string }>
): MeetingHint {
  const meetingId = normalizeRefId(item._id)
  const stat = feedbackByMeeting.get(meetingId)
  const classRaw = item.class_id
  const advisorRaw = item.advisor_user_id

  const classCode =
    typeof classRaw === 'object' && classRaw !== null && 'class_code' in classRaw
      ? String((classRaw as { class_code?: string }).class_code ?? '')
      : ''
  const className =
    typeof classRaw === 'object' && classRaw !== null && 'class_name' in classRaw
      ? String((classRaw as { class_name?: string }).class_name ?? '')
      : ''

  const advisorName =
    typeof advisorRaw === 'object' && advisorRaw !== null && 'profile' in advisorRaw
      ? String((advisorRaw as { profile?: { full_name?: string } }).profile?.full_name ?? '')
      : ''
  const advisorEmail =
    typeof advisorRaw === 'object' && advisorRaw !== null && 'email' in advisorRaw
      ? String((advisorRaw as { email?: string }).email ?? '')
      : ''
  const advisorStaffCode =
    typeof advisorRaw === 'object' && advisorRaw !== null && 'advisor_info' in advisorRaw
      ? String(
          (advisorRaw as { advisor_info?: { staff_code?: string } }).advisor_info?.staff_code ?? ''
        )
      : ''

  return {
    meeting_id: meetingId,
    class_id: normalizeRefId(item.class_id),
    advisor_user_id: normalizeRefId(item.advisor_user_id),
    class_label:
      [classCode, className].filter(Boolean).join(' — ') || normalizeRefId(item.class_id) || '—',
    advisor_label:
      [advisorName, advisorStaffCode && `(${advisorStaffCode})`, advisorEmail]
        .filter(Boolean)
        .join(' • ') ||
      normalizeRefId(item.advisor_user_id) ||
      '—',
    meeting_time: item.meeting_time,
    meeting_end_time: item.meeting_end_time,
    feedback_count: stat?.count ?? 0,
    latest_submitted_at: stat?.latest,
  }
}
