import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({}).describe('No input required');

const SettingSchema = z
    .object({
        id: z.string().describe('The id of the user setting. Example: "timezone"'),
        value: z.string().describe('Value of the user setting. The format depends on the setting ID.'),
        kind: z.string().optional().describe('Type of the resource. Example: "calendar#setting"'),
        etag: z.string().optional().describe('ETag of the resource.')
    })
    .describe('A single user setting');

const OutputSchema = z
    .object({
        items: z.array(SettingSchema).describe('All user settings fetched across pages.')
    })
    .describe('All user settings for the authenticated user');

const ProviderSettingsSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    nextPageToken: z.string().optional(),
    nextSyncToken: z.string().optional(),
    items: z
        .array(
            z.object({
                kind: z.string().optional(),
                etag: z.string().optional(),
                id: z.string(),
                value: z.string()
            })
        )
        .optional()
});

/**
 * @tags: [read]
 * @tagReason: Reads all user settings from the Google Calendar API.
 * @pitfalls: Settings that still have their default value may be omitted; a missing setting ID should be treated as the documented default.
 */
const action = createAction({
    description: 'Fetch all user settings across pages from Google Calendar',
    version: '3.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.settings.readonly'
    ],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const allItems: Array<{ id: string; value: string; kind?: string; etag?: string }> = [];
        let pageToken: string | undefined;

        do {
            const config: ProxyConfiguration = {
                // https://developers.google.com/workspace/calendar/api/v3/reference/settings/list
                endpoint: '/calendar/v3/users/me/settings',
                params: {
                    ...(pageToken !== undefined && { pageToken })
                },
                retries: 3
            };

            const response = await nango.get(config);
            const parsed = ProviderSettingsSchema.parse(response.data);

            if (parsed.items) {
                for (const item of parsed.items) {
                    allItems.push({
                        id: item.id,
                        value: item.value,
                        ...(item.kind !== undefined && { kind: item.kind }),
                        ...(item.etag !== undefined && { etag: item.etag })
                    });
                }
            }

            pageToken = parsed.nextPageToken;
        } while (pageToken);

        return {
            items: allItems
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
