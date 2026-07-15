import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    resourceName: z.string().describe('Ad group resource name. Example: "customers/1781900691/adGroups/197714341425"'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const ProviderMutateResponseSchema = z.object({
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
    description: 'Remove an ad group by resource name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const resourceName = input.resourceName;
        const match = resourceName.match(/^customers\/([^/]+)\/adGroups\/([^/]+)$/);

        if (!match) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Invalid ad group resource name format. Expected: customers/{customerId}/adGroups/{adGroupId}'
            });
        }

        const customerId = match[1];

        if (!customerId) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Could not extract customer ID from resource name.'
            });
        }

        // https://developers.google.com/google-ads/api/docs/mutating/service-mutates
        const response = await nango.post({
            endpoint: `v21/customers/${encodeURIComponent(customerId)}/adGroups:mutate`,
            data: {
                operations: [
                    {
                        remove: resourceName
                    }
                ]
            },
            headers: {
                'developer-token': input.developerToken,
                'login-customer-id': '3608201627'
            },
            retries: 1
        });

        const parsed = ProviderMutateResponseSchema.parse(response.data);
        const resultResourceName = parsed.results?.[0]?.resourceName;

        if (!resultResourceName) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Provider did not return a resource name for the removed ad group.'
            });
        }

        return {
            resourceName: resultResourceName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
