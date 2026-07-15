import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    resourceName: z.string().describe('Resource name of the conversion action to remove. Example: customers/123/conversionActions/456'),
    loginCustomerId: z
        .string()
        .optional()
        .describe('Manager account ID (login-customer-id) required when accessing a client account through an MCC hierarchy. Example: "3608201627"'),
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
    resourceName: z.string().optional()
});

const action = createAction({
    description: 'Remove a conversion action by resource name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const match = input.resourceName.match(/^customers\/(\d+)\/conversionActions\/(\d+)$/);
        if (!match) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'resourceName must be in the format customers/{customerId}/conversionActions/{conversionActionId}'
            });
        }
        const customerId = match[1];
        if (!customerId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Could not extract customerId from resourceName'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.google.com/google-ads/api/docs/mutating/service-mutates
            endpoint: `v21/customers/${encodeURIComponent(customerId)}/conversionActions:mutate`,
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
        };

        const response = await nango.post(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Empty response from Google Ads API'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const result = providerResponse.results?.[0];

        return {
            ...(result?.resourceName != null && { resourceName: result.resourceName })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
