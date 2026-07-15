import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('Customer ID. Example: "1781900691"'),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through an MCC hierarchy. Example: "3608201627"'),
    campaign: z.string().describe('Campaign resource name. Example: "customers/1781900691/campaigns/24027360183"'),
    geoTargetConstant: z.string().describe('Geo target constant resource name. Example: "geoTargetConstants/21167"'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
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
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.google.com/google-ads/api/rest/reference/rest/v21/customers/campaignCriteria/mutate
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/campaignCriteria:mutate`,
            headers: {
                'developer-token': input.developerToken,
                ...(input.loginCustomerId !== undefined && { 'login-customer-id': input.loginCustomerId })
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
