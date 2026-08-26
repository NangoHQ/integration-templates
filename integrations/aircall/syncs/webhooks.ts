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

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync webhook subscriptions from Aircall.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Webhook: WebhookSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointParse = rawCheckpoint == null ? null : CheckpointSchema.safeParse(rawCheckpoint);
        if (checkpointParse != null && !checkpointParse.success) {
            throw new Error(`Invalid checkpoint: ${checkpointParse.error.message}`);
        }

        let nextPage: number | undefined = checkpointParse?.data.page ?? 1;

        // Safe to call every execution: trackDeletesStart() will not overwrite the
        // start of a delete-tracking window this refresh already opened.
        await nango.trackDeletesStart('Webhook');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.aircall.io/api-references/#list-webhooks
            endpoint: '/v1/webhooks',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 50,
                response_path: 'webhooks',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

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

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Webhook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
