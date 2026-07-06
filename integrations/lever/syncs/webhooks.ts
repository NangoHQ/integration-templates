import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderWebhookSchema = z.object({
    id: z.string(),
    event: z.string(),
    url: z.string(),
    createdAt: z.number().optional(),
    configuration: z.record(z.string(), z.unknown()).optional()
});

const WebhookRecordSchema = z.object({
    id: z.string(),
    event: z.string(),
    url: z.string(),
    createdAt: z.number().optional(),
    configuration: z.record(z.string(), z.unknown()).optional()
});

const sync = createSync({
    description: 'Fetches all webhook subscriptions configured on the account.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Webhook: WebhookRecordSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes GET /v1/webhooks with no changed-since filter,
        // no deleted-record endpoint, and no timestamp-based resumable cursor. The list is
        // small and slowly-changing, so full refresh is appropriate.
        await nango.trackDeletesStart('Webhook');

        const proxyConfig: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: '/v1/webhooks',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const webhooks = page.map((record) => {
                const parsed = ProviderWebhookSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse webhook record: ${parsed.error.message}`);
                }

                const data = parsed.data;
                const mapped: { id: string; event: string; url: string; createdAt?: number; configuration?: Record<string, unknown> } = {
                    id: data.id,
                    event: data.event,
                    url: data.url
                };

                if (data.createdAt !== undefined) {
                    mapped.createdAt = data.createdAt;
                }

                if (data.configuration !== undefined) {
                    const restConfiguration: Record<string, unknown> = {};
                    for (const [key, value] of Object.entries(data.configuration)) {
                        if (key !== 'signatureToken') {
                            restConfiguration[key] = value;
                        }
                    }

                    mapped.configuration = restConfiguration;
                }

                return mapped;
            });

            if (webhooks.length > 0) {
                await nango.batchSave(webhooks, 'Webhook');
            }
        }

        await nango.trackDeletesEnd('Webhook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
