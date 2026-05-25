import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    product_id: z.number().int().positive().describe('Product ID to review. Example: 13'),
    reviewer: z.string().describe('Name of the reviewer. Example: "John Doe"'),
    reviewer_email: z.string().email().describe('Email address of the reviewer. Example: "john@example.com"'),
    review: z.string().optional().describe('Review content text.'),
    rating: z.number().int().min(1).max(5).optional().describe('Star rating from 1 to 5.'),
    verified: z.boolean().optional().describe('Whether the review is verified.')
});

const ProviderReviewSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    reviewer: z.string(),
    reviewer_email: z.string(),
    review: z.string().nullable(),
    rating: z.number().nullable(),
    verified: z.boolean(),
    date_created: z.string(),
    date_created_gmt: z.string()
});

const OutputSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    reviewer: z.string(),
    reviewer_email: z.string(),
    review: z.string().optional(),
    rating: z.number().optional(),
    verified: z.boolean(),
    date_created: z.string(),
    date_created_gmt: z.string()
});

const action = createAction({
    description: 'Create a product review in WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-product-review',
        group: 'Product Reviews'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://woocommerce.github.io/woocommerce-rest-api-docs/#create-a-product-review
        const response = await nango.post({
            endpoint: '/wp-json/wc/v3/products/reviews',
            data: {
                product_id: input.product_id,
                reviewer: input.reviewer,
                reviewer_email: input.reviewer_email,
                ...(input.review !== undefined && { review: input.review }),
                ...(input.rating !== undefined && { rating: input.rating }),
                ...(input.verified !== undefined && { verified: input.verified })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create product review: empty response from API'
            });
        }

        const providerReview = ProviderReviewSchema.parse(response.data);

        return {
            id: providerReview.id,
            product_id: providerReview.product_id,
            reviewer: providerReview.reviewer,
            reviewer_email: providerReview.reviewer_email,
            ...(providerReview.review != null && { review: providerReview.review }),
            ...(providerReview.rating != null && { rating: providerReview.rating }),
            verified: providerReview.verified,
            date_created: providerReview.date_created,
            date_created_gmt: providerReview.date_created_gmt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
