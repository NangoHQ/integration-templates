import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    userId: z.string().describe('Gong unique numeric identifier for the user. Example: "7254376376091929519"')
});

const UserSettingsHistoryItemSchema = z.object({
    setting: z.string().nullish(),
    value: z.boolean().nullish(),
    time: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    userSettingsHistory: z.array(UserSettingsHistoryItemSchema).nullish()
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    userSettingsHistory: z.array(UserSettingsHistoryItemSchema).nullish()
});

const action = createAction({
    description: 'Retrieve the settings change history for a specific Gong user.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:users:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.gong.io/docs/what-the-gong-api-provides
            endpoint: `/v2/users/${encodeURIComponent(input.userId)}/settings-history`,
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerData.requestId !== undefined && { requestId: providerData.requestId }),
            ...(providerData.userSettingsHistory !== undefined && { userSettingsHistory: providerData.userSettingsHistory })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
