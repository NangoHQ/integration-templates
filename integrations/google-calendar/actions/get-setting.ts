import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    settingId: z
        .string()
        .describe('The ID of the user setting. Examples: "timezone", "locale", "dateFieldOrder", "format24HourTime", "weekStart", "autoAddHangouts"')
});

const OutputSchema = z.object({
    kind: z.string().describe('Type of the resource'),
    etag: z.string().describe('ETag of the resource'),
    id: z.string().describe('The ID of the user setting'),
    value: z.string().describe('Value of the user setting')
});

const action = createAction({
    description: 'Retrieve a single Google Calendar user setting by ID',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/get-setting',
        group: 'Settings'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/calendar.settings.readonly'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.google.com/workspace/calendar/api/v3/reference/settings/get
        const response = await nango.get({
            endpoint: `/calendar/v3/users/me/settings/${input.settingId}`,
            retries: 3
        });

        return {
            kind: response.data.kind,
            etag: response.data.etag,
            id: response.data.id,
            value: response.data.value
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
