import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
        maxResults: z.number().optional().describe('Maximum number of entries returned on one result page. By default 100, never larger than 250.')
    })
    .describe('Input for listing calendar settings');

const ProviderSettingSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string(),
    value: z.string().optional()
});

const SettingSchema = z
    .object({
        kind: z.string().optional().describe('Type of the resource ("calendar#setting").'),
        etag: z.string().optional().describe('ETag of the resource.'),
        id: z.string().describe('The ID of the user setting.'),
        value: z.string().optional().describe('Value of the user setting. The format depends on the setting ID.')
    })
    .describe('A single calendar user setting');

const OutputSchema = z
    .object({
        items: z.array(SettingSchema).describe('List of user settings.'),
        nextPageToken: z.string().optional().describe('Token used to access the next page of results. Omitted if no further results are available.'),
        nextSyncToken: z.string().optional().describe('Token used later to retrieve only entries that have changed since this result.')
    })
    .describe('Output for listing calendar settings');

/**
 * @tags: [read]
 * @tagReason: Reads all user settings for the authenticated user from Google Calendar.
 * @pitfalls: Settings that still have their default value might not be returned by the API.
 */
const action = createAction({
    description: 'List calendar settings',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.settings.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.google.com/workspace/calendar/api/v3/reference/settings/list
            endpoint: '/calendar/v3/users/me/settings',
            params: {
                ...(input.cursor !== undefined && { pageToken: input.cursor }),
                ...(input.maxResults !== undefined && { maxResults: String(input.maxResults) })
            },
            retries: 3
        });

        const ProviderResponseSchema = z.object({
            kind: z.string().optional(),
            etag: z.string().optional(),
            nextPageToken: z.string().optional(),
            nextSyncToken: z.string().optional(),
            items: z.array(ProviderSettingSchema).optional()
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            items:
                providerData.items?.map((item) => ({
                    id: item.id,
                    ...(item.kind != null && { kind: item.kind }),
                    ...(item.etag != null && { etag: item.etag }),
                    ...(item.value != null && { value: item.value })
                })) ?? [],
            ...(providerData.nextPageToken != null && { nextPageToken: providerData.nextPageToken }),
            ...(providerData.nextSyncToken != null && { nextSyncToken: providerData.nextSyncToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
