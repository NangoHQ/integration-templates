import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        settingId: z.string().describe('The ID of the user setting to retrieve. Example: "timezone"')
    })
    .describe('Input for retrieving a single Google Calendar user setting');

const ProviderSettingSchema = z.object({
    kind: z.string().optional(),
    etag: z.string().optional(),
    id: z.string(),
    value: z.string()
});

const OutputSchema = z
    .object({
        id: z.string().describe('The ID of the user setting'),
        value: z.string().describe('The value of the user setting'),
        kind: z.string().optional().describe('Type of the resource'),
        etag: z.string().optional().describe('ETag of the resource')
    })
    .describe('A single Google Calendar user setting');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single Google Calendar user setting by ID from the provider.
 * @pitfalls: Settings that still have their default value may not be returned by the API, causing a not_found error even for valid setting IDs. All values are returned as UTF-8 strings, including booleans and numbers.
 */
const action = createAction({
    description: 'Retrieve a single Google Calendar user setting by ID',
    version: '2.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.settings.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.google.com/workspace/calendar/api/v3/reference/settings/get
            endpoint: `/calendar/v3/users/me/settings/${encodeURIComponent(input.settingId)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Setting ${input.settingId} not found`
            });
        }

        const providerSetting = ProviderSettingSchema.parse(response.data);

        return {
            id: providerSetting.id,
            value: providerSetting.value,
            ...(providerSetting.kind != null && { kind: providerSetting.kind }),
            ...(providerSetting.etag != null && { etag: providerSetting.etag })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
