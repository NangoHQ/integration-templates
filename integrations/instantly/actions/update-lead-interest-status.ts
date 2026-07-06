import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    email: z.string().describe('The email of the lead to update the interest status of. Example: "test@test.com"'),
    interest_value: z
        .enum(['Interested', 'Not Interested', 'Meeting Booked', 'Meeting Completed', 'Closed', 'Out Of Office', 'Wrong Person'])
        .describe('The interest status label to set for the lead.'),
    campaign_id: z
        .string()
        .optional()
        .describe('The ID of the campaign context for the interest status update. Example: "019f1a45-a721-7787-bd69-0f0792a00518"')
});

const ProviderResponseSchema = z.object({
    message: z.string()
});

const OutputSchema = z.object({
    message: z.string().describe('Confirmation message from the provider.')
});

const interestMap: Record<string, number> = {
    Interested: 1,
    'Not Interested': -1,
    'Meeting Booked': 2,
    'Meeting Completed': 3,
    Closed: 4,
    'Out Of Office': 0,
    'Wrong Person': -2
};

const action = createAction({
    description: 'Update a lead interest status.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['leads:update', 'leads:all', 'all:update', 'all:all'],
    endpoint: {
        path: '/actions/update-lead-interest-status',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const numericInterest = interestMap[input.interest_value];

        if (numericInterest === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: `Unknown interest_value: ${input.interest_value}`
            });
        }

        const response = await nango.post({
            // https://developer.instantly.ai/api-reference/lead/update-the-interest-status-of-a-lead
            endpoint: '/v2/leads/update-interest-status',
            data: {
                lead_email: input.email,
                interest_value: numericInterest,
                ...(input.campaign_id !== undefined && { campaign_id: input.campaign_id })
            },
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
