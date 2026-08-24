import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderResponseSchema = z.object({
    resourceNames: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    resourceNames: z.array(z.string()).optional()
});

const action = createAction({
    description: 'List customer accounts directly accessible to the authenticated user.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const developerToken = connection.connection_config?.['developer_token'];
        if (!developerToken || typeof developerToken !== 'string') {
            throw new nango.ActionError({
                type: 'missing_config',
                message: 'developer_token is required in connection config'
            });
        }

        const response = await nango.get({
            // https://developers.google.com/google-ads/api/docs/account-management/listing-accounts
            endpoint: 'v21/customers:listAccessibleCustomers',
            headers: {
                'developer-token': developerToken
            },
            retries: 3
        });

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerData.resourceNames !== undefined && { resourceNames: providerData.resourceNames })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
