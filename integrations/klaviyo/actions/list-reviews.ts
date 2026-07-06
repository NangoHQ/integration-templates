import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    page_size: z.number().min(1).max(100).optional().describe('Number of results per page. Default: 20, Max: 100.')
});

const ProviderReviewStatusSchema = z.object({
    value: z.string(),
    rejection_reason: z
        .object({
            reason: z.string(),
            status_explanation: z.string().nullable().optional()
        })
        .optional()
});

const ProviderReviewProductSchema = z.object({
    url: z.string(),
    name: z.string(),
    image_url: z.string().nullable().optional(),
    external_id: z.string().nullable().optional()
});

const ProviderReviewPublicReplySchema = z.object({
    content: z.string(),
    author: z.string(),
    updated: z.string()
});

const ProviderReviewSchema = z.object({
    type: z.literal('review'),
    id: z.string(),
    attributes: z.object({
        email: z.string().nullable().optional(),
        status: ProviderReviewStatusSchema.nullable().optional(),
        verified: z.boolean(),
        review_type: z.string(),
        created: z.string(),
        updated: z.string(),
        images: z.array(z.string()),
        product: ProviderReviewProductSchema.nullable().optional(),
        rating: z.number().nullable().optional(),
        author: z.string().nullable().optional(),
        content: z.string().nullable().optional(),
        title: z.string().nullable().optional(),
        smart_quote: z.string().nullable().optional(),
        public_reply: ProviderReviewPublicReplySchema.nullable().optional()
    }),
    relationships: z
        .object({
            events: z
                .object({
                    data: z.array(
                        z.object({
                            type: z.string(),
                            id: z.string()
                        })
                    )
                })
                .optional(),
            item: z
                .object({
                    data: z.object({
                        type: z.string(),
                        id: z.string()
                    })
                })
                .optional()
        })
        .optional()
});

const ProviderListResponseSchema = z.object({
    data: z.array(ProviderReviewSchema),
    links: z
        .object({
            self: z.string(),
            prev: z.string().nullable().optional(),
            next: z.string().nullable().optional()
        })
        .optional()
});

const ReviewSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    status: z.string().optional(),
    rejection_reason: z.string().optional(),
    rejection_explanation: z.string().optional(),
    verified: z.boolean(),
    review_type: z.string(),
    created: z.string(),
    updated: z.string(),
    images: z.array(z.string()),
    product: z
        .object({
            url: z.string(),
            name: z.string(),
            image_url: z.string().optional(),
            external_id: z.string().optional()
        })
        .optional(),
    rating: z.number().optional(),
    author: z.string().optional(),
    content: z.string().optional(),
    title: z.string().optional(),
    smart_quote: z.string().optional(),
    public_reply: z
        .object({
            content: z.string(),
            author: z.string(),
            updated: z.string()
        })
        .optional(),
    event_ids: z.array(z.string()).optional(),
    item_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ReviewSchema),
    next_cursor: z.string().optional()
});

function extractNextCursor(nextUrl: string | null | undefined): string | undefined {
    if (!nextUrl) {
        return undefined;
    }
    const parsed = new URL(nextUrl);
    const cursor = parsed.searchParams.get('page[cursor]');
    return cursor ?? undefined;
}

const action = createAction({
    description: 'List product reviews.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['reviews:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.klaviyo.com/en/reference/get_reviews
        const response = await nango.get({
            endpoint: '/api/reviews',
            params: {
                ...(input.cursor !== undefined && { 'page[cursor]': input.cursor }),
                ...(input.page_size !== undefined && { 'page[size]': String(input.page_size) })
            },
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const parsed = ProviderListResponseSchema.parse(response.data);

        const items = parsed.data.map((review) => {
            const attr = review.attributes;
            const statusValue = attr.status?.value;
            const rejectionReason = attr.status?.rejection_reason;

            return {
                id: review.id,
                ...(attr.email != null && { email: attr.email }),
                ...(statusValue != null && { status: statusValue }),
                ...(rejectionReason != null && {
                    rejection_reason: rejectionReason.reason,
                    ...(rejectionReason.status_explanation != null && {
                        rejection_explanation: rejectionReason.status_explanation
                    })
                }),
                verified: attr.verified,
                review_type: attr.review_type,
                created: attr.created,
                updated: attr.updated,
                images: attr.images,
                ...(attr.product != null && {
                    product: {
                        url: attr.product.url,
                        name: attr.product.name,
                        ...(attr.product.image_url != null && { image_url: attr.product.image_url }),
                        ...(attr.product.external_id != null && { external_id: attr.product.external_id })
                    }
                }),
                ...(attr.rating != null && { rating: attr.rating }),
                ...(attr.author != null && { author: attr.author }),
                ...(attr.content != null && { content: attr.content }),
                ...(attr.title != null && { title: attr.title }),
                ...(attr.smart_quote != null && { smart_quote: attr.smart_quote }),
                ...(attr.public_reply != null && {
                    public_reply: {
                        content: attr.public_reply.content,
                        author: attr.public_reply.author,
                        updated: attr.public_reply.updated
                    }
                }),
                ...(review.relationships?.events != null && {
                    event_ids: review.relationships.events.data.map((event) => event.id)
                }),
                ...(review.relationships?.item != null && {
                    item_id: review.relationships.item.data.id
                })
            };
        });

        return {
            items,
            next_cursor: extractNextCursor(parsed.links?.next)
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
