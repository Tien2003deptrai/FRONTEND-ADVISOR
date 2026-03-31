import axiosInstance from '../axiosIntance';
import { ApiResponse } from '../type';

class MeetingService {
    private api = axiosInstance;

    listMyMeetings = async (body: object = {}): Promise<ApiResponse> => {
        const response = await this.api.post('/meeting/my', body);
        return response.data
    }
}

export const meetingService = new MeetingService();
