import { createAction } from 'nango';
import type { GoogleCalendarSettingsResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import type { CalendarSetting } from '../models.js';
import { SettingsResponse } from '../models.js';
import { z } from 'zod';

const action = createAction({
    description: 'Fetch all user settings from Google Calendar',
    version: '2.0.0',

    endpoint: {
        method: 'GET',
        path: '/settings',
        group: 'Users'
    },

    input: z.void(),
    output: SettingsResponse,
    scopes: ['https://www.googleapis.com/auth/calendar.settings.readonly'],

    exec: async (nango): Promise<SettingsResponse> => {
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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
