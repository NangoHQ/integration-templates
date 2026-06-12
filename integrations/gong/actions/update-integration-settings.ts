import { z } from 'zod';
import { createAction } from 'nango';

const IntegrationTypeSettingSchema = z.object({
    integrationType: z.enum(['EMAIL_COMPOSER', 'ACCOUNT_PAGES', 'DIALER']),
    allowedOrigin: z.string()
});

const InputSchema = z.object({
    integrationTypeSettings: z.array(IntegrationTypeSettingSchema).describe('List of integration type settings to update.')
});

const ProviderResponseSchema = z.object({
    requestId: z.string(),
    integrationId: z.union([z.string(), z.number()]).optional().describe('Integration ID. Parse as Long or BigInt.')
});

const OutputSchema = z.object({
    requestId: z.string().describe('Gong request reference ID.'),
    integrationId: z.string().optional().describe('Integration ID to be used in requests to the API.')
});

const action = createAction({
    description: 'Update Gong integration settings.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-integration-settings',
        group: 'Integration Settings'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['api:integration-settings:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://help.gong.io/apidocs/integration-settings-v2integration-settings-1
            endpoint: '/v2/integration-settings',
            data: {
                integrationTypeSettings: input.integrationTypeSettings
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            requestId: providerResponse.requestId,
            ...(providerResponse.integrationId !== undefined && {
                integrationId: typeof providerResponse.integrationId === 'number' ? String(providerResponse.integrationId) : providerResponse.integrationId
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
