import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

/**
 * Gets a single webhook by its ID from the Attio workspace.
 * API Docs: https://docs.attio.com/rest-api/endpoint-reference/webhooks/get-a-webhook
 */

// Input schema
const GetWebhookInput = z.object({
    webhook_id: z.string()
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

// Output schema
const GetWebhookOutput = z.object({
    target_url: z.string(),
    subscriptions: z.array(Subscription),
    id: WebhookId,
    status: z.enum(['active', 'degraded', 'inactive']),
    created_at: z.string()
});

const action = createAction({
    description: 'Gets a single webhook by its ID from the Attio workspace',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/webhooks/{webhook_id}',
        group: 'Webhooks'
    },

    input: GetWebhookInput,
    output: GetWebhookOutput,
    scopes: ['webhook:read'],

    exec: async (nango, input): Promise<z.infer<typeof GetWebhookOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/webhooks/get-a-webhook
            endpoint: `v2/webhooks/${input.webhook_id}`,
            retries: 3
        };

        const response = await nango.get(config);
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
