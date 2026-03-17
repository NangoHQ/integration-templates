import { z } from 'zod';
import { createAction } from 'nango';

const SettingSchema = z.object({
    id: z.string().describe('The id of the user setting'),
    value: z.string().describe('Value of the user setting'),
    kind: z.string().optional().describe('Type of the resource'),
    etag: z.string().optional().describe('ETag of the resource')
});

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Omit for first page.'),
    maxResults: z.number().int().min(1).max(250).optional().describe('Maximum number of entries returned on one result page. Default is 100. Maximum is 250.')
});

const OutputSchema = z.object({
    items: z.array(SettingSchema).describe('List of user settings'),
    nextPageToken: z.string().optional().describe('Token used to access the next page of results. Omitted if no further results are available.')
});

const action = createAction({
    description: 'List calendar settings',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-settings',
        group: 'Settings'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: [
        'https://www.googleapis.com/auth/calendar.settings.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar'
    ],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/calendar/api/v3/reference/settings/list
        const response = await nango.get({
            endpoint: '/calendar/v3/users/me/settings',
            params: {
                ...(input.cursor && { pageToken: input.cursor }),
                ...(input.maxResults && { maxResults: input.maxResults.toString() })
            },
            retries: 3
        });

        const data = response.data;

        return {
            items: (data.items || []).map((setting: any) => ({
                id: setting.id,
                value: setting.value,
                kind: setting.kind,
                etag: setting.etag
            })),
            nextPageToken: data.nextPageToken || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
