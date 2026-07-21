import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const SenderSchema = z.object({
    id: z.string(),
    address: z.string(),
    created_at: z.string().optional(),
    sent: z.number().int().optional(),
    hard_bounces: z.number().int().optional(),
    soft_bounces: z.number().int().optional(),
    rejects: z.number().int().optional(),
    complaints: z.number().int().optional(),
    unsubs: z.number().int().optional(),
    opens: z.number().int().optional(),
    clicks: z.number().int().optional(),
    unique_clicks: z.number().int().optional(),
    unique_opens: z.number().int().optional()
});

const sync = createSync({
    description: 'Sync sender addresses that have been used to send from this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Sender: SenderSchema
    },

    exec: async (nango) => {
        // Blocker: /senders/list returns the full collection in a single call
        // with no pagination parameters and no modified-since/updated-after filter documented.
        const config: ProxyConfiguration = {
            // https://mailchimp.com/developer/transactional/api/senders/
            endpoint: '/senders/list.json',
            baseUrlOverride: 'https://mandrillapp.com/api/1.0',
            data: {},
            retries: 3
        };
        const response = await nango.post(config);

        const rawSenders = z.array(z.unknown()).parse(response.data);

        const senders = rawSenders.map((raw) => {
            const parsed = z
                .object({
                    address: z.string(),
                    created_at: z.string().optional(),
                    sent: z.number().int().optional(),
                    hard_bounces: z.number().int().optional(),
                    soft_bounces: z.number().int().optional(),
                    rejects: z.number().int().optional(),
                    complaints: z.number().int().optional(),
                    unsubs: z.number().int().optional(),
                    opens: z.number().int().optional(),
                    clicks: z.number().int().optional(),
                    unique_clicks: z.number().int().optional(),
                    unique_opens: z.number().int().optional()
                })
                .parse(raw);

            return {
                id: parsed.address,
                address: parsed.address,
                ...(parsed.created_at !== undefined && { created_at: parsed.created_at }),
                ...(parsed.sent !== undefined && { sent: parsed.sent }),
                ...(parsed.hard_bounces !== undefined && { hard_bounces: parsed.hard_bounces }),
                ...(parsed.soft_bounces !== undefined && { soft_bounces: parsed.soft_bounces }),
                ...(parsed.rejects !== undefined && { rejects: parsed.rejects }),
                ...(parsed.complaints !== undefined && { complaints: parsed.complaints }),
                ...(parsed.unsubs !== undefined && { unsubs: parsed.unsubs }),
                ...(parsed.opens !== undefined && { opens: parsed.opens }),
                ...(parsed.clicks !== undefined && { clicks: parsed.clicks }),
                ...(parsed.unique_clicks !== undefined && { unique_clicks: parsed.unique_clicks }),
                ...(parsed.unique_opens !== undefined && { unique_opens: parsed.unique_opens })
            };
        });

        await nango.trackDeletesStart('Sender');
        if (senders.length > 0) {
            await nango.batchSave(senders, 'Sender');
        }

        await nango.trackDeletesEnd('Sender');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
