import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

/**
 * Lists all webhooks configured in the Attio workspace with pagination support.
 * API Docs: https://docs.attio.com/rest-api/endpoint-reference/webhooks/list-webhooks
 */

// Input schema with standard pagination
const ListWebhooksInput = z.object({
    limit: z.number().optional(),
    cursor: z.string().optional()
});

// Subscription filter schema
const SubscriptionFilter = z.object({
    field: z.string(),
    operator: z.string(),
    value: z.string()
});

const FilterGroup = z.object({
    $and: z.array(SubscriptionFilter).optional(),
    $or: z.array(SubscriptionFilter).optional()
});

// Subscription schema
const Subscription = z.object({
    event_type: z.string(),
    filter: z.union([FilterGroup, z.null()])
});

// Webhook ID schema
const WebhookId = z.object({
    workspace_id: z.string(),
    webhook_id: z.string()
});

// Webhook schema
const Webhook = z.object({
    target_url: z.string(),
    subscriptions: z.array(Subscription),
    id: WebhookId,
    status: z.enum(['active', 'degraded', 'inactive']),
    created_at: z.string()
});

// Output schema with standard pagination
const ListWebhooksOutput = z.object({
    webhooks: z.array(Webhook),
    next_cursor: z.union([z.string(), z.null()])
});

const action = createAction({
    description: 'Lists all webhooks configured in the Attio workspace',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/webhooks',
        group: 'Webhooks'
    },

    input: ListWebhooksInput,
    output: ListWebhooksOutput,
    scopes: ['webhook:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListWebhooksOutput>> => {
        const limit = input?.limit || 10;
        const offset = input?.cursor ? parseInt(input.cursor, 10) : 0;

        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/webhooks/list-webhooks
            endpoint: 'v2/webhooks',
            params: {
                limit: limit.toString(),
                offset: offset.toString()
            },
            retries: 3
        };

        const response = await nango.get(config);

        const webhooks = response.data.data.map((webhook: any) => ({
            target_url: webhook.target_url,
            subscriptions: webhook.subscriptions.map((sub: any) => ({
                event_type: sub.event_type,
                filter: sub.filter ?? null
            })),
            id: {
                workspace_id: webhook.id.workspace_id,
                webhook_id: webhook.id.webhook_id
            },
            status: webhook.status,
            created_at: webhook.created_at
        }));

        // Calculate next cursor based on offset pagination
        const hasMore = webhooks.length === limit;
        const nextOffset = offset + webhooks.length;

        return {
            webhooks,
            next_cursor: hasMore ? nextOffset.toString() : null
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
