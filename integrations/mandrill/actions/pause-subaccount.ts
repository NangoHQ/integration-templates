import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the subaccount to pause. Example: "cust-123"')
});

const ProviderSubaccountSchema = z.object({
    id: z.string(),
    name: z.string().optional().nullable(),
    created_at: z.string(),
    first_sent_at: z.string().optional().nullable(),
    status: z.enum(['active', 'paused']),
    reputation: z.number(),
    sent_weekly: z.number(),
    sent_monthly: z.number(),
    sent_total: z.number(),
    custom_quota: z.number().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created_at: z.string(),
    first_sent_at: z.string().optional(),
    status: z.enum(['active', 'paused']),
    reputation: z.number(),
    sent_weekly: z.number(),
    sent_monthly: z.number(),
    sent_total: z.number(),
    custom_quota: z.number().optional()
});

const action = createAction({
    description: "Pause a subaccount's sending.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/subaccounts/
            endpoint: '/1.0/subaccounts/pause',
            data: {
                id: input.id
            },
            retries: 3
        });

        const providerSubaccount = ProviderSubaccountSchema.parse(response.data);

        return {
            id: providerSubaccount.id,
            ...(providerSubaccount.name != null && { name: providerSubaccount.name }),
            created_at: providerSubaccount.created_at,
            ...(providerSubaccount.first_sent_at != null && { first_sent_at: providerSubaccount.first_sent_at }),
            status: providerSubaccount.status,
            reputation: providerSubaccount.reputation,
            sent_weekly: providerSubaccount.sent_weekly,
            sent_monthly: providerSubaccount.sent_monthly,
            sent_total: providerSubaccount.sent_total,
            ...(providerSubaccount.custom_quota != null && { custom_quota: providerSubaccount.custom_quota })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
