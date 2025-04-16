import type { NangoSync, GoogleCalendarEvent, ProxyConfiguration } from '../../models';
import type { GoogleCalendarEventsResponse } from '../types';
import { toEvent } from '../mappers/to-event.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    let endpoint = 'calendar/v3/calendars/primary/events';
    const params: Record<string, string> = {
        maxResults: '100'
    };

    if (nango.lastSyncDate) {
        params['updatedMin'] = new Date(nango.lastSyncDate).toISOString();
    } else {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        oneMonthAgo.setHours(0, 0, 0, 0);
        params['timeMin'] = oneMonthAgo.toISOString();
    }

    const config: ProxyConfiguration = {
        // https://developers.google.com/calendar/api/v3/reference/events/list
        endpoint,
        params,
        paginate: {
            response_path: 'items'
        },
        retries: 10
    };

    for await (const eventPage of nango.paginate<GoogleCalendarEventsResponse>(config)) {
        const mappedEvents = eventPage.map(toEvent);
        await nango.batchSave<GoogleCalendarEvent>(mappedEvents, 'GoogleCalendarEvent');
    }
}
