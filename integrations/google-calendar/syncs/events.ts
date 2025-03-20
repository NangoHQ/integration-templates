import type { NangoSync, GoogleCalendarEvent, ProxyConfiguration } from '../../models';

/**
 * Retrieves events from the primary Google Calendar starting from one month ago and saves them.
 *
 * This asynchronous function computes a cutoff date (one month prior to the current date at midnight) and converts it to an ISO string.
 * It then constructs a configuration for fetching events from the Google Calendar API with a maximum of 100 results per page.
 * The function uses asynchronous pagination to retrieve event pages and saves each batch using a batch-save mechanism.
 */
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
        }
    };

    for await (const eventPage of nango.paginate<GoogleCalendarEvent>(config)) {
        await nango.batchSave<GoogleCalendarEvent>(eventPage, 'GoogleCalendarEvent');
    }
}
