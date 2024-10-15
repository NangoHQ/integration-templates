import type { NangoSync, ProxyConfiguration, Meeting } from '../../models';
import type { ZoomMeeting } from '../types';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://developers.zoom.us/docs/api/meetings/#tag/meetings/GET/users/{userId}/meeting_templates
        endpoint: '/users/me/meetings',
        retries: 10,
        paginate: {
            type: 'cursor',
            cursor_name_in_request: 'next_page_token',
            cursor_path_in_response: 'next_page_token',
            response_path: 'meetings',
            limit_name_in_request: 'page_size'
        }
    };

    for await (const zMeetings of nango.paginate<ZoomMeeting>(config)) {
        const meetings: Meeting[] = zMeetings.map((zMeeting: ZoomMeeting) => {
            return {
                id: zMeeting.id.toString(),
                topic: zMeeting.topic,
                startTime: zMeeting.start_time,
                duration: zMeeting.duration,
                timezone: zMeeting.timezone,
                joinUrl: zMeeting.join_url,
                createdAt: zMeeting.created_at
            };
        });

        await nango.batchSave(meetings, 'Meeting');
    }
}
