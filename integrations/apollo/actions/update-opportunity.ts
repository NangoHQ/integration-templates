import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the opportunity to update. Example: "6a0af21285c69e000cc28695"'),
    owner_id: z.string().optional().describe("The ID for the deal owner within your team's Apollo account."),
    name: z.string().optional().describe('The name of the deal.'),
    amount: z.number().optional().describe('The monetary value of the deal.'),
    opportunity_stage_id: z.string().optional().describe("The ID for the deal stage within your team's Apollo account."),
    closed_date: z.string().optional().describe('The estimated close date for the deal. Format: YYYY-MM-DD.'),
    typed_custom_fields: z.object({}).passthrough().optional()
});

const ProviderOpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    owner_id: z.string().optional().nullable(),
    account_id: z.string().optional().nullable(),
    amount: z.number().optional().nullable(),
    opportunity_stage_id: z.string().optional().nullable(),
    closed_date: z.string().optional().nullable(),
    created_at: z.string().optional().nullable(),
    updated_at: z.string().optional().nullable()
});

const ProviderResponseSchema = z.object({
    opportunity: ProviderOpportunitySchema
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    owner_id: z.string().optional(),
    account_id: z.string().optional(),
    amount: z.number().optional(),
    opportunity_stage_id: z.string().optional(),
    closed_date: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const action = createAction({
    description: 'Update an opportunity in Apollo.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-opportunity'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {};

        if (input.owner_id !== undefined) {
            payload['owner_id'] = input.owner_id;
        }
        if (input.name !== undefined) {
            payload['name'] = input.name;
        }
        if (input.amount !== undefined) {
            payload['amount'] = input.amount;
        }
        if (input.opportunity_stage_id !== undefined) {
            payload['opportunity_stage_id'] = input.opportunity_stage_id;
        }
        if (input.closed_date !== undefined) {
            payload['closed_date'] = input.closed_date;
        }
        if (input.typed_custom_fields !== undefined) {
            payload['typed_custom_fields'] = input.typed_custom_fields;
        }

        // https://docs.apollo.io/reference/update-deal
        const response = await nango.patch({
            endpoint: `/v1/opportunities/${encodeURIComponent(input.id)}`,
            data: payload,
            retries: 3
        });

        const rawData = ProviderResponseSchema.safeParse(response.data);
        if (!rawData.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Apollo API',
                issues: rawData.error.issues
            });
        }

        const opportunity = rawData.data.opportunity;

        return {
            id: opportunity.id,
            ...(opportunity.name != null && { name: opportunity.name }),
            ...(opportunity.owner_id != null && { owner_id: opportunity.owner_id }),
            ...(opportunity.account_id != null && { account_id: opportunity.account_id }),
            ...(opportunity.amount != null && { amount: opportunity.amount }),
            ...(opportunity.opportunity_stage_id != null && { opportunity_stage_id: opportunity.opportunity_stage_id }),
            ...(opportunity.closed_date != null && { closed_date: opportunity.closed_date }),
            ...(opportunity.created_at != null && { created_at: opportunity.created_at }),
            ...(opportunity.updated_at != null && { updated_at: opportunity.updated_at })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
