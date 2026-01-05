/**
 * Instructions: Returns all user settings for the authenticated user
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/settings/list
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const ListSettingsInput = z.object({
    maxResults: z.number().optional(),
    pageToken: z.string().optional()
});

const ListSettingsOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    nextPageToken: z.string().optional(),
    items: z.array(z.any())
});

const action = createAction({
    description: 'Returns all user settings for the authenticated user',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/settings/list
    endpoint: {
        method: 'GET',
        path: '/settings/list',
        group: 'Settings'
    },
    input: ListSettingsInput,
    output: ListSettingsOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof ListSettingsOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/settings/list
            endpoint: '/calendar/v3/users/me/settings',
            params: {
                ...(input.maxResults && { maxResults: input.maxResults.toString() }),
                ...(input.pageToken && { pageToken: input.pageToken })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            nextPageToken: response.data.nextPageToken,
            items: response.data.items || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
