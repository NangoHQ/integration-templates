import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ReviewStatusSchema = z.object({
    value: z.string(),
    rejection_reason: z.unknown().optional()
});

const ReviewProductSchema = z.object({
    url: z.string(),
    name: z.string(),
    image_url: z.string().nullable().optional(),
    external_id: z.string().nullable().optional()
});

const ReviewPublicReplySchema = z.object({
    content: z.string(),
    author: z.string(),
    updated: z.string()
});

const ReviewAttributesSchema = z.object({
    email: z.string().nullable().optional(),
    status: ReviewStatusSchema.nullable().optional(),
    verified: z.boolean(),
    review_type: z.string(),
    created: z.string(),
    updated: z.string(),
    images: z.array(z.string()),
    product: ReviewProductSchema.nullable().optional(),
    rating: z.number().nullable().optional(),
    author: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    smart_quote: z.string().nullable().optional(),
    public_reply: ReviewPublicReplySchema.nullable().optional()
});

const ReviewResourceSchema = z.object({
    type: z.literal('review'),
    id: z.string(),
    attributes: ReviewAttributesSchema,
    relationships: z
        .object({
            events: z
                .object({
                    data: z
                        .array(
                            z.object({
                                type: z.string(),
                                id: z.string()
                            })
                        )
                        .optional()
                })
                .optional(),
            item: z
                .object({
                    data: z
                        .object({
                            type: z.string(),
                            id: z.string()
                        })
                        .optional()
                })
                .optional()
        })
        .optional()
});

const ReviewSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    status: z.string().optional(),
    verified: z.boolean(),
    review_type: z.string(),
    created: z.string(),
    updated: z.string(),
    images: z.array(z.string()).optional(),
    product_url: z.string().optional(),
    product_name: z.string().optional(),
    product_image_url: z.string().optional(),
    product_external_id: z.string().optional(),
    rating: z.number().optional(),
    author: z.string().optional(),
    content: z.string().optional(),
    title: z.string().optional(),
    smart_quote: z.string().optional(),
    public_reply_content: z.string().optional(),
    public_reply_author: z.string().optional(),
    public_reply_updated: z.string().optional(),
    item_id: z.string().optional(),
    event_ids: z.array(z.string()).optional()
});

const sync = createSync({
    description: 'Sync product reviews',
    version: '1.0.0',
    frequency: 'every hour',
    models: {
        Review: ReviewSchema
    },

    exec: async (nango) => {
        // Blocker: the reviews list endpoint does not expose an updated_after or
        // modified_since filter. The available filters (created, rating, id,
        // item.id, content, status, review_type, verified) cannot identify
        // changed records since a prior sync. Reviews may also be removed or
        // moderated, so full-refresh delete tracking is required.
        await nango.trackDeletesStart('Review');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.klaviyo.com/en/reference/get_reviews
            endpoint: '/api/reviews',
            headers: { revision: '2026-04-15' },
            paginate: {
                type: 'link',
                link_path_in_response_body: 'links.next',
                response_path: 'data',
                limit_name_in_request: 'page[size]',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected paginated page to be an array of reviews');
            }

            const parsedPage = z.array(ReviewResourceSchema).parse(page);
            const reviews = parsedPage.map((resource) => {
                const attrs = resource.attributes;
                const statusObj = attrs.status;
                const statusValue = statusObj?.value;

                const product = attrs.product;
                const publicReply = attrs.public_reply;
                const itemRel = resource.relationships?.item?.data;
                const eventRels = resource.relationships?.events?.data;

                return {
                    id: resource.id,
                    ...(attrs.email != null && { email: attrs.email }),
                    ...(statusValue != null && { status: statusValue }),
                    verified: attrs.verified,
                    review_type: attrs.review_type,
                    created: attrs.created,
                    updated: attrs.updated,
                    ...(attrs.images.length > 0 && { images: attrs.images }),
                    ...(product != null && {
                        product_url: product.url,
                        product_name: product.name,
                        ...(product.image_url != null && { product_image_url: product.image_url }),
                        ...(product.external_id != null && { product_external_id: product.external_id })
                    }),
                    ...(attrs.rating != null && { rating: attrs.rating }),
                    ...(attrs.author != null && { author: attrs.author }),
                    ...(attrs.content != null && { content: attrs.content }),
                    ...(attrs.title != null && { title: attrs.title }),
                    ...(attrs.smart_quote != null && { smart_quote: attrs.smart_quote }),
                    ...(publicReply != null && {
                        public_reply_content: publicReply.content,
                        public_reply_author: publicReply.author,
                        public_reply_updated: publicReply.updated
                    }),
                    ...(itemRel != null && { item_id: itemRel.id }),
                    ...(eventRels != null && eventRels.length > 0 && { event_ids: eventRels.map((e) => e.id) })
                };
            });

            if (reviews.length > 0) {
                await nango.batchSave(reviews, 'Review');
            }
        }

        await nango.trackDeletesEnd('Review');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
