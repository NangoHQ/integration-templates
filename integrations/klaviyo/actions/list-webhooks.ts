import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const WebhookTopicRelationshipSchema = z.object({
    type: z.literal('webhook-topic'),
    id: z.string()
});

const WebhookAttributesSchema = z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    endpoint_url: z.string(),
    enabled: z.boolean(),
    created_at: z.string().nullable().optional(),
    updated_at: z.string().nullable().optional()
});

const WebhookItemSchema = z.object({
    type: z.literal('webhook'),
    id: z.string(),
    attributes: WebhookAttributesSchema,
    relationships: z
        .object({
            'webhook-topics': z
                .object({
                    data: z.array(WebhookTopicRelationshipSchema).optional(),
                    links: z
                        .object({
                            self: z.string().optional(),
                            related: z.string().optional()
                        })
                        .optional()
                })
                .optional()
        })
        .optional(),
    links: z
        .object({
            self: z.string().optional()
        })
        .optional()
});

const ResponseLinksSchema = z.object({
    self: z.string(),
    prev: z.string().nullable().optional(),
    next: z.string().nullable().optional()
});

const WebhookResponseSchema = z.object({
    data: z.array(z.unknown()),
    links: ResponseLinksSchema.optional(),
    included: z.array(z.unknown()).optional()
});

const WebhookOutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    endpoint_url: z.string(),
    enabled: z.boolean(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    webhook_topics: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    items: z.array(WebhookOutputSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List webhook subscriptions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['webhooks:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.klaviyo.com/en/reference/get_webhooks
            endpoint: '/api/webhooks',
            params: {
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor })
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const parsedResponse = WebhookResponseSchema.parse(response.data);

        const items = parsedResponse.data.map((item) => {
            const parsedItem = WebhookItemSchema.safeParse(item);
            if (!parsedItem.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid webhook item in response',
                    error: parsedItem.error.message
                });
            }

            const topics = parsedItem.data.relationships?.['webhook-topics']?.data?.map((topic) => topic.id) ?? [];

            const attributes = parsedItem.data.attributes;

            return {
                id: parsedItem.data.id,
                name: attributes.name,
                endpoint_url: attributes.endpoint_url,
                enabled: attributes.enabled,
                ...(attributes.description != null && { description: attributes.description }),
                ...(attributes.created_at != null && { created_at: attributes.created_at }),
                ...(attributes.updated_at != null && { updated_at: attributes.updated_at }),
                ...(topics.length > 0 && { webhook_topics: topics })
            };
        });

        let nextCursor: string | undefined;
        const nextLink = parsedResponse.links?.next;
        if (typeof nextLink === 'string' && nextLink !== '') {
            const nextUrl = new URL(nextLink);
            const cursor = nextUrl.searchParams.get('page[cursor]');
            if (cursor !== null && cursor !== '') {
                nextCursor = cursor;
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
