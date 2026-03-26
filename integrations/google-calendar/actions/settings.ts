import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (pageToken) from previous response. Omit for first page.')
});

const SettingSchema = z.object({
    id: z.string().describe('The id of the user setting'),
    value: z.string().describe('Value of the user setting'),
    etag: z.string().optional().describe('ETag of the resource'),
    kind: z.string().optional().describe('Type of the resource')
});

const OutputSchema = z.object({
    settings: z.array(SettingSchema).describe('List of user settings'),
    nextPageToken: z.string().optional().describe('Pagination cursor for next page, or omitted if no more pages')
});

const action = createAction({
    description: 'Fetch all user settings across pages from Google Calendar',
    version: '3.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/settings',
        group: 'Settings'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const cursor = input?.cursor;

        // https://developers.google.com/workspace/calendar/api/v3/reference/settings/list
        const response = await nango.get({
            endpoint: '/calendar/v3/users/me/settings',
            params: {
                maxResults: 250,
                ...(cursor && { pageToken: cursor })
            },
            retries: 3
        });

        const data = response.data;

        return {
            settings: (data.items || []).map((item: any) => ({
                id: item.id,
                value: item.value,
                etag: item.etag,
                kind: item.kind
            })),
            ...(data.nextPageToken ? { nextPageToken: data.nextPageToken } : {})
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
