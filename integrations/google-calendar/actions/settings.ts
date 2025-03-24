import type { NangoAction, SettingsResponse, CalendarSetting } from '../../models';
import type { GoogleCalendarSettingsResponse } from '../types';

export default async function runAction(nango: NangoAction): Promise<SettingsResponse> {
    const settings: CalendarSetting[] = [];
    let pageToken: string | undefined;

    do {
        const { data: response } = await nango.get<GoogleCalendarSettingsResponse>({
            endpoint: '/calendar/v3/users/me/settings',
            params: pageToken ? { pageToken: pageToken } : ''
        });

        if (!response || !response.items) {
            throw new Error('Invalid response format from Google Calendar API');
        }

        settings.push(...response.items);
        pageToken = response.nextPageToken;
    } while (pageToken);

    return { settings };
}
