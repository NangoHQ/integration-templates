import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('The Google Ads customer ID. Example: "1781900691"'),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through an MCC hierarchy. Example: "3608201627"'),
    resourceName: z
        .string()
        .describe('The resource name of the campaign criterion to remove. Example: "customers/1781900691/campaignCriteria/24027360183~2515302470834"'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const ProviderResultSchema = z.object({
    resourceName: z.string()
});

const ProviderResponseSchema = z.object({
    results: z.array(ProviderResultSchema).optional(),
    partialFailureError: z
        .object({
            code: z.number(),
            message: z.string(),
            details: z.array(z.unknown()).optional()
        })
        .optional()
});

const OutputSchema = z.object({
    resourceName: z.string().describe('The resource name of the removed campaign criterion.')
});

const action = createAction({
    description: 'Remove a campaign-level criterion (negative keyword or location target) by resource name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/google-ads/api/docs/mutating/service-mutates
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/campaignCriteria:mutate`,
            headers: {
                'developer-token': input.developerToken,
                ...(input.loginCustomerId !== undefined && { 'login-customer-id': input.loginCustomerId })
            },
            data: {
                operations: [
                    {
                        remove: input.resourceName
                    }
                ]
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.partialFailureError) {
            throw new nango.ActionError({
                type: 'partial_failure',
                message: providerResponse.partialFailureError.message,
                customerId: input.customerId,
                resourceName: input.resourceName
            });
        }

        const results = providerResponse.results;
        if (!results || results.length === 0) {
            throw new nango.ActionError({
                type: 'remove_failed',
                message: 'Campaign criterion removal did not return a result.',
                customerId: input.customerId,
                resourceName: input.resourceName
            });
        }

        const firstResult = results[0];
        if (!firstResult) {
            throw new nango.ActionError({
                type: 'remove_failed',
                message: 'Campaign criterion removal did not return a result.',
                customerId: input.customerId,
                resourceName: input.resourceName
            });
        }

        return {
            resourceName: firstResult.resourceName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
