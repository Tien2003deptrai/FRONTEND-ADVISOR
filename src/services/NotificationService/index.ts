import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class NotificationService {
  private api = axiosInstance

  listNotifications = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/notification/list', body)
    return response.data
  }

  generateAlerts = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/notification/generate', body)
    return response.data
  }
}

export const notificationService = new NotificationService()
