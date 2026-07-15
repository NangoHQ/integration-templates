import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    resource_name: z.string().describe('The campaign budget resource name. Example: "customers/123/campaignBudgets/456"'),
    developer_token: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const OutputSchema = z.object({
    resource_name: z.string().optional()
});

const ProviderMutateResponseSchema = z.object({
    results: z
        .array(
            z.object({
                resourceName: z.string().optional()
            })
        )
        .optional()
});

const ProviderErrorBodySchema = z.object({
    error: z
        .object({
            details: z
                .array(
                    z
                        .object({
                            errors: z
                                .array(
                                    z
                                        .object({
                                            message: z.string().optional(),
                                            errorCode: z
                                                .object({
                                                    campaignBudgetError: z.string().optional()
                                                })
                                                .optional()
                                        })
                                        .optional()
                                )
                                .optional()
                        })
                        .passthrough()
                )
                .optional()
        })
        .optional()
});

const action = createAction({
    description: 'Remove an unused campaign budget by resource name.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const parts = input.resource_name.split('/');
        const customerId = parts[1];

        if (!customerId || parts.length < 4 || parts[0] !== 'customers' || parts[2] !== 'campaignBudgets' || !parts[3]) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Invalid resource_name format. Expected "customers/{customerId}/campaignBudgets/{budgetId}"'
            });
        }

        // @allowTryCatch Intercept provider HTTP errors to surface CAMPAIGN_BUDGET_IN_USE as a typed ActionError.
        try {
            const response = await nango.post({
                // https://developers.google.com/google-ads/api/docs/mutating/service-mutates
                endpoint: `v21/customers/${encodeURIComponent(customerId)}/campaignBudgets:mutate`,
                data: {
                    operations: [
                        {
                            remove: input.resource_name
                        }
                    ]
                },
                retries: 10,
                headers: {
                    'developer-token': input.developer_token,
                    'login-customer-id': '3608201627'
                }
            });

            const providerResponse = ProviderMutateResponseSchema.parse(response.data);
            return {
                resource_name: providerResponse.results?.[0]?.resourceName
            };
        } catch (error) {
            if (
                typeof error === 'object' &&
                error !== null &&
                'response' in error &&
                typeof error.response === 'object' &&
                error.response !== null &&
                'data' in error.response
            ) {
                const errorData = ProviderErrorBodySchema.safeParse(error.response.data);

                if (errorData.success) {
                    const firstError = errorData.data.error?.details?.[0]?.errors?.[0];
                    if (firstError?.errorCode?.campaignBudgetError === 'CAMPAIGN_BUDGET_IN_USE') {
                        throw new nango.ActionError({
                            type: 'campaign_budget_in_use',
                            message: 'The campaign budget is still attached to a campaign and cannot be removed.'
                        });
                    }
                    if (firstError?.message) {
                        throw new nango.ActionError({
                            type: 'google_ads_error',
                            message: firstError.message
                        });
                    }
                }
            }
            throw error;
        }
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
