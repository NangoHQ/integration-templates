import { z } from 'zod';
import { createAction } from 'nango';

const FilterConditionSchema = z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals']),
    value: z.string()
});

const FilterSchema = z.union([
    z.object({
        $or: z.array(FilterConditionSchema)
    }),
    z.object({
        $and: z.array(FilterConditionSchema)
    }),
    z.null()
]);

const SubscriptionInputSchema = z.object({
    event_type: z.string().describe('Type of event the webhook is subscribed to. Example: "note.created"'),
    filter: FilterSchema.describe('Filters to determine whether the webhook event should be sent. Use null for no filter.')
});

const InputSchema = z.object({
    target_url: z.string().describe('URL where the webhook events will be delivered to. Example: "https://example.com/webhook"'),
    subscriptions: z.array(SubscriptionInputSchema).describe('One or more events the webhook is subscribed to.')
});

const WebhookIdSchema = z.object({
    workspace_id: z.string().describe('The ID of the workspace the webhook belongs to.'),
    webhook_id: z.string().describe('The ID of the webhook.')
});

const SubscriptionOutputSchema = z.object({
    event_type: z.string(),
    filter: FilterSchema
});

const ProviderWebhookSchema = z.object({
    target_url: z.string(),
    subscriptions: z.array(SubscriptionOutputSchema),
    id: WebhookIdSchema,
    status: z.enum(['active', 'degraded', 'inactive']),
    created_at: z.string(),
    secret: z.string()
});

const ProviderResponseSchema = z.object({
    data: ProviderWebhookSchema
});

const OutputSchema = z.object({
    target_url: z.string(),
    subscriptions: z.array(SubscriptionOutputSchema),
    id: WebhookIdSchema,
    status: z.string(),
    created_at: z.string(),
    secret: z.string()
});

const action = createAction({
    description: 'Create a webhook in Attio.',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-webhook',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.attio.com/rest-api/endpoint-reference/webhooks/create-a-webhook
            endpoint: '/v2/webhooks',
            data: {
                data: {
                    target_url: input.target_url,
                    subscriptions: input.subscriptions
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const providerWebhook = providerResponse.data;

        return {
            target_url: providerWebhook.target_url,
            subscriptions: providerWebhook.subscriptions,
            id: providerWebhook.id,
            status: providerWebhook.status,
            created_at: providerWebhook.created_at,
            secret: providerWebhook.secret
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
