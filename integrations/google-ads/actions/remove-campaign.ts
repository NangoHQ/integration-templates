import { z } from 'zod';
import { createAction } from 'nango';
import { getDeveloperToken } from '../helpers/get-developer-token.js';

const InputSchema = z.object({
    resourceName: z.string().describe('Campaign resource name. Example: "customers/1781900691/campaigns/24036861751"'),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through an MCC hierarchy. Example: "3608201627"')
});

const ProviderResponseSchema = z.object({
    results: z
        .array(
            z.object({
                resourceName: z.string()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    resourceName: z.string()
});

const action = createAction({
    description: 'Remove a campaign by resource name.',
    version: '1.0.2',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const developerToken = await getDeveloperToken(nango);
        if (!developerToken) {
            throw new nango.ActionError({
                type: 'missing_config',
                message: 'developer_token is required in connection config'
            });
        }

        const match = input.resourceName.match(/^customers\/(\d+)\/campaigns\/(\d+)$/);
        if (!match) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'resourceName must be in the format customers/{customerId}/campaigns/{campaignId}',
                resourceName: input.resourceName
            });
        }

        const customerId = match[1];
        if (!customerId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Could not extract customerId from resourceName',
                resourceName: input.resourceName
            });
        }

        // https://developers.google.com/google-ads/api/docs/mutating/service-mutates
        const response = await nango.post({
            endpoint: `/v25/customers/${encodeURIComponent(customerId)}/campaigns:mutate`,
            headers: {
                'developer-token': developerToken,
                ...(input.loginCustomerId && { 'login-customer-id': input.loginCustomerId })
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

        if (!providerResponse.results || providerResponse.results.length === 0) {
            throw new nango.ActionError({
                type: 'remove_failed',
                message: 'Campaign removal did not return a result',
                resourceName: input.resourceName
            });
        }

        const firstResult = providerResponse.results[0];
        if (!firstResult) {
            throw new nango.ActionError({
                type: 'remove_failed',
                message: 'Campaign removal did not return a result',
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
