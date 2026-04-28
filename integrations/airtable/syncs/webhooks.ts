import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    baseId: z.string().optional()
});

const ProviderBaseSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    permissionLevel: z.string().optional()
});

const ProviderBasesResponseSchema = z.object({
    bases: z.array(ProviderBaseSchema),
    offset: z.string().optional()
});

const WebhookNotificationResultSchema = z.object({
    success: z.boolean().optional(),
    completionTimestamp: z.string().optional(),
    durationMs: z.number().optional(),
    retryNumber: z.number().optional(),
    willBeRetried: z.boolean().optional(),
    error: z.object({ message: z.string().optional() }).optional()
});

const ProviderWebhookSchema = z.object({
    id: z.string(),
    areNotificationsEnabled: z.boolean(),
    cursorForNextPayload: z.number(),
    isHookEnabled: z.boolean(),
    lastSuccessfulNotificationTime: z.string().nullable().optional(),
    notificationUrl: z.string().nullable().optional(),
    lastNotificationResult: WebhookNotificationResultSchema.nullable().optional(),
    expirationTime: z.string().nullable().optional(),
    specification: z.object({}).passthrough().optional()
});

const ProviderWebhooksResponseSchema = z.object({
    webhooks: z.array(ProviderWebhookSchema)
});

const WebhookSchema = z.object({
    id: z.string(),
    baseId: z.string(),
    notificationUrl: z.string().optional(),
    isHookEnabled: z.boolean(),
    areNotificationsEnabled: z.boolean(),
    cursorForNextPayload: z.number(),
    expirationTime: z.string().optional(),
    lastSuccessfulNotificationTime: z.string().optional(),
    lastNotificationResult: WebhookNotificationResultSchema.optional(),
    specification: z.object({}).passthrough().optional()
});

const CheckpointSchema = z.object({
    offset: z.string()
});

const sync = createSync({
    description: 'Sync Airtable webhooks configured on bases in scope',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    checkpoint: CheckpointSchema,
    models: {
        Webhook: WebhookSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/webhooks' }],

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata ?? {});
        if (!metadataResult.success) {
            throw new Error('Invalid metadata: ' + JSON.stringify(metadataResult.error.issues));
        }
        const metadata = metadataResult.data;
        const checkpoint = await nango.getCheckpoint();
        let offset = metadata.baseId ? undefined : typeof checkpoint?.['offset'] === 'string' ? checkpoint['offset'] : undefined;

        // Airtable does not expose changed-only webhook configuration reads, so resume uses base-list pagination.
        await nango.trackDeletesStart('Webhook');

        do {
            const baseIds: string[] = [];

            if (metadata.baseId) {
                baseIds.push(metadata.baseId);
            } else {
                const basesResponse = await nango.get({
                    // https://airtable.com/developers/web/api/list-bases
                    endpoint: '/v0/meta/bases',
                    params: {
                        ...(offset ? { offset } : {})
                    },
                    retries: 3
                });

                const basesResult = ProviderBasesResponseSchema.parse(basesResponse.data);
                for (const base of basesResult.bases) {
                    baseIds.push(base.id);
                }
                offset = basesResult.offset;
            }

            if (baseIds.length === 0) {
                break;
            }

            const webhooks: z.infer<typeof WebhookSchema>[] = [];
            for (const baseId of baseIds) {
                // https://airtable.com/developers/web/api/list-webhooks
                const response = await nango.get({
                    endpoint: `/v0/bases/${baseId}/webhooks`,
                    retries: 3
                });

                const parsed = ProviderWebhooksResponseSchema.safeParse(response.data);
                if (!parsed.success) {
                    throw new Error('Invalid webhooks response: ' + JSON.stringify(parsed.error.issues));
                }

                webhooks.push(
                    ...parsed.data.webhooks.map((webhook) => ({
                        id: webhook.id,
                        baseId,
                        isHookEnabled: webhook.isHookEnabled,
                        areNotificationsEnabled: webhook.areNotificationsEnabled,
                        cursorForNextPayload: webhook.cursorForNextPayload,
                        ...(webhook.notificationUrl != null && { notificationUrl: webhook.notificationUrl }),
                        ...(webhook.expirationTime != null && { expirationTime: webhook.expirationTime }),
                        ...(webhook.lastSuccessfulNotificationTime != null && { lastSuccessfulNotificationTime: webhook.lastSuccessfulNotificationTime }),
                        ...(webhook.lastNotificationResult != null && { lastNotificationResult: webhook.lastNotificationResult }),
                        ...(webhook.specification != null && { specification: webhook.specification })
                    }))
                );
            }

            if (webhooks.length > 0) {
                await nango.batchSave(webhooks, 'Webhook');
            }

            if (!metadata.baseId && offset) {
                await nango.saveCheckpoint({ offset });
            }
        } while (!metadata.baseId && offset);

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Webhook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
