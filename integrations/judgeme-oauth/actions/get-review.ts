import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        review_id: z.number().describe('The Judge.me review id to fetch. Example: 1306610400')
    })
    .describe('Input for fetching a single Judge.me review by its id.');

const ProviderReviewSchema = z.object({
    id: z.number(),
    rating: z.number(),
    title: z.string().nullable().optional(),
    body: z.string().nullable().optional(),
    reviewer: z
        .object({
            name: z.string().nullable().optional(),
            email: z.string().nullable().optional()
        })
        .optional(),
    product_external_id: z.number().optional(),
    product_title: z.string().nullable().optional(),
    product_handle: z.string().nullable().optional(),
    created_at: z.string(),
    published: z.boolean()
});

const OutputSchema = z
    .object({
        id: z.number().describe('The unique Judge.me review id.'),
        rating: z.number().describe('The star rating given by the reviewer, typically 1–5.'),
        title: z.string().optional().describe('The review title.'),
        body: z.string().optional().describe('The review body text.'),
        reviewer_name: z.string().optional().describe('The name of the reviewer.'),
        reviewer_email: z.string().optional().describe('The email address of the reviewer.'),
        product_id: z.number().optional().describe('The external product id associated with this review.'),
        product_title: z.string().optional().describe('The title of the reviewed product.'),
        created_at: z.string().describe('ISO 8601 timestamp when the review was created.'),
        published: z.boolean().describe('Whether the review is publicly visible.')
    })
    .describe('A single Judge.me review including rating, content, reviewer, and product details.');

/**
 * @tags: [read]
 * @tagReason: Performs a single GET request to fetch an existing review by id.
 * @pitfalls: Unpublished and auto-curated reviews are still returned; callers should check the `published` field before public display.
 */
const action = createAction({
    description: 'Fetch a single review by its Judge.me review id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_reviews'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://judge.me/api/docs
            endpoint: `/api/v1/reviews/${encodeURIComponent(String(input.review_id))}`,
            retries: 3
        });

        if (!response.data || !response.data.review) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Review with id ${input.review_id} was not found.`,
                review_id: input.review_id
            });
        }

        const providerReview = ProviderReviewSchema.parse(response.data.review);

        return {
            id: providerReview.id,
            rating: providerReview.rating,
            ...(providerReview.title != null && { title: providerReview.title }),
            ...(providerReview.body != null && { body: providerReview.body }),
            ...(providerReview.reviewer?.name != null && { reviewer_name: providerReview.reviewer.name }),
            ...(providerReview.reviewer?.email != null && { reviewer_email: providerReview.reviewer.email }),
            ...(providerReview.product_external_id != null && { product_id: providerReview.product_external_id }),
            ...(providerReview.product_title != null && { product_title: providerReview.product_title }),
            created_at: providerReview.created_at,
            published: providerReview.published
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
