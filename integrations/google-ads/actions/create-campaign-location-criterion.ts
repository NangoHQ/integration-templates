import { z } from 'zod';
import { createAction } from 'nango';
import { getDeveloperToken } from '../helpers/get-developer-token.js';

const InputSchema = z.object({
    customerId: z.string().describe('Customer ID. Example: "1781900691"'),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through an MCC hierarchy. Example: "3608201627"'),
    campaign: z.string().describe('Campaign resource name. Example: "customers/1781900691/campaigns/24027360183"'),
    geoTargetConstant: z.string().describe('Geo target constant resource name. Example: "geoTargetConstants/21167"')
});

const ProviderResponseSchema = z.object({
    results: z.array(z.object({ resourceName: z.string() })).optional(),
    partialFailureError: z.object({ code: z.number(), message: z.string() }).optional()
});

const OutputSchema = z.object({
    resourceName: z.string()
});

const action = createAction({
    description: 'Add geographic location targeting to a campaign using a geo target constant.',
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

        const response = await nango.post({
            // https://developers.google.com/google-ads/api/rest/reference/rest/v25/customers/campaignCriteria/mutate
            endpoint: `v25/customers/${encodeURIComponent(input.customerId)}/campaignCriteria:mutate`,
            headers: {
                'developer-token': developerToken,
                ...(input.loginCustomerId && { 'login-customer-id': input.loginCustomerId })
            },
            data: {
                operations: [
                    {
                        create: {
                            campaign: input.campaign,
                            location: {
                                geoTargetConstant: input.geoTargetConstant
                            }
                        }
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
                code: providerResponse.partialFailureError.code
            });
        }

        const results = providerResponse.results;
        if (!results || results.length === 0) {
            throw new nango.ActionError({
                type: 'no_results',
                message: 'The mutate operation did not return any results.'
            });
        }

        const firstResult = results[0];
        if (!firstResult) {
            throw new nango.ActionError({
                type: 'no_results',
                message: 'The mutate operation did not return any results.'
            });
        }

        return {
            resourceName: firstResult.resourceName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
