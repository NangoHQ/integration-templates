import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().max(255).describe('A unique identifier for the subaccount to be used in sending calls. Example: "cust-123"'),
    name: z.string().max(1024).optional().describe('An optional display name to further identify the subaccount.'),
    notes: z.string().optional().describe('Optional extra text to associate with the subaccount.'),
    custom_quota: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('An optional manual hourly quota for the subaccount. If not specified, Mandrill will manage this based on reputation.')
});

const ProviderSubaccountSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created_at: z.string(),
    first_sent_at: z.string().nullable().optional(),
    status: z.enum(['active', 'paused']),
    reputation: z.number().int(),
    sent_weekly: z.number().int(),
    sent_monthly: z.number().int(),
    sent_total: z.number().int(),
    custom_quota: z.number().int().min(1).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created_at: z.string(),
    first_sent_at: z.string().optional(),
    status: z.enum(['active', 'paused']),
    reputation: z.number().int(),
    sent_weekly: z.number().int(),
    sent_monthly: z.number().int(),
    sent_total: z.number().int(),
    custom_quota: z.number().int().min(1).optional()
});

const action = createAction({
    description: 'Add a new subaccount.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/subaccounts/add-subaccount/
            endpoint: '1.0/subaccounts/add.json',
            data: {
                id: input.id,
                ...(input.name !== undefined && { name: input.name }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.custom_quota !== undefined && { custom_quota: input.custom_quota })
            },
            retries: 10
        });

        const providerSubaccount = ProviderSubaccountSchema.parse(response.data);

        return {
            id: providerSubaccount.id,
            ...(providerSubaccount.name !== undefined && { name: providerSubaccount.name }),
            created_at: providerSubaccount.created_at,
            ...(providerSubaccount.first_sent_at != null && { first_sent_at: providerSubaccount.first_sent_at }),
            status: providerSubaccount.status,
            reputation: providerSubaccount.reputation,
            sent_weekly: providerSubaccount.sent_weekly,
            sent_monthly: providerSubaccount.sent_monthly,
            sent_total: providerSubaccount.sent_total,
            ...(providerSubaccount.custom_quota !== undefined && { custom_quota: providerSubaccount.custom_quota })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
