import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const IntegrationSettingsSchema = z.object({
    id: z.string().nullish()
});

const ProviderResponseSchema = z.object({
    requestId: z.string().optional(),
    integrationSettings: IntegrationSettingsSchema.nullish()
});

const OutputSchema = z.object({
    requestId: z.string().optional(),
    integrationSettings: IntegrationSettingsSchema.nullish()
});

const action = createAction({
    description: 'Retrieve Gong integration settings.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:integration-settings:write'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://help.gong.io/docs/what-the-gong-api-provides
            endpoint: '/v2/integration-settings',
            retries: 3
        });

        const data = ProviderResponseSchema.parse(response.data);

        return {
            ...(data.requestId !== undefined && { requestId: data.requestId }),
            ...(data.integrationSettings !== undefined && { integrationSettings: data.integrationSettings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
