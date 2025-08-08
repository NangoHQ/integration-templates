import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { OutlookCalendar } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Sync the calendars list of the user',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/calendars'
        }
    ],

    scopes: ['Calendars.Read'],

    models: {
        OutlookCalendar: OutlookCalendar
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/user-list-calendars?view=graph-rest-1.0&tabs=http
            endpoint: '/v1.0/me/calendars',
            params: {
                $top: '100'
            },
            paginate: {
                type: 'link',
                response_path: 'value',
                link_path_in_response_body: '@odata.nextLink',
                limit: '100',
                limit_name_in_request: '$top'
            },
            retries: 10
        };

        for await (const calendarsPage of nango.paginate<OutlookCalendar>(config)) {
            const processedCalendars = calendarsPage.map((calendar: any) => {
                // Remove OData metadata properties
                delete calendar['@odata.etag'];
                delete calendar['@odata.id'];

                return calendar;
            });

            if (processedCalendars.length > 0) {
                await nango.batchSave(processedCalendars, 'OutlookCalendar');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
