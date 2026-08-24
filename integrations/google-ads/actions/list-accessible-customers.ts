import { z } from 'zod';
import { createAction } from 'nango';
import { getDeveloperToken } from '../helpers/get-developer-token.js';

const InputSchema = z.object({});

const ProviderResponseSchema = z.object({
    resourceNames: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    resourceNames: z.array(z.string()).optional()
});

const action = createAction({
    description: 'List customer accounts directly accessible to the authenticated user.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const developerToken = await getDeveloperToken(nango);
        if (!developerToken) {
            throw new nango.ActionError({
                type: 'missing_config',
                message: 'developer_token is required in connection config'
            });
        }

        const response = await nango.get({
            // https://developers.google.com/google-ads/api/docs/account-management/listing-accounts
            endpoint: 'v25/customers:listAccessibleCustomers',
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
