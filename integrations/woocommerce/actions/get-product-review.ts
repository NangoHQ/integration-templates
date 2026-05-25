import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.number().int().positive().describe('Unique identifier for the product review. Example: 3')
});

const ProviderReviewSchema = z.object({
    id: z.number(),
    date_created: z.string().nullable().optional(),
    date_created_gmt: z.string().nullable().optional(),
    product_id: z.number().nullable().optional(),
    status: z.string().nullable().optional(),
    reviewer: z.string().nullable().optional(),
    reviewer_email: z.string().nullable().optional(),
    review: z.string().nullable().optional(),
    rating: z.number().nullable().optional(),
    verified: z.boolean().nullable().optional(),
    reviewer_avatar_urls: z.record(z.string(), z.string()).nullable().optional(),
    _links: z.record(z.string(), z.unknown()).nullable().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    product_id: z.number().optional(),
    status: z.string().optional(),
    reviewer: z.string().optional(),
    reviewer_email: z.string().optional(),
    review: z.string().optional(),
    rating: z.number().optional(),
    verified: z.boolean().optional(),
    reviewer_avatar_urls: z.record(z.string(), z.string()).optional(),
    _links: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a single product review from WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-product-review',
        group: 'Product Reviews'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-a-product-review
            endpoint: `/wp-json/wc/v3/products/reviews/${encodeURIComponent(String(input.id))}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Product review not found',
                id: input.id
            });
        }

        const providerReview = ProviderReviewSchema.parse(response.data);

        return {
            id: providerReview.id,
            ...(providerReview.date_created != null && { date_created: providerReview.date_created }),
            ...(providerReview.date_created_gmt != null && { date_created_gmt: providerReview.date_created_gmt }),
            ...(providerReview.product_id != null && { product_id: providerReview.product_id }),
            ...(providerReview.status != null && { status: providerReview.status }),
            ...(providerReview.reviewer != null && { reviewer: providerReview.reviewer }),
            ...(providerReview.reviewer_email != null && { reviewer_email: providerReview.reviewer_email }),
            ...(providerReview.review != null && { review: providerReview.review }),
            ...(providerReview.rating != null && { rating: providerReview.rating }),
            ...(providerReview.verified != null && { verified: providerReview.verified }),
            ...(providerReview.reviewer_avatar_urls != null && { reviewer_avatar_urls: providerReview.reviewer_avatar_urls }),
            ...(providerReview._links != null && { _links: providerReview._links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
