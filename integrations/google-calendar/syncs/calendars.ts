import type { NangoSync, ProxyConfiguration, GoogleCalendar } from '../../models';

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
