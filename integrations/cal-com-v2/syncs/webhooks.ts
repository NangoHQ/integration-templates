import { createSync } from 'nango';
import { z } from 'zod';

const WebhookSchema = z
    .object({
        id: z.string().describe('Unique identifier of the webhook'),
        userId: z.number().describe('User ID that owns the webhook'),
        subscriberUrl: z.string().describe('URL Cal.com will send webhook events to'),
        active: z.boolean().describe('Whether the webhook is active'),
        triggers: z.array(z.string()).describe('List of event triggers this webhook subscribes to'),
        payloadTemplate: z.string().optional().describe('Template of the payload sent to the subscriberUrl'),
        version: z.string().optional().describe('Payload format version of the webhook'),
        time: z.number().optional().describe('How long after the booking start time the no-show triggers are evaluated'),
        timeUnit: z.string().optional().describe('Unit of the no-show time value'),
        secret: z.string().optional().describe('Webhook secret for verifying payloads')
    })
    .describe('A Cal.com webhook configuration');

const CheckpointSchema = z.object({
    skip: z.number().int().min(0),
    inProgress: z.boolean()
});

const ProviderWebhookSchema = z.object({
    id: z.union([z.string(), z.number()]),
    userId: z.number(),
    subscriberUrl: z.string(),
    active: z.boolean(),
    triggers: z.array(z.string()),
    payloadTemplate: z.string().nullable(),
    version: z.string().nullish(),
    time: z.number().nullable(),
    timeUnit: z.string().nullable(),
    secret: z.string().nullable()
});

const ResponseEnvelopeSchema = z.object({
    status: z.enum(['success', 'error']),
    data: z.unknown().optional()
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
        const checkpoint = CheckpointSchema.safeParse(rawCheckpoint ?? { skip: 0, inProgress: false });
        if (!checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        // /v2/webhooks supports offset pagination, but it does not expose a
        // changed-since filter or updated timestamp for incremental syncs.
        let skip = checkpoint.data.skip;
        const inProgress = checkpoint.data.inProgress;

        if (!inProgress) {
            await nango.trackDeletesStart('Webhook');
        }

        const take = 100;
        let hasMore = true;

        // A manual loop (not nango.paginate) is required here: its offset paginator
        // treats any response with an empty/missing array at `response_path` as "no
        // more pages" and stops silently, with no way to inspect `status` first. A
        // provider error would look identical to "zero webhooks" and trigger a false
        // full deletion via trackDeletesEnd.
        while (hasMore) {
            // https://cal.com/docs/api-reference/v2/webhooks/get-all-webhooks
            const response = await nango.get({
                endpoint: '/webhooks',
                params: {
                    skip: String(skip),
                    take: String(take)
                },
                retries: 3
            });

            const envelope = ResponseEnvelopeSchema.safeParse(response.data);
            if (!envelope.success) {
                throw new Error(`Failed to parse webhooks response: ${envelope.error.message}`);
            }
            if (envelope.data.status !== 'success') {
                throw new Error('Cal.com API returned an error status while syncing webhooks.');
            }

            const items = z.array(ProviderWebhookSchema).safeParse(envelope.data.data);
            if (!items.success) {
                throw new Error(`Failed to parse webhooks page: ${items.error.message}`);
            }

            const webhooks = items.data.map((webhook) => ({
                id: String(webhook.id),
                userId: webhook.userId,
                subscriberUrl: webhook.subscriberUrl,
                active: webhook.active,
                triggers: webhook.triggers,
                ...(webhook.version != null && { version: webhook.version }),
                ...(webhook.payloadTemplate != null && { payloadTemplate: webhook.payloadTemplate }),
                ...(webhook.time != null && { time: webhook.time }),
                ...(webhook.timeUnit != null && { timeUnit: webhook.timeUnit }),
                ...(webhook.secret != null && { secret: webhook.secret })
            }));

            if (webhooks.length > 0) {
                await nango.batchSave(webhooks, 'Webhook');
            }

            if (items.data.length < take) {
                hasMore = false;
            } else {
                skip += take;
            }

            await nango.saveCheckpoint({ skip, inProgress: true });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Webhook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
