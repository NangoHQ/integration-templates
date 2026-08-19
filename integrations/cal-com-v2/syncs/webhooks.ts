import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const WebhookSchema = z
    .object({
        id: z.string().describe('Unique identifier of the webhook'),
        userId: z.number().describe('User ID that owns the webhook'),
        subscriberUrl: z.string().describe('URL Cal.com will send webhook events to'),
        active: z.boolean().describe('Whether the webhook is active'),
        triggers: z.array(z.string()).describe('List of event triggers this webhook subscribes to'),
        payloadTemplate: z.string().optional().describe('Template of the payload sent to the subscriberUrl'),
        version: z.string().describe('Payload format version of the webhook'),
        time: z.number().optional().describe('How long after the booking start time the no-show triggers are evaluated'),
        timeUnit: z.string().optional().describe('Unit of the no-show time value'),
        secret: z.string().optional().describe('Webhook secret for verifying payloads')
    })
    .describe('A Cal.com webhook configuration');

const CheckpointSchema = z.object({
    skip: z.number().int().min(0)
});

const ProviderWebhookSchema = z.object({
    id: z.union([z.string(), z.number()]),
    userId: z.number(),
    subscriberUrl: z.string(),
    active: z.boolean(),
    triggers: z.array(z.string()),
    payloadTemplate: z.string().nullable(),
    version: z.string(),
    time: z.number().nullable(),
    timeUnit: z.string().nullable(),
    secret: z.string().nullable()
});

const sync = createSync({
    description: 'Sync webhooks from Cal.com',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Webhook: WebhookSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.safeParse(rawCheckpoint ?? { skip: 0 });
        if (!checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        // /v2/webhooks supports offset pagination, but it does not expose a
        // changed-since filter or updated timestamp for incremental syncs.
        await nango.trackDeletesStart('Webhook');

        let skip: number | undefined = checkpoint.data.skip;

        const proxyConfig: ProxyConfiguration = {
            // https://cal.com/docs/api-reference/v2/webhooks/get-all-webhooks
            endpoint: '/webhooks',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                offset_start_value: skip ?? 0,
                limit_name_in_request: 'take',
                limit: 100,
                response_path: 'data',
                on_page: async (pagination: { nextPageParam?: string | number | undefined }) => {
                    skip = typeof pagination.nextPageParam === 'number' ? pagination.nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const items = z.array(ProviderWebhookSchema).safeParse(page);
            if (!items.success) {
                throw new Error(`Failed to parse webhooks page: ${items.error.message}`);
            }

            const webhooks = items.data.map((webhook) => ({
                id: String(webhook.id),
                userId: webhook.userId,
                subscriberUrl: webhook.subscriberUrl,
                active: webhook.active,
                triggers: webhook.triggers,
                version: webhook.version,
                ...(webhook.payloadTemplate != null && { payloadTemplate: webhook.payloadTemplate }),
                ...(webhook.time != null && { time: webhook.time }),
                ...(webhook.timeUnit != null && { timeUnit: webhook.timeUnit }),
                ...(webhook.secret != null && { secret: webhook.secret })
            }));

            if (webhooks.length > 0) {
                await nango.batchSave(webhooks, 'Webhook');
            }

            if (skip !== undefined) {
                await nango.saveCheckpoint({ skip });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Webhook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
