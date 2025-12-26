import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

/**
 * Updates an existing webhook configuration in Attio.
 * API Docs: https://docs.attio.com/rest-api/endpoint-reference/webhooks/update-a-webhook
 */

// Subscription filter schema for input
const SubscriptionFilterInput = z.object({
    field: z.string(),
    operator: z.string(),
    value: z.string()
});

const FilterGroupInput = z.object({
    $and: z.array(SubscriptionFilterInput).optional(),
    $or: z.array(SubscriptionFilterInput).optional()
});

// Subscription schema for input
const SubscriptionInput = z.object({
    event_type: z.string(),
    filter: z.union([FilterGroupInput, z.null()]).optional()
});

// Input schema
const UpdateWebhookInput = z.object({
    webhook_id: z.string(),
    target_url: z.string().optional(),
    subscriptions: z.array(SubscriptionInput).optional()
});

// Subscription filter schema for output
const SubscriptionFilter = z.object({
    field: z.string(),
    operator: z.string(),
    value: z.string()
});

const FilterGroup = z.object({
    $and: z.array(SubscriptionFilter).optional(),
    $or: z.array(SubscriptionFilter).optional()
});

// Subscription schema for output
const Subscription = z.object({
    event_type: z.string(),
    filter: z.union([FilterGroup, z.null()])
});

// Webhook ID schema
const WebhookId = z.object({
    workspace_id: z.string(),
    webhook_id: z.string()
});

// Output schema
const UpdateWebhookOutput = z.object({
    target_url: z.string(),
    subscriptions: z.array(Subscription),
    id: WebhookId,
    status: z.enum(['active', 'degraded', 'inactive']),
    created_at: z.string()
});

const action = createAction({
    description: 'Updates an existing webhook configuration in Attio',
    version: '1.0.0',

    endpoint: {
        method: 'PATCH',
        path: '/webhooks/{webhook_id}',
        group: 'Webhooks'
    },

    input: UpdateWebhookInput,
    output: UpdateWebhookOutput,
    scopes: ['webhook:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof UpdateWebhookOutput>> => {
        const data: Record<string, any> = {};

        if (input.target_url) {
            data['target_url'] = input.target_url;
        }

        if (input.subscriptions) {
            data['subscriptions'] = input.subscriptions.map((sub) => ({
                event_type: sub.event_type,
                filter: sub.filter ?? null
            }));
        }

        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/webhooks/update-a-webhook
            endpoint: `v2/webhooks/${input.webhook_id}`,
            data: { data },
            retries: 3
        };

        const response = await nango.patch(config);
        const webhook = response.data.data;

        return {
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
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
