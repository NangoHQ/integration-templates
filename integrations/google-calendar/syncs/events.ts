import type { NangoSync, GoogleCalendarEvent, ProxyConfiguration } from '../../models';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    oneMonthAgo.setHours(0, 0, 0, 0);
    const timeMin = oneMonthAgo.toISOString();

    const maxResults = '100';

    const endpoint = `calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}`;

    const config: ProxyConfiguration = {
        // https://developers.google.com/calendar/api/v3/reference/events/list
        endpoint,
        params: {
            maxResults
        },
        retries: 10
    };

    for await (const eventPage of nango.paginate<GoogleCalendarEvent>(config)) {
        await nango.batchSave<GoogleCalendarEvent>(eventPage, 'GoogleCalendarEvent');
    }
}
