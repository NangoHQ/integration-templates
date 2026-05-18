import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().int().min(10).max(100).optional().describe('The maximum number of results to return, between 10 and 100. Defaults to 10.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderWebhookIdSchema = z.object({
    workspace_id: z.string(),
    webhook_id: z.string()
});

const ProviderSubscriptionSchema = z.object({
    event_type: z.string(),
    filter: z.unknown().nullable()
});

const ProviderWebhookSchema = z.object({
    target_url: z.string(),
    subscriptions: z.array(ProviderSubscriptionSchema),
    id: ProviderWebhookIdSchema,
    status: z.string(),
    created_at: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(ProviderWebhookSchema)
});

const WebhookSchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        webhook_id: z.string()
    }),
    target_url: z.string(),
    subscriptions: z.array(
        z.object({
            event_type: z.string(),
            filter: z.unknown().nullable()
        })
    ),
    status: z.string(),
    created_at: z.string()
});

const OutputSchema = z.object({
    items: z.array(WebhookSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List webhooks from Attio.',
    version: '2.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-webhooks',
        group: 'Webhooks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhook:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const limit = input.limit ?? 10;
        const offset = input.cursor ? parseInt(input.cursor, 10) : 0;

        if (Number.isNaN(offset)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid integer string.'
            });
        }

        const response = await nango.get({
            // https://docs.attio.com/rest-api/endpoint-reference/webhooks/list-webhooks
            endpoint: '/v2/webhooks',
            params: {
                limit: String(limit),
                offset: String(offset)
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const items = providerResponse.data.map((webhook) => ({
            id: webhook.id,
            target_url: webhook.target_url,
            subscriptions: webhook.subscriptions.map((subscription) => ({
                event_type: subscription.event_type,
                filter: subscription.filter
            })),
            status: webhook.status,
            created_at: webhook.created_at
        }));

        const hasMore = providerResponse.data.length === limit;

        return {
            items,
            ...(hasMore && { next_cursor: String(offset + limit) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
