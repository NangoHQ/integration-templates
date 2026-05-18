import { createSync } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    offset: z.number().int().nonnegative(),
    in_progress: z.boolean()
});

const WebhookSubscriptionSchema = z.object({
    event_type: z.string(),
    filter: z.unknown().optional()
});

const WebhookSchema = z.object({
    id: z.string(),
    target_url: z.string(),
    subscriptions: z.array(WebhookSubscriptionSchema),
    status: z.enum(['active', 'degraded', 'inactive']),
    created_at: z.string()
});

const ProviderWebhookSchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        webhook_id: z.string()
    }),
    target_url: z.string(),
    subscriptions: z.array(
        z.object({
            event_type: z.string(),
            filter: z.unknown().nullable()
        })
    ),
    status: z.enum(['active', 'degraded', 'inactive']),
    created_at: z.string()
});

const ProviderWebhooksResponseSchema = z.object({
    data: z.array(ProviderWebhookSchema)
});

const sync = createSync({
    description: 'Sync webhooks from Attio.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/webhooks' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['webhook:read'],
    models: {
        Webhook: WebhookSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.partial().parse((await nango.getCheckpoint()) ?? {});
        let offset = checkpoint.offset ?? 0;
        const inProgress = checkpoint.in_progress ?? false;
        const limit = 100;

        if (!inProgress) {
            await nango.trackDeletesStart('Webhook');
        }

        let hasMore = true;

        while (hasMore) {
            const response = await nango.get({
                // https://docs.attio.com/rest-api/endpoint-reference/webhooks/list-webhooks
                endpoint: '/v2/webhooks',
                params: {
                    limit: String(limit),
                    offset: String(offset)
                },
                retries: 3
            });

            const parsed = ProviderWebhooksResponseSchema.parse(response.data);
            const page = parsed.data;
            const webhooks = page.map((webhook) => ({
                id: webhook.id.webhook_id,
                target_url: webhook.target_url,
                subscriptions: webhook.subscriptions.map((sub) => ({
                    event_type: sub.event_type,
                    ...(sub.filter != null && { filter: sub.filter })
                })),
                status: webhook.status,
                created_at: webhook.created_at
            }));

            if (webhooks.length > 0) {
                await nango.batchSave(webhooks, 'Webhook');
            }

            if (page.length < limit) {
                hasMore = false;
            } else {
                offset += limit;
                await nango.saveCheckpoint({ offset, in_progress: true });
            }
        }

        await nango.trackDeletesEnd('Webhook');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
