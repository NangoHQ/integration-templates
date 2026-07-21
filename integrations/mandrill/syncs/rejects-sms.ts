import { createSync } from 'nango';
import { z } from 'zod';

const ProviderSmsRejectSchema = z.object({
    phone: z.string(),
    created_at: z.string(),
    expires_at: z.string().nullable().optional(),
    expired: z.boolean(),
    subaccount: z.string().nullable().optional()
});

const SmsRejectSchema = z.object({
    id: z.string(),
    phone: z.string(),
    created_at: z.string(),
    expires_at: z.string().optional(),
    expired: z.boolean(),
    subaccount: z.string().optional()
});

const sync = createSync({
    description: 'Sync all entries on the SMS rejection denylist.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        SmsReject: SmsRejectSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /rejects/list-sms with no changed-since
        // filter, no deleted-record endpoint, no pagination, and no resumable cursor.
        await nango.trackDeletesStart('SmsReject');

        // https://mailchimp.com/developer/transactional/api/rejects/
        const response = await nango.post({
            endpoint: '1.4/rejects/list-sms',
            data: {},
            retries: 3
        });

        const parsed = z.array(ProviderSmsRejectSchema).safeParse(response.data);

        if (!parsed.success) {
            throw new Error(`Invalid response from /rejects/list-sms: ${parsed.error.message}`);
        }

        const records = parsed.data.map((item) => ({
            id: item.phone,
            phone: item.phone,
            created_at: item.created_at,
            ...(item.expires_at != null && { expires_at: item.expires_at }),
            expired: item.expired,
            ...(item.subaccount != null && { subaccount: item.subaccount })
        }));

        if (records.length > 0) {
            await nango.batchSave(records, 'SmsReject');
        }

        await nango.trackDeletesEnd('SmsReject');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
