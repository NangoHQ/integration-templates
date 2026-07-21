import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const RejectSchema = z.object({
    id: z.string(),
    email: z.string(),
    reason: z.string(),
    detail: z.string(),
    created_at: z.string(),
    last_event_at: z.string(),
    expires_at: z.string().optional(),
    expired: z.boolean(),
    sender_address: z.string().optional(),
    subaccount: z.string().optional()
});

const sync = createSync({
    description: 'Sync all entries on the email rejection denylist.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Reject: RejectSchema
    },

    exec: async (nango) => {
        // Blocker: /rejects/list returns the full collection in a single call with no
        // pagination parameters and no modified-since or updated-after filter documented.
        const proxyConfig: ProxyConfiguration = {
            // https://mailchimp.com/developer/transactional/api/rejects/list-denylisted-emails/
            endpoint: '/1.0/rejects/list.json',
            method: 'POST',
            retries: 3
        };

        const response = await nango.post(proxyConfig);

        if (!Array.isArray(response.data)) {
            throw new Error('Unexpected response from /rejects/list: expected array');
        }

        await nango.trackDeletesStart('Reject');

        const rejects = response.data.map((record: unknown) => {
            const parsed = z
                .object({
                    email: z.string(),
                    reason: z.string(),
                    detail: z.string(),
                    created_at: z.string(),
                    last_event_at: z.string(),
                    expires_at: z.string().nullable(),
                    expired: z.boolean(),
                    sender: z
                        .object({
                            address: z.string().optional()
                        })
                        .nullable()
                        .optional(),
                    subaccount: z.string().nullable().optional()
                })
                .safeParse(record);

            if (!parsed.success) {
                throw new Error(`Failed to parse reject record: ${parsed.error.message}`);
            }

            const item = parsed.data;
            const id = item.subaccount != null ? `${item.email}:${item.subaccount}` : item.email;

            return {
                id,
                email: item.email,
                reason: item.reason,
                detail: item.detail,
                created_at: item.created_at,
                last_event_at: item.last_event_at,
                ...(item.expires_at != null && { expires_at: item.expires_at }),
                expired: item.expired,
                ...(item.sender?.address != null && { sender_address: item.sender.address }),
                ...(item.subaccount != null && { subaccount: item.subaccount })
            };
        });

        if (rejects.length > 0) {
            await nango.batchSave(rejects, 'Reject');
        }

        await nango.trackDeletesEnd('Reject');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
