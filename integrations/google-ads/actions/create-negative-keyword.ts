import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_id: z.string().describe('Customer ID. Example: "1781900691"'),
    login_customer_id: z.string().describe('Manager account ID for access. Example: "3608201627"'),
    ad_group_id: z.string().describe('Ad group ID. Example: "197714341345"'),
    text: z.string().describe('Keyword text. Example: "free"'),
    match_type: z.enum(['EXACT', 'PHRASE', 'BROAD']).describe('Keyword match type. Example: "EXACT"'),
    developer_token: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
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
    resource_name: z.string()
});

const action = createAction({
    description: 'Add a negative keyword criterion to an ad group so its ads stop showing for that term.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const customerId = encodeURIComponent(input.customer_id);
        const adGroup = `customers/${input.customer_id}/adGroups/${input.ad_group_id}`;

        const response = await nango.post({
            // https://developers.google.com/google-ads/api/docs/mutating/service-mutates
            endpoint: `v21/customers/${customerId}/adGroupCriteria:mutate`,
            headers: {
                'developer-token': input.developer_token,
                'login-customer-id': input.login_customer_id
            },
            data: {
                operations: [
                    {
                        create: {
                            adGroup,
                            keyword: {
                                text: input.text,
                                matchType: input.match_type
                            },
                            negative: true
                        }
                    }
                ]
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const result = providerResponse.results?.[0];
        if (!result) {
            throw new nango.ActionError({
                type: 'no_result',
                message: 'Mutation succeeded but returned no results.'
            });
        }

        return {
            resource_name: result.resourceName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
