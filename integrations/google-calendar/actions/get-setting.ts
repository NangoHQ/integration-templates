/**
 * Instructions: Returns a single user setting by setting ID
 *
 * API Docs: https://developers.google.com/calendar/api/v3/reference/settings/get
 */
import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const GetSettingInput = z.object({
    setting_id: z.string()
});

const GetSettingOutput = z.object({
    kind: z.string(),
    etag: z.string(),
    id: z.string(),
    value: z.string()
});

const action = createAction({
    description: 'Returns a single user setting by setting ID',
    version: '1.0.0',
    // https://developers.google.com/calendar/api/v3/reference/settings/get
    endpoint: {
        method: 'GET',
        path: '/setting',
        group: 'Settings'
    },
    input: GetSettingInput,
    output: GetSettingOutput,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    exec: async (nango, input): Promise<z.infer<typeof GetSettingOutput>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/calendar/api/v3/reference/settings/get
            endpoint: `/calendar/v3/users/me/settings/${encodeURIComponent(input.setting_id)}`,
            retries: 3
        };

        const response = await nango.get(config);

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
