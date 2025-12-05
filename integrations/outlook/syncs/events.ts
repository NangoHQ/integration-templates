import { createSync } from 'nango';
import type { OutlookEvent } from '../types.js';
import { toEvent } from '../mappers/to-event.js';

import type { ProxyConfiguration } from 'nango';
import { OutlookCalendarEvent, OptionalBackfillSetting } from '../models.js';

const DEFAULT_BACKFILL_MS = 30 * 24 * 60 * 60 * 1000; // 1 month

const sync = createSync({
    description:
        'Sync calendar events on the primary calendar going back as specified in the metadata `backfillPeriodMs`, or fallback to 1 month if not provided.',
    version: '2.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/events'
        }
    ],

    scopes: ['Calendars.Read'],

    models: {
        OutlookCalendarEvent: OutlookCalendarEvent
    },

    metadata: OptionalBackfillSetting,

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const backfillMilliseconds = metadata?.backfillPeriodMs || DEFAULT_BACKFILL_MS;
        const backfillDate = new Date(Date.now() - backfillMilliseconds);
        const timeMin = backfillDate.toISOString();

        await nango.log(`Fetching Outlook events from '${timeMin}`);

        const config: ProxyConfiguration = {
            // https://learn.microsoft.com/en-us/graph/api/user-list-events?view=graph-rest-1.0&tabs=http
            endpoint: '/v1.0/me/events',
            params: {
                $select:
                    'id,subject,body,bodyPreview,importance,sensitivity,start,end,location,isAllDay,isCancelled,isOrganizer,recurrence,responseRequested,responseStatus,attendees,organizer,webLink,onlineMeeting,onlineMeetingProvider',
                $filter: `start/dateTime ge '${timeMin}'`, // Filter events after the specified time
                $orderby: 'start/dateTime asc' // Order by start time
            },
            paginate: {
                type: 'link',
                response_path: 'value',
                link_path_in_response_body: '@odata.nextLink',
                limit: 50,
                limit_name_in_request: '$top'
            },
            retries: 10
        };

        for await (const eventsPage of nango.paginate<OutlookEvent>(config)) {
            const processedEvents = eventsPage.map(toEvent);

            if (processedEvents.length > 0) {
                await nango.batchSave(processedEvents, 'OutlookCalendarEvent');
            }
        }
        await nango.deleteRecordsFromPreviousExecutions('OutlookCalendarEvent');
    }
}); // 1 month

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
