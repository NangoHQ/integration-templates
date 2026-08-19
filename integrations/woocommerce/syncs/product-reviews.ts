import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProductReviewSchema = z.object({
    id: z.string(),
    product_id: z.string(),
    product_name: z.string().optional(),
    reviewer: z.string().optional(),
    reviewer_email: z.string().optional(),
    review: z.string().optional(),
    rating: z.number().int().optional(),
    verified: z.boolean().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const ProviderReviewSchema = z.object({
    id: z.number(),
    product_id: z.number(),
    product_name: z.string().nullish(),
    reviewer: z.string().nullish(),
    reviewer_email: z.string().nullish(),
    review: z.string().nullish(),
    rating: z.number().int().nullish(),
    verified: z.boolean().nullish(),
    date_created: z.string().nullish(),
    date_created_gmt: z.string().nullish()
});

const sync = createSync({
    description: 'Sync product reviews from WooCommerce.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    checkpoint: CheckpointSchema,
    models: {
        ProductReview: ProductReviewSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/product-reviews'
        }
    ],

    exec: async (nango) => {
        // WooCommerce reviews can be updated and deleted, but the collection endpoint
        // only exposes created-date filters (`after`/`before`), not a modification filter.
        // A full refresh is required to avoid missing review updates.

        const checkpoint = await nango.getCheckpoint();
        let nextPage: number | undefined = typeof checkpoint?.['page'] === 'number' ? checkpoint['page'] : 1;

        await nango.trackDeletesStart('ProductReview');

        const proxyConfig: ProxyConfiguration = {
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#product-reviews
            endpoint: '/wp-json/wc/v3/products/reviews',
            params: {
                orderby: 'date_gmt',
                order: 'asc',
                per_page: '100'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: nextPage ?? 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: '',
                on_page: async ({ nextPageParam }) => {
                    nextPage = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const providerReviews = z.array(ProviderReviewSchema).parse(pageResults);

            const reviews = providerReviews.map((parsed) => ({
                id: String(parsed.id),
                product_id: String(parsed.product_id),
                ...(parsed.product_name != null && { product_name: parsed.product_name }),
                ...(parsed.reviewer != null && { reviewer: parsed.reviewer }),
                ...(parsed.reviewer_email != null && { reviewer_email: parsed.reviewer_email }),
                ...(parsed.review != null && { review: parsed.review }),
                ...(parsed.rating != null && { rating: parsed.rating }),
                ...(parsed.verified != null && { verified: parsed.verified }),
                ...(parsed.date_created != null && { date_created: parsed.date_created }),
                ...(parsed.date_created_gmt != null && { date_created_gmt: parsed.date_created_gmt })
            }));

            if (reviews.length > 0) {
                await nango.batchSave(reviews, 'ProductReview');
            }

            if (nextPage !== undefined) {
                await nango.saveCheckpoint({ page: nextPage });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('ProductReview');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
