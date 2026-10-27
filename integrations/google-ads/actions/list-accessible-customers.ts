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
    version: '1.0.3',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.google.com/google-ads/api/docs/account-management/listing-accounts
            endpoint: 'v26/customers:listAccessibleCustomers',
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
