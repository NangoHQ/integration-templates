import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().int().positive().describe('Unique identifier for the product review. Example: 3'),
    product_id: z.number().int().positive().optional().describe('Unique identifier for the product the review belongs to.'),
    review: z.string().optional().describe('The content of the review.'),
    reviewer: z.string().optional().describe('Reviewer name.'),
    reviewer_email: z.string().email().optional().describe('Reviewer email.'),
    rating: z.number().int().min(0).max(5).optional().describe('Review rating (0-5).'),
    verified: z.boolean().optional().describe('Whether the reviewer is a verified customer.'),
    status: z.enum(['approved', 'hold', 'spam', 'unspam', 'trash', 'untrash']).optional().describe('Status of the review.')
});

const ProviderReviewSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    product_name: z.string().optional(),
    review: z.string().nullable().optional(),
    reviewer: z.string().nullable().optional(),
    reviewer_email: z.string().nullable().optional(),
    rating: z.number().nullable().optional(),
    verified: z.boolean().nullable().optional(),
    status: z.string().nullable().optional(),
    date_created: z.string().nullable().optional(),
    date_created_gmt: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.number().describe('Unique identifier for the product review.'),
    product_id: z.number().describe('Unique identifier for the product the review belongs to.'),
    product_name: z.string().optional().describe('Product name.'),
    review: z.string().optional().describe('The content of the review.'),
    reviewer: z.string().optional().describe('Reviewer name.'),
    reviewer_email: z.string().optional().describe('Reviewer email.'),
    rating: z.number().optional().describe('Review rating (0-5).'),
    verified: z.boolean().optional().describe('Whether the reviewer is a verified customer.'),
    status: z.string().optional().describe('Status of the review.'),
    date_created: z.string().optional().describe('The date the review was created, in the site timezone.'),
    date_created_gmt: z.string().optional().describe('The date the review was created, as GMT.')
});

const action = createAction({
    description: 'Update a product review in WooCommerce',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const payload: Record<string, unknown> = {};

        if (input.product_id !== undefined) {
            payload['product_id'] = input.product_id;
        }
        if (input.review !== undefined) {
            payload['review'] = input.review;
        }
        if (input.reviewer !== undefined) {
            payload['reviewer'] = input.reviewer;
        }
        if (input.reviewer_email !== undefined) {
            payload['reviewer_email'] = input.reviewer_email;
        }
        if (input.rating !== undefined) {
            payload['rating'] = input.rating;
        }
        if (input.verified !== undefined) {
            payload['verified'] = input.verified;
        }
        if (input.status !== undefined) {
            payload['status'] = input.status;
        }

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#update-a-product-review
        const response = await nango.patch({
            endpoint: `/wp-json/wc/v3/products/reviews/${encodeURIComponent(input.id)}`,
            data: payload,
            retries: 3
        });

        const providerReview = ProviderReviewSchema.parse(response.data);

        return {
            id: providerReview.id,
            product_id: providerReview.product_id,
            ...(providerReview.product_name != null && { product_name: providerReview.product_name }),
            ...(providerReview.review != null && { review: providerReview.review }),
            ...(providerReview.reviewer != null && { reviewer: providerReview.reviewer }),
            ...(providerReview.reviewer_email != null && { reviewer_email: providerReview.reviewer_email }),
            ...(providerReview.rating != null && { rating: providerReview.rating }),
            ...(providerReview.verified != null && { verified: providerReview.verified }),
            ...(providerReview.status != null && { status: providerReview.status }),
            ...(providerReview.date_created != null && { date_created: providerReview.date_created }),
            ...(providerReview.date_created_gmt != null && { date_created_gmt: providerReview.date_created_gmt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
