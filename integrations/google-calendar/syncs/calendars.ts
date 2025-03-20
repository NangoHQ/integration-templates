import type { NangoSync, ProxyConfiguration, GoogleCalendar } from '../../models';

/**
 * Fetches Google Calendar data and saves each batch.
 *
 * This asynchronous function constructs a configuration for the Google Calendar API's calendar list endpoint
 * with a preset maximum number of results. It then uses the provided sync client to paginate through the data, saving
 * each page using the client's batch save method.
 *
 * @remark The configuration aligns with the parameters defined in the Google Calendar API documentation.
 */
export default async function fetchData(nango: NangoSync): Promise<void> {
    const maxResults = '100';

    const config: ProxyConfiguration = {
        // https://developers.google.com/calendar/api/v3/reference/calendarList/list
        endpoint: 'calendar/v3/users/me/calendarList',
        params: {
            maxResults
        }
    };

    for await (const eventPage of nango.paginate<GoogleCalendar>(config)) {
        await nango.batchSave<GoogleCalendar>(eventPage, 'GoogleCalendar');
    }
}
