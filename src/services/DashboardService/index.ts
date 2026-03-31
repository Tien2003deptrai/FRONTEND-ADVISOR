import axiosInstance from '../axiosIntance';
import { ApiResponse } from '../type';

class DashboardService {
    private api = axiosInstance;

    getFacultyDashboard = async (body: object = {}): Promise<ApiResponse> => {
        const response = await this.api.post('/dashboard/faculty', body);
        return response.data
    }
}

export const dashboardService = new DashboardService();
