import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('The Google Ads customer ID. Example: "1781900691"'),
    loginCustomerId: z.string().describe('The manager account ID used as login-customer-id. Example: "3608201627"'),
    name: z.string().describe('The name of the campaign budget.'),
    amountMicros: z.string().describe('The budget amount in micros. Example: "1000000"'),
    deliveryMethod: z.enum(['STANDARD', 'ACCELERATED']).describe('The delivery method for the budget.'),
    explicitlyShared: z.boolean().describe('Whether the budget is shared across multiple campaigns.'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const OutputSchema = z.object({
    resourceName: z.string(),
    id: z.string().optional()
});

const MutateResponseSchema = z.object({
    results: z
        .array(
            z.object({
                resourceName: z.string()
            })
        )
        .optional(),
    partialFailureError: z.unknown().optional()
});

const PartialFailureErrorSchema = z.object({
    message: z.string().optional()
});

const action = createAction({
    description: 'Create a campaign budget for one or more campaigns.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.google.com/google-ads/api/reference/rpc/v21/CampaignBudgetService/MutateCampaignBudgets
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/campaignBudgets:mutate`,
            data: {
                operations: [
                    {
                        create: {
                            name: input.name,
                            amountMicros: input.amountMicros,
                            deliveryMethod: input.deliveryMethod,
                            explicitlyShared: input.explicitlyShared
                        }
                    }
                ]
            },
            headers: {
                'developer-token': input.developerToken,
                'login-customer-id': input.loginCustomerId
            },
            retries: 3
        };

        const response = await nango.post(config);

        const parsed = MutateResponseSchema.parse(response.data);

        if (parsed.partialFailureError) {
            const errorParse = PartialFailureErrorSchema.safeParse(parsed.partialFailureError);
            throw new nango.ActionError({
                type: 'partial_failure',
                message: errorParse.success && errorParse.data.message ? errorParse.data.message : 'Partial failure occurred during budget creation.',
                details: parsed.partialFailureError
            });
        }

        const result = parsed.results?.[0];
        if (!result) {
            throw new nango.ActionError({
                type: 'no_result',
                message: 'No result returned from campaign budget creation.'
            });
        }

        return {
            resourceName: result.resourceName,
            id: result.resourceName.split('/').pop()
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
