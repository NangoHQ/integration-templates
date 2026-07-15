import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    resource_name: z.string().describe('The resource name of the ad group ad to remove. Example: "customers/1781900691/adGroupAds/197714341345~816946667444"'),
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
    description: 'Remove an ad from an ad group by resource name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const resourceName = input.resource_name;
        const customerIdMatch = resourceName.match(/^customers\/(\d+)\/adGroupAds\//);
        if (!customerIdMatch) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Invalid resource_name format. Expected "customers/{customerId}/adGroupAds/{adGroupId}~{adId}".'
            });
        }
        const customerId = customerIdMatch[1];
        if (!customerId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Could not extract customer ID from resource_name.'
            });
        }

        const response = await nango.post({
            // https://developers.google.com/google-ads/api/docs/mutating/service-mutates
            endpoint: `v21/customers/${encodeURIComponent(customerId)}/adGroupAds:mutate`,
            data: {
                operations: [
                    {
                        remove: resourceName
                    }
                ]
            },
            headers: {
                'developer-token': input.developer_token,
                'login-customer-id': '3608201627'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const result = providerResponse.results?.[0];
        if (!result) {
            throw new nango.ActionError({
                type: 'remove_failed',
                message: 'Remove operation did not return a result.'
            });
        }

        return {
            resource_name: result.resourceName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
