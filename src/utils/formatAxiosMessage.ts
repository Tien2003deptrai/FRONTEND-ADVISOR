import axios from 'axios'

export function formatAxiosMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message ?? err.message
  }
  return 'Đã có lỗi xảy ra'
}
