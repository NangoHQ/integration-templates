import type { NangoSync, GoogleCalendarEvent, ProxyConfiguration, CalendarMetadata } from '../../models';
import type { GoogleCalendarEventsResponse } from '../types';
import { toEvent } from '../mappers/to-event.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const metadata = await nango.getMetadata<CalendarMetadata>();
    const params: Record<string, string> = {
        maxResults: '100',
        singleEvents: metadata && 'singleEvents' in metadata ? metadata?.singleEvents.toString() : 'true'
    };

    if (nango.lastSyncDate) {
        params['updatedMin'] = new Date(nango.lastSyncDate).toISOString();
    } else {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        oneMonthAgo.setHours(0, 0, 0, 0);
        params['timeMin'] = oneMonthAgo.toISOString();
    }

    const calendarsToSync = metadata?.calendarsToSync || ['primary'];

    for await (const calendarID of calendarsToSync) {
        const endpoint = `calendar/v3/calendars/${encodeURIComponent(calendarID)}/events`;
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/events/list
            endpoint,
            params,
            retries: 10
        };
        for await (const eventPage of nango.paginate<GoogleCalendarEventsResponse>(config)) {
            const mappedEvents = eventPage.map(toEvent);
            await nango.batchSave<GoogleCalendarEvent>(mappedEvents, 'GoogleCalendarEvent');
        }
    }
}
