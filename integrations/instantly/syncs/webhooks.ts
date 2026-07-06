import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderWebhookSchema = z.object({
    id: z.string(),
    organization: z.string(),
    campaign: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    target_hook_url: z.string(),
    event_type: z.string().nullable().optional(),
    custom_interest_value: z.number().nullable().optional(),
    headers: z.record(z.string(), z.string()).nullable().optional(),
    timestamp_created: z.string(),
    status: z.number().nullable().optional(),
    timestamp_error: z.string().nullable().optional()
});

const WebhookSchema = z.object({
    id: z.string(),
    organization: z.string(),
    campaign: z.string().optional(),
    name: z.string().optional(),
    target_hook_url: z.string(),
    event_type: z.string().optional(),
    custom_interest_value: z.number().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    timestamp_created: z.string(),
    status: z.number().optional(),
    timestamp_error: z.string().optional()
});

const sync = createSync({
    description: 'Sync webhook subscription configurations',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    // https://developer.instantly.ai/api-reference/groups/webhook
    endpoints: [
        {
            path: '/syncs/webhooks',
            method: 'GET'
        }
    ],
    models: {
        Webhook: WebhookSchema
    },

    exec: async (nango) => {
        // Blocker: the provider only exposes a list endpoint with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor for incremental changes.
        // Webhook counts are typically very small, so full snapshot is appropriate.
        await nango.trackDeletesStart('Webhook');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.instantly.ai/api-reference/groups/webhook
            endpoint: '/v2/webhooks',
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'starting_after',
                cursor_path_in_response: 'next_starting_after',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

            const webhooks = [];
            for (const item of page) {
                const parsed = ProviderWebhookSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse webhook: ${parsed.error.message}`);
                }

                const wh = parsed.data;
                webhooks.push({
                    id: wh.id,
                    organization: wh.organization,
                    ...(wh.campaign != null && { campaign: wh.campaign }),
                    ...(wh.name != null && { name: wh.name }),
                    target_hook_url: wh.target_hook_url,
                    ...(wh.event_type != null && { event_type: wh.event_type }),
                    ...(wh.custom_interest_value != null && { custom_interest_value: wh.custom_interest_value }),
                    ...(wh.headers != null && { headers: wh.headers }),
                    timestamp_created: wh.timestamp_created,
                    ...(wh.status != null && { status: wh.status }),
                    ...(wh.timestamp_error != null && { timestamp_error: wh.timestamp_error })
                });
            }

            if (webhooks.length > 0) {
                await nango.batchSave(webhooks, 'Webhook');
            }
        }

        await nango.trackDeletesEnd('Webhook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
