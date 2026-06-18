import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('The product review ID. Example: 5'),
    force: z.boolean().optional().describe('Whether to permanently delete the review. Defaults to false (trash/archive).')
});

const ProviderReviewSchema = z.object({
    id: z.number(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    product_id: z.number().optional(),
    product_name: z.string().optional(),
    product_permalink: z.string().optional(),
    status: z.string().optional(),
    reviewer: z.string().optional(),
    reviewer_email: z.string().optional(),
    review: z.string().optional(),
    rating: z.number().optional(),
    verified: z.boolean().optional(),
    reviewer_avatar_urls: z.record(z.string(), z.string()).optional()
});

const DeleteResponseSchema = z.object({
    deleted: z.boolean(),
    previous: ProviderReviewSchema
});

const OutputSchema = z.object({
    id: z.number(),
    date_created: z.string().optional(),
    product_id: z.number().optional(),
    status: z.string().optional(),
    reviewer: z.string().optional(),
    reviewer_email: z.string().optional(),
    review: z.string().optional(),
    rating: z.number().optional(),
    verified: z.boolean().optional()
});

const action = createAction({
    description: 'Delete or archive a product review in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-a-product-review
        const response = await nango.delete({
            endpoint: `/wp-json/wc/v3/products/reviews/${encodeURIComponent(String(input.id))}`,
            params: {
                ...(input.force !== undefined && { force: String(input.force) })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Product review ${input.id} not found or could not be deleted.`
            });
        }

        // WooCommerce returns {deleted, previous} when force=true, or the updated
        // review object directly when trashing (force=false / omitted).
        const providerReview =
            typeof response.data === 'object' && response.data !== null && 'deleted' in response.data
                ? DeleteResponseSchema.parse(response.data).previous
                : ProviderReviewSchema.parse(response.data);

        return {
            id: providerReview.id,
            ...(providerReview.date_created !== undefined && { date_created: providerReview.date_created }),
            ...(providerReview.product_id !== undefined && { product_id: providerReview.product_id }),
            ...(providerReview.status !== undefined && { status: providerReview.status }),
            ...(providerReview.reviewer !== undefined && { reviewer: providerReview.reviewer }),
            ...(providerReview.reviewer_email !== undefined && { reviewer_email: providerReview.reviewer_email }),
            ...(providerReview.review !== undefined && { review: providerReview.review }),
            ...(providerReview.rating !== undefined && { rating: providerReview.rating }),
            ...(providerReview.verified !== undefined && { verified: providerReview.verified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
