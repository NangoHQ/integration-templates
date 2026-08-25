import { z } from 'zod';
import { createAction } from 'nango';

const ListReviewsInput = z
    .object({
        page: z.number().int().min(1).optional().describe('Page number for offset pagination (starts at 1)'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of reviews per page (max 100, default 10)'),
        rating: z.number().int().min(1).max(5).optional().describe('Filter reviews by star rating (1-5)'),
        product_id: z.number().int().optional().describe('Filter reviews by Judge.me internal product ID'),
        published: z.boolean().optional().describe('Filter reviews by published status')
    })
    .describe('Input parameters for listing reviews');

const ReviewerOutput = z.object({
    id: z.number().int().describe('Judge.me internal reviewer ID'),
    external_id: z.number().int().optional().describe('External platform reviewer ID'),
    email: z.string().optional().describe('Reviewer email address'),
    name: z.string().optional().describe('Reviewer display name'),
    phone: z.string().optional().describe('Reviewer phone number'),
    accepts_marketing: z.boolean().optional().describe('Whether the reviewer accepts marketing emails'),
    unsubscribed_at: z.string().optional().describe('ISO 8601 timestamp when the reviewer unsubscribed'),
    tags: z.array(z.string()).optional().describe('Reviewer tags')
});

const PictureOutput = z.object({
    urls: z.record(z.string(), z.string()).optional().describe('Map of picture size keys to public image URLs')
});

const ReviewOutput = z.object({
    id: z.number().int().describe('Judge.me internal review ID'),
    title: z.string().optional().describe('Review title'),
    body: z.string().optional().describe('Review body text'),
    rating: z.number().int().min(1).max(5).describe('Star rating from 1 to 5'),
    product_external_id: z.number().int().optional().describe('External platform product ID the review belongs to'),
    reviewer: ReviewerOutput.optional().describe('Reviewer who submitted the review'),
    source: z.string().optional().describe('Origin of the review such as web, api, or import'),
    curated: z.string().optional().describe('Curation or publish status of the review'),
    published: z.boolean().optional().describe('Whether the review is published'),
    hidden: z.boolean().optional().describe('Whether the review is hidden'),
    verified: z.string().optional().describe('Verification status of the buyer'),
    created_at: z.string().describe('ISO 8601 timestamp when the review was created'),
    updated_at: z.string().describe('ISO 8601 timestamp when the review was last updated'),
    pictures: z.array(PictureOutput).optional().describe('Attached pictures with size URLs')
});

const ListReviewsOutput = z
    .object({
        current_page: z.number().int().describe('Current page number in the paginated result set'),
        per_page: z.number().int().describe('Number of reviews returned per page'),
        reviews: z.array(ReviewOutput).describe('List of reviews for the current page'),
        next_page: z
            .number()
            .int()
            .optional()
            .describe(
                'Page number to try next. Omitted when this page returned fewer results than per_page. The provider does not expose a total count, so a present value means another page is possible, not guaranteed — it may come back empty.'
            )
    })
    .describe('Paginated list of reviews for the shop');

const RawReviewer = z.object({
    id: z.number(),
    external_id: z.union([z.string(), z.number()]).optional().nullable(),
    email: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    accepts_marketing: z.boolean().optional().nullable(),
    unsubscribed_at: z.string().optional().nullable(),
    tags: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .nullable()
});

const RawPicture = z.object({
    urls: z.record(z.string(), z.string()).optional().nullable()
});

const RawReview = z.object({
    id: z.number(),
    title: z.string().optional().nullable(),
    body: z.string().optional().nullable(),
    rating: z.number(),
    product_external_id: z.union([z.string(), z.number()]).optional().nullable(),
    reviewer: RawReviewer.optional().nullable(),
    source: z.string().optional().nullable(),
    curated: z.string().optional().nullable(),
    published: z.boolean().optional().nullable(),
    hidden: z.boolean().optional().nullable(),
    verified: z.string().optional().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    pictures: z.array(RawPicture).optional().nullable()
});

/**
 * @tags: [read]
 * @tagReason: Retrieves a paginated list of published reviews for the shop.
 * @pitfalls: The default list includes unpublished reviews alongside published ones, so set `published` explicitly to filter. Video URLs and review replies are omitted from the response. An invalid `product_id` silently falls back to returning all shop reviews.
 */
const action = createAction({
    description: 'List reviews for the shop with optional filters',
    version: '1.0.0',
    input: ListReviewsInput,
    output: ListReviewsOutput,
    scopes: ['read_reviews'],

    exec: async (nango, input): Promise<z.infer<typeof ListReviewsOutput>> => {
        const response = await nango.get({
            // https://judge.me/api/docs
            endpoint: '/api/v1/reviews',
            params: {
                ...(input.page !== undefined && { page: input.page }),
                ...(input.per_page !== undefined && { per_page: input.per_page }),
                ...(input.rating !== undefined && { rating: input.rating }),
                ...(input.product_id !== undefined && { product_id: input.product_id }),
                ...(input.published !== undefined && { published: String(input.published) })
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                current_page: z.number(),
                per_page: z.number(),
                reviews: z.array(z.unknown())
            })
            .parse(response.data);

        const reviews = providerResponse.reviews.map((rawReview: unknown) => {
            const parsed = RawReview.parse(rawReview);
            return {
                id: parsed.id,
                ...(parsed.title != null && { title: parsed.title }),
                ...(parsed.body != null && { body: parsed.body }),
                rating: parsed.rating,
                ...(parsed.product_external_id != null && {
                    product_external_id: typeof parsed.product_external_id === 'number' ? parsed.product_external_id : Number(parsed.product_external_id)
                }),
                ...(parsed.reviewer != null && {
                    reviewer: {
                        id: parsed.reviewer.id,
                        ...(parsed.reviewer.external_id != null && {
                            external_id: typeof parsed.reviewer.external_id === 'number' ? parsed.reviewer.external_id : Number(parsed.reviewer.external_id)
                        }),
                        ...(parsed.reviewer.email != null && { email: parsed.reviewer.email }),
                        ...(parsed.reviewer.name != null && { name: parsed.reviewer.name }),
                        ...(parsed.reviewer.phone != null && { phone: parsed.reviewer.phone }),
                        ...(parsed.reviewer.accepts_marketing != null && { accepts_marketing: parsed.reviewer.accepts_marketing }),
                        ...(parsed.reviewer.unsubscribed_at != null && { unsubscribed_at: parsed.reviewer.unsubscribed_at }),
                        ...(parsed.reviewer.tags != null && { tags: Array.isArray(parsed.reviewer.tags) ? parsed.reviewer.tags : [parsed.reviewer.tags] })
                    }
                }),
                ...(parsed.source != null && { source: parsed.source }),
                ...(parsed.curated != null && { curated: parsed.curated }),
                ...(parsed.published != null && { published: parsed.published }),
                ...(parsed.hidden != null && { hidden: parsed.hidden }),
                ...(parsed.verified != null && { verified: parsed.verified }),
                created_at: parsed.created_at,
                updated_at: parsed.updated_at,
                ...(parsed.pictures != null && {
                    pictures: parsed.pictures.map((pic) => ({
                        ...(pic.urls != null && { urls: pic.urls })
                    }))
                })
            };
        });

        return {
            current_page: providerResponse.current_page,
            per_page: providerResponse.per_page,
            reviews,
            ...(reviews.length === providerResponse.per_page && { next_page: providerResponse.current_page + 1 })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
