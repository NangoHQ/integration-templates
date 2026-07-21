import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the subaccount to update. Example: "my_subaccount_id"'),
    name: z.string().optional().describe('An optional display name to further identify the subaccount.'),
    notes: z.string().optional().describe('Optional extra text to associate with the subaccount.'),
    custom_quota: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('An optional manual hourly quota for the subaccount. If not specified, Mandrill will manage this based on reputation.')
});

const ProviderSubaccountSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    custom_quota: z.number().int().optional(),
    status: z.enum(['active', 'paused']),
    reputation: z.number().int(),
    created_at: z.string().optional(),
    first_sent_at: z.string().optional(),
    sent_weekly: z.number().int().optional(),
    sent_monthly: z.number().int().optional(),
    sent_total: z.number().int().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    custom_quota: z.number().int().optional(),
    status: z.enum(['active', 'paused']),
    reputation: z.number().int(),
    created_at: z.string().optional(),
    first_sent_at: z.string().optional(),
    sent_weekly: z.number().int().optional(),
    sent_monthly: z.number().int().optional(),
    sent_total: z.number().int().optional()
});

const action = createAction({
    description: "Update an existing subaccount's name, notes, or custom quota.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/subaccounts/
            endpoint: '1.0/subaccounts/update.json',
            data: {
                id: input.id,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.custom_quota !== undefined && { custom_quota: input.custom_quota })
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Subaccount not found or update failed.',
                id: input.id
            });
        }

        const subaccount = ProviderSubaccountSchema.parse(response.data);

        return {
            id: subaccount.id,
            ...(subaccount.name !== undefined && { name: subaccount.name }),
            ...(subaccount.custom_quota !== undefined && { custom_quota: subaccount.custom_quota }),
            status: subaccount.status,
            reputation: subaccount.reputation,
            ...(subaccount.created_at !== undefined && { created_at: subaccount.created_at }),
            ...(subaccount.first_sent_at !== undefined && { first_sent_at: subaccount.first_sent_at }),
            ...(subaccount.sent_weekly !== undefined && { sent_weekly: subaccount.sent_weekly }),
            ...(subaccount.sent_monthly !== undefined && { sent_monthly: subaccount.sent_monthly }),
            ...(subaccount.sent_total !== undefined && { sent_total: subaccount.sent_total })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
