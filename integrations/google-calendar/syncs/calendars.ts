import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { GoogleCalendar } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Sync the calendars list of the user',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/calendars',
            group: 'Calendars'
        }
    ],

    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    models: {
        GoogleCalendar: GoogleCalendar
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const maxResults = '100';

        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/calendarList/list
            endpoint: 'calendar/v3/users/me/calendarList',
            params: {
                maxResults
            },
            retries: 10
        };

        for await (const eventPage of nango.paginate<GoogleCalendar>(config)) {
            await nango.batchSave(eventPage, 'GoogleCalendar');
        }
    await nango.deleteRecordsFromPreviousExecutions("GoogleCalendar");
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
