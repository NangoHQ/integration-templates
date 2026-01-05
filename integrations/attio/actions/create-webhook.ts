import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

/**
 * Creates a new webhook in the Attio workspace to receive event notifications.
 * API Docs: https://docs.attio.com/rest-api/endpoint-reference/webhooks/create-a-webhook
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
const CreateWebhookInput = z.object({
    target_url: z.string(),
    subscriptions: z.array(SubscriptionInput)
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

// Output schema - includes secret which is only shown on creation
const CreateWebhookOutput = z.object({
    target_url: z.string(),
    subscriptions: z.array(Subscription),
    id: WebhookId,
    status: z.enum(['active', 'degraded', 'inactive']),
    created_at: z.string(),
    secret: z.string()
});

const action = createAction({
    description: 'Creates a new webhook in the Attio workspace',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/webhooks',
        group: 'Webhooks'
    },

    input: CreateWebhookInput,
    output: CreateWebhookOutput,
    scopes: ['webhook:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof CreateWebhookOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/webhooks/create-a-webhook
            endpoint: 'v2/webhooks',
            data: {
                data: {
                    target_url: input.target_url,
                    subscriptions: input.subscriptions.map((sub) => ({
                        event_type: sub.event_type,
                        filter: sub.filter ?? null
                    }))
                }
            },
            retries: 3
        };

        const response = await nango.post(config);
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
            created_at: webhook.created_at,
            secret: webhook.secret
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
