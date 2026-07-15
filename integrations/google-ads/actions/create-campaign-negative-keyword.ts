import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('Google Ads customer ID. Example: "1781900691"'),
    campaignId: z.string().describe('Campaign ID. Example: "24027360183"'),
    text: z.string().describe('Negative keyword text. Example: "free"'),
    matchType: z.enum(['EXACT', 'PHRASE', 'BROAD']).describe('Keyword match type.'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const ProviderResponseSchema = z.object({
    results: z
        .array(
            z.object({
                resourceName: z.string().optional()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    resourceName: z.string().describe('Resource name of the created campaign criterion. Example: "customers/1781900691/campaignCriteria/24027360183~123456789"')
});

const action = createAction({
    description: 'Add a negative keyword criterion at the campaign level.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const campaignResourceName = `customers/${input.customerId}/campaigns/${input.campaignId}`;

        // https://developers.google.com/google-ads/api/docs/mutating/service-mutates
        const response = await nango.post({
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/campaignCriteria:mutate`,
            headers: {
                'developer-token': input.developerToken,
                'login-customer-id': '3608201627'
            },
            data: {
                operations: [
                    {
                        create: {
                            campaign: campaignResourceName,
                            keyword: {
                                text: input.text,
                                matchType: input.matchType
                            },
                            negative: true
                        }
                    }
                ]
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'No data returned from Google Ads API.'
            });
        }

        const parsed = ProviderResponseSchema.parse(response.data);
        const result = parsed.results?.[0];

        if (!result || !result.resourceName) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create campaign negative keyword. No resource name returned.'
            });
        }

        return {
            resourceName: result.resourceName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
