import { createSync } from 'nango';
import { z } from 'zod';

const ProviderSubaccountSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    custom_quota: z.number().int().optional(),
    status: z.string().optional(),
    reputation: z.number().optional(),
    created_at: z.string().optional(),
    first_sent_at: z.string().optional(),
    sent_weekly: z.number().int().optional(),
    sent_monthly: z.number().int().optional(),
    sent_total: z.number().int().optional()
});

const ProviderResponseSchema = z.array(ProviderSubaccountSchema);

const SubaccountSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    custom_quota: z.number().int().optional(),
    status: z.string().optional(),
    reputation: z.number().optional(),
    created_at: z.string().optional(),
    first_sent_at: z.string().optional(),
    sent_weekly: z.number().int().optional(),
    sent_monthly: z.number().int().optional(),
    sent_total: z.number().int().optional()
});

const sync = createSync({
    description: 'Sync all subaccounts on this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Subaccount: SubaccountSchema
    },

    exec: async (nango) => {
        // Blocker: /subaccounts/list returns the full collection in a single call
        // with no pagination parameters and no modified-since/updated-after filter documented.
        await nango.trackDeletesStart('Subaccount');

        // https://mailchimp.com/developer/transactional/api/subaccounts/list-subaccounts/
        const response = await nango.post({
            endpoint: '/1.3/subaccounts/list',
            data: {},
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);

        if (!parsed.success) {
            throw new Error(`Failed to parse subaccounts response: ${parsed.error.message}`);
        }

        const subaccounts = parsed.data.map((record) => ({
            id: record.id,
            ...(record.name !== undefined && { name: record.name }),
            ...(record.custom_quota !== undefined && { custom_quota: record.custom_quota }),
            ...(record.status !== undefined && { status: record.status }),
            ...(record.reputation !== undefined && { reputation: record.reputation }),
            ...(record.created_at !== undefined && { created_at: record.created_at }),
            ...(record.first_sent_at !== undefined && { first_sent_at: record.first_sent_at }),
            ...(record.sent_weekly !== undefined && { sent_weekly: record.sent_weekly }),
            ...(record.sent_monthly !== undefined && { sent_monthly: record.sent_monthly }),
            ...(record.sent_total !== undefined && { sent_total: record.sent_total })
        }));

        if (subaccounts.length > 0) {
            await nango.batchSave(subaccounts, 'Subaccount');
        }

        await nango.trackDeletesEnd('Subaccount');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
