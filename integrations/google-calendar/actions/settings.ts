import type { NangoAction, SettingsResponse, CalendarSetting, ProxyConfiguration } from '../../models.js';
import type { GoogleCalendarSettingsResponse } from '../types.js';

export default async function runAction(nango: NangoAction): Promise<SettingsResponse> {
    const settings: CalendarSetting[] = [];
    let pageToken: string | undefined;

    do {
        const proxyConfig: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/settings/list
            endpoint: '/calendar/v3/users/me/settings',
            params: pageToken ? { pageToken: pageToken } : '',
            retries: 3
        };

        const { data: response } = await nango.get<GoogleCalendarSettingsResponse>(proxyConfig);

        if (!response || !response.items) {
            throw new nango.ActionError({
                message: 'Invalid response format from Google Calendar API'
            });
        }

        settings.push(...response.items);
        pageToken = response.nextPageToken;
    } while (pageToken);

    return { settings };
}
