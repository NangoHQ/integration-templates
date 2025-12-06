import { createSync } from 'nango';
import type { ZoomMeeting } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { Meeting } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of meetings from Zoom',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/meetings',
            group: 'Meetings'
        }
    ],

    scopes: ['meeting:read'],

    models: {
        Meeting: Meeting
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://developers.zoom.us/docs/api/meetings/#tag/meetings/GET/users/{userId}/meetings
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
        await nango.deleteRecordsFromPreviousExecutions('Meeting');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
