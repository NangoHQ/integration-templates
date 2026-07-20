import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    resource_name: z.string().describe('Ad group criterion resource name. Example: customers/1781900691/adGroupCriteria/197714341345~2491223357239'),
    login_customer_id: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through an MCC hierarchy. Example: 3608201627'),
    developer_token: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
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
    resource_name: z.string().optional(),
    success: z.boolean()
});

const action = createAction({
    description: 'Remove a keyword criterion from an ad group.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const match = input.resource_name.match(/^customers\/(\d+)\/adGroupCriteria\/(.+)$/);
        if (!match) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Invalid ad group criterion resource name format. Expected: customers/{customerId}/adGroupCriteria/{adGroupId}~{criterionId}'
            });
        }

        const customerId = match[1];
        if (!customerId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Invalid ad group criterion resource name format. Expected: customers/{customerId}/adGroupCriteria/{adGroupId}~{criterionId}'
            });
        }

        // https://developers.google.com/google-ads/api/reference/rpc/v21/AdGroupCriterionService/MutateAdGroupCriteria
        const response = await nango.post({
            endpoint: `v21/customers/${encodeURIComponent(customerId)}/adGroupCriteria:mutate`,
            headers: {
                'developer-token': input.developer_token,
                ...(input.login_customer_id && { 'login-customer-id': input.login_customer_id })
            },
            data: {
                operations: [
                    {
                        remove: input.resource_name
                    }
                ]
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            ...(providerResponse.results && providerResponse.results[0] && providerResponse.results[0].resourceName != null
                ? { resource_name: providerResponse.results[0].resourceName }
                : {}),
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
