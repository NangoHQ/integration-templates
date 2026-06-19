import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (_skip offset) from the previous response. Omit for the first page.')
});

const WebhookEventSchema = z.object({
    action: z.string(),
    extra_filter: z.string().optional(),
    object_type: z.string()
});

const WebhookSchema = z.object({
    id: z.string().describe('Webhook ID. Example: "whsub_123"'),
    url: z.string().describe('Webhook URL. Example: "https://example.com/webhook"'),
    events: z.array(WebhookEventSchema).describe('List of event subscriptions.'),
    status: z.enum(['active', 'paused']).describe('Webhook status.')
});

const OutputSchema = z.object({
    items: z.array(WebhookSchema),
    next_cursor: z.string().optional().describe('Pagination cursor for the next page. Omitted if there are no more pages.')
});

const ProviderWebhookEventSchema = z
    .object({
        action: z.string(),
        extra_filter: z.string().nullable().optional(),
        object_type: z.string()
    })
    .passthrough();

const ProviderWebhookSchema = z
    .object({
        id: z.string(),
        url: z.string(),
        events: z.array(ProviderWebhookEventSchema),
        status: z.enum(['active', 'paused'])
    })
    .passthrough();

const ProviderListResponseSchema = z
    .object({
        data: z.array(ProviderWebhookSchema),
        has_more: z.boolean()
    })
    .passthrough();

const action = createAction({
    description: 'List all configured webhooks for the organization.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? Number(input.cursor) : 0;
        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid numeric offset string'
            });
        }

        // https://developer.close.com/
        const response = await nango.get({
            endpoint: '/v1/webhook/',
            params: {
                _skip: String(skip),
                _limit: '200'
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);
        const items = parsed.data.map((webhook) => ({
            id: webhook.id,
            url: webhook.url,
            events: webhook.events.map((event) => ({
                action: event.action,
                object_type: event.object_type,
                ...(event.extra_filter != null && { extra_filter: event.extra_filter })
            })),
            status: webhook.status
        }));

        const nextCursor = parsed.has_more ? String(skip + parsed.data.length) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
