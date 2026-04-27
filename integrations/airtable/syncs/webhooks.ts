import { createSync } from 'nango';
import { z } from 'zod';

const WebhookSchema = z.object({
    id: z.string(),
    notificationUrl: z.string(),
    expirationTime: z.string(),
    areNotificationsEnabled: z.boolean(),
    isHookEnabled: z.boolean(),
    cursorForNextPayload: z.number().optional(),
    lastSuccessfulNotificationTime: z.string().optional().nullable(),
    lastNotificationResult: z
        .object({
            success: z.boolean(),
            error: z.object({ message: z.string() }).optional()
        })
        .optional()
        .nullable(),
    specification: z.object({}).passthrough().optional()
});

const BaseSchema = z.object({
    id: z.string(),
    name: z.string(),
    permissionLevel: z.string().optional()
});

// Checkpoint can only contain string, number, or boolean (not optional or array)
const CheckpointSchema = z.object({
    lastProcessedBaseId: z.string()
});

type WebhooksCheckpoint = z.infer<typeof CheckpointSchema>;

type Webhook = z.infer<typeof WebhookSchema>;

const sync = createSync({
    description: 'Sync Airtable webhooks configured on bases in scope',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Webhook: WebhookSchema
    },

    endpoints: [
        {
            method: 'POST',
            path: '/syncs/webhooks'
        }
    ],

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as WebhooksCheckpoint | null;

        // Get metadata or discover bases
        const metadata = await nango.getMetadata<{ baseId?: string }>();
        let baseIds: string[] = [];

        if (metadata?.baseId) {
            baseIds = [metadata.baseId];
            await nango.log(`Using baseId from metadata: ${metadata.baseId}`);
        } else {
            // Discover bases using the Metadata API
            // https://airtable.com/developers/web/api/list-bases
            await nango.log('Discovering bases via Metadata API');
            const listBasesProxyConfig = {
                endpoint: '/v0/meta/bases',
                paginate: {
                    type: 'cursor' as const,
                    cursor_name_in_request: 'offset',
                    cursor_path_in_response: 'offset',
                    response_path: 'bases'
                },
                retries: 3
            };

            for await (const page of nango.paginate<z.infer<typeof BaseSchema>>(listBasesProxyConfig)) {
                const parsedBasesPage = z.array(BaseSchema).safeParse(page);
                if (!parsedBasesPage.success) {
                    await nango.log(`Failed to parse bases page: ${JSON.stringify(parsedBasesPage.error)}`, { level: 'error' });
                    throw new Error('Failed to parse Airtable bases page');
                }

                baseIds.push(...parsedBasesPage.data.map((base) => base.id));
            }

            await nango.log(`Discovered ${baseIds.length} bases`);
        }

        // Start tracking deletes for full refresh
        await nango.trackDeletesStart('Webhook');

        if (baseIds.length === 0) {
            await nango.log('No bases found to process');
        }

        let startIndex = 0;
        if (checkpoint?.lastProcessedBaseId) {
            const index = baseIds.findIndex((baseId) => baseId === checkpoint.lastProcessedBaseId);
            if (index !== -1) {
                startIndex = index + 1;
                await nango.log(`Resuming from base index ${startIndex} after checkpoint`);
            } else {
                await nango.log(`Checkpoint base ${checkpoint.lastProcessedBaseId} was not found; restarting full refresh`, {
                    level: 'warn'
                });
            }
        }

        // Process each base
        for (let i = startIndex; i < baseIds.length; i++) {
            const baseId = baseIds[i];
            if (!baseId) {
                continue;
            }

            await nango.log(`Processing base ${i + 1}/${baseIds.length}: ${baseId}`);

            // https://airtable.com/developers/web/api/list-webhooks
            const response = await nango.get({
                endpoint: `/v0/bases/${baseId}/webhooks`,
                retries: 3
            });

            const parsed = z
                .object({
                    webhooks: z.array(z.object({}).passthrough())
                })
                .safeParse(response.data);

            if (!parsed.success) {
                await nango.log(`Failed to parse webhooks response for base ${baseId}: ${JSON.stringify(parsed.error)}`, {
                    level: 'error'
                });
                throw new Error(`Failed to parse Airtable webhooks for base ${baseId}`);
            }

            const webhooks: Webhook[] = [];
            for (const webhook of parsed.data.webhooks) {
                const parsedWebhook = WebhookSchema.safeParse(webhook);
                if (!parsedWebhook.success) {
                    await nango.log(`Failed to parse webhook for base ${baseId}: ${JSON.stringify(parsedWebhook.error)}`, {
                        level: 'error'
                    });
                    throw new Error(`Failed to parse Airtable webhook ${JSON.stringify(webhook)}`);
                }

                webhooks.push(parsedWebhook.data);
            }

            if (webhooks.length > 0) {
                await nango.batchSave(webhooks, 'Webhook');
                await nango.log(`Saved ${webhooks.length} webhooks for base ${baseId}`);
            } else {
                await nango.log(`No webhooks found for base ${baseId}`);
            }

            await nango.saveCheckpoint({
                lastProcessedBaseId: baseId
            });
        }

        // End tracking deletes after successful full fetch
        await nango.trackDeletesEnd('Webhook');
        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
