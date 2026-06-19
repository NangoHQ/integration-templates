import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WebhookSchema = z.object({
    id: z.string().describe('Stable string ID of the webhook (webhook_id)'),
    webhook_id: z.string().describe('UUID of the webhook subscription'),
    url: z.string().describe('URL where webhook events are sent'),
    active: z.boolean().describe('Whether the webhook is active'),
    events: z.array(z.string()).optional().describe('List of events subscribed to'),
    token: z.string().optional().describe('Secret token for verifying webhook payloads'),
    created_at: z.string().describe('ISO 8601 timestamp when the webhook was created')
});

const ProviderWebhookSchema = z.object({
    id: z.number(),
    webhook_id: z.string(),
    url: z.string(),
    active: z.boolean(),
    events: z.array(z.string()).optional(),
    token: z.string().optional(),
    created_at: z.string()
});

const sync = createSync({
    description: 'Sync webhook subscriptions from Aircall.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Webhook: WebhookSchema
    },

    exec: async (nango) => {
        const proxyConfig: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#list-webhooks
            endpoint: '/v1/webhooks',
            paginate: {
                type: 'link',
                limit: 50,
                limit_name_in_request: 'per_page',
                response_path: 'webhooks',
                link_path_in_response_body: 'meta.next_page_link'
            },
            retries: 3
        };

        await nango.trackDeletesStart('Webhook');

        for await (const page of nango.paginate<z.infer<typeof ProviderWebhookSchema>>(proxyConfig)) {
            const parsed = z.array(ProviderWebhookSchema).safeParse(page);
            if (!parsed.success) {
                throw new Error(`Failed to parse webhooks page: ${parsed.error.message}`);
            }

            const records = parsed.data.map((webhook) => ({
                id: webhook.webhook_id,
                webhook_id: webhook.webhook_id,
                url: webhook.url,
                active: webhook.active,
                ...(webhook.events !== undefined && { events: webhook.events }),
                ...(webhook.token !== undefined && { token: webhook.token }),
                created_at: webhook.created_at
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Webhook');
            }
        }

        await nango.trackDeletesEnd('Webhook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
