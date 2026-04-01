import axiosInstance from '../axiosIntance'
import { ApiResponse } from '../type'

class UserService {
  private api = axiosInstance

  getUsers = async (body: object = {}): Promise<ApiResponse> => {
    const response = await this.api.post('/users', body)
    return response.data
  }

  createUser = async (body: object): Promise<ApiResponse> => {
    const response = await this.api.post('/users/create', body)
    return response.data
  }

  /** POST /users/info — chi tiết user (không mật khẩu), ADVISOR / FACULTY / ADMIN */
  getInfoUser = async (body: { user_id: string }): Promise<ApiResponse> => {
    const response = await this.api.post('/users/info', body)
    return response.data
  }
}

export const userService = new UserService()
