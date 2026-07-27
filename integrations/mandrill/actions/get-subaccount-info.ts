import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The unique identifier of the subaccount to query. Example: "cust-123"')
});

const StatsWindowSchema = z.object({
    sent: z.number().optional(),
    hard_bounces: z.number().optional(),
    soft_bounces: z.number().optional(),
    rejects: z.number().optional(),
    complaints: z.number().optional(),
    unsubs: z.number().optional(),
    opens: z.number().optional(),
    unique_opens: z.number().optional(),
    clicks: z.number().optional(),
    unique_clicks: z.number().optional()
});

const ProviderSubaccountSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    created_at: z.string(),
    first_sent_at: z.string().nullable().optional(),
    status: z.enum(['active', 'paused']),
    reputation: z.number(),
    sent_weekly: z.number(),
    sent_monthly: z.number(),
    sent_total: z.number(),
    custom_quota: z.number().optional(),
    sent_hourly: z.number(),
    hourly_quota: z.number(),
    last_30_days: StatsWindowSchema,
    notes: z.string().optional()
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
    custom_quota: z.number().optional(),
    sent_hourly: z.number(),
    hourly_quota: z.number(),
    last_30_days: StatsWindowSchema,
    notes: z.string().optional()
});

const action = createAction({
    description: 'Get detailed information about a single subaccount.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/subaccounts/get-subaccount-info/
            baseUrlOverride: 'https://mandrillapp.com/api/1.0',
            endpoint: '/subaccounts/info.json',
            data: {
                id: input.id
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Subaccount not found',
                id: input.id
            });
        }

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
            ...(providerSubaccount.custom_quota !== undefined && { custom_quota: providerSubaccount.custom_quota }),
            sent_hourly: providerSubaccount.sent_hourly,
            hourly_quota: providerSubaccount.hourly_quota,
            last_30_days: providerSubaccount.last_30_days,
            ...(providerSubaccount.notes !== undefined && { notes: providerSubaccount.notes })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
