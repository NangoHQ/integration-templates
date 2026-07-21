import { createSync } from 'nango';
import { z } from 'zod';

const ProviderWebhookSchema = z.object({
    id: z.number(),
    url: z.string(),
    auth_key: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    events: z.array(z.string()),
    created_at: z.string(),
    last_sent_at: z.string().nullable().optional(),
    batches_sent: z.number(),
    events_sent: z.number(),
    last_error: z.string().nullable().optional()
});

const WebhookSchema = z.object({
    id: z.string(),
    url: z.string(),
    auth_key: z.string().optional(),
    description: z.string().optional(),
    events: z.array(z.string()),
    created_at: z.string(),
    last_sent_at: z.string().optional(),
    batches_sent: z.number(),
    events_sent: z.number(),
    last_error: z.string().optional()
});

const sync = createSync({
    description: 'Sync all webhooks configured on this account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Webhook: WebhookSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes POST /webhooks/list with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        await nango.trackDeletesStart('Webhook');

        // https://mailchimp.com/developer/transactional/api/webhooks/
        const response = await nango.post({
            endpoint: '/webhooks/list.json',
            baseUrlOverride: 'https://mandrillapp.com/api/1.0',
            retries: 3
        });

        const parsed = z.array(ProviderWebhookSchema).safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Failed to parse webhooks response: ${parsed.error.message}`);
        }

        const webhooks = parsed.data.map((webhook) => ({
            id: String(webhook.id),
            url: webhook.url,
            ...(webhook.auth_key != null && { auth_key: webhook.auth_key }),
            ...(webhook.description != null && { description: webhook.description }),
            events: webhook.events,
            created_at: webhook.created_at,
            ...(webhook.last_sent_at != null && { last_sent_at: webhook.last_sent_at }),
            batches_sent: webhook.batches_sent,
            events_sent: webhook.events_sent,
            ...(webhook.last_error != null && { last_error: webhook.last_error })
        }));

        if (webhooks.length > 0) {
            await nango.batchSave(webhooks, 'Webhook');
        }

        await nango.trackDeletesEnd('Webhook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
