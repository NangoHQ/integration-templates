import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customerId: z.string().describe('Google Ads customer ID. Example: "1781900691"'),
    campaignBudgetId: z.string().describe('Campaign budget ID to update. Example: "15717542877"'),
    amountMicros: z.string().optional().describe('Average daily budget amount in micros. Example: "500000"'),
    name: z.string().optional().describe('Name of the campaign budget.'),
    explicitlyShared: z.boolean().optional().describe('Whether this budget can be shared across campaigns.'),
    deliveryMethod: z.string().optional().describe('Delivery method. Example: "STANDARD" or "ACCELERATED"'),
    totalAmountMicros: z.string().optional().describe('Total budget amount in micros for custom period budgets.'),
    period: z.string().optional().describe('Budget period. Example: "DAILY" or "CUSTOM_PERIOD"'),
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

const OutputSchema = z.object({
    resourceName: z.string().describe('Resource name of the updated campaign budget. Example: "customers/1781900691/campaignBudgets/15717542877"')
});

const MutateResponseSchema = z.object({
    results: z
        .array(
            z.object({
                resourceName: z.string()
            })
        )
        .optional()
});

const action = createAction({
    description: 'Update mutable fields on a campaign budget.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/adwords'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const resourceName = `customers/${input.customerId}/campaignBudgets/${input.campaignBudgetId}`;
        const updateFields: Record<string, unknown> = {
            resourceName
        };
        const updateMaskParts: string[] = [];

        if (input.amountMicros !== undefined) {
            updateFields['amountMicros'] = input.amountMicros;
            updateMaskParts.push('amountMicros');
        }
        if (input.name !== undefined) {
            updateFields['name'] = input.name;
            updateMaskParts.push('name');
        }
        if (input.explicitlyShared !== undefined) {
            updateFields['explicitlyShared'] = input.explicitlyShared;
            updateMaskParts.push('explicitlyShared');
        }
        if (input.deliveryMethod !== undefined) {
            updateFields['deliveryMethod'] = input.deliveryMethod;
            updateMaskParts.push('deliveryMethod');
        }
        if (input.totalAmountMicros !== undefined) {
            updateFields['totalAmountMicros'] = input.totalAmountMicros;
            updateMaskParts.push('totalAmountMicros');
        }
        if (input.period !== undefined) {
            updateFields['period'] = input.period;
            updateMaskParts.push('period');
        }

        if (updateMaskParts.length === 0) {
            throw new nango.ActionError({
                type: 'missing_fields',
                message: 'At least one field to update must be provided.'
            });
        }

        const response = await nango.post({
            // https://developers.google.com/google-ads/api/reference/rest/v21/customers.campaignBudgets/mutate
            endpoint: `v21/customers/${encodeURIComponent(input.customerId)}/campaignBudgets:mutate`,
            data: {
                operations: [
                    {
                        update: updateFields,
                        updateMask: updateMaskParts.join(',')
                    }
                ]
            },
            headers: {
                'developer-token': input.developerToken,
                'login-customer-id': '3608201627'
            },
            retries: 1
        });

        const responseData = MutateResponseSchema.parse(response.data);

        if (!responseData.results || responseData.results.length === 0) {
            throw new nango.ActionError({
                type: 'no_results',
                message: 'The mutate request did not return any results.'
            });
        }

        const firstResult = responseData.results[0];

        if (!firstResult) {
            throw new nango.ActionError({
                type: 'no_results',
                message: 'The mutate request did not return any results.'
            });
        }

        return {
            resourceName: firstResult.resourceName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
