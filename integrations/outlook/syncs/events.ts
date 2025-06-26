import type { NangoSync, OutlookCalendarEvent, OptionalBackfillSetting, ProxyConfiguration } from '../../models';
import type { OutlookEvent } from '../types';
import { toEvent } from '../mappers/to-event.js';

const DEFAULT_BACKFILL_MS = 30 * 24 * 60 * 60 * 1000; // 1 month

export default async function fetchData(nango: NangoSync): Promise<void> {
    const metadata = await nango.getMetadata<OptionalBackfillSetting>();
    const backfillMilliseconds = metadata?.backfillPeriodMs || DEFAULT_BACKFILL_MS;
    const backfillDate = new Date(Date.now() - backfillMilliseconds);
    const timeMin = backfillDate.toISOString();

    await nango.log(`Fetching Outlook events from ${timeMin}`);

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
            limit: 1,
            limit_name_in_request: '$top'
        },
        retries: 10
    };

    for await (const eventsPage of nango.paginate<OutlookEvent>(config)) {
        const processedEvents = eventsPage.map(toEvent);

        if (processedEvents.length > 0) {
            await nango.batchSave<OutlookCalendarEvent>(processedEvents, 'OutlookCalendarEvent');
        }
    }
}
