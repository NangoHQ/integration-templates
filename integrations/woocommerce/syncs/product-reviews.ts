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

const sync = createSync({
    description: 'Sync product reviews from WooCommerce.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
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
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: ''
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const reviews = page.map(
                (record: {
                    id: number;
                    product_id: number;
                    product_name?: string;
                    reviewer?: string;
                    reviewer_email?: string;
                    review?: string;
                    rating?: number;
                    verified?: boolean;
                    date_created?: string;
                    date_created_gmt?: string;
                }) => ({
                    id: String(record.id),
                    product_id: String(record.product_id),
                    ...(record.product_name !== undefined && record.product_name !== null && { product_name: record.product_name }),
                    ...(record.reviewer !== undefined && record.reviewer !== null && { reviewer: record.reviewer }),
                    ...(record.reviewer_email !== undefined && record.reviewer_email !== null && { reviewer_email: record.reviewer_email }),
                    ...(record.review !== undefined && record.review !== null && { review: record.review }),
                    ...(record.rating !== undefined && record.rating !== null && { rating: record.rating }),
                    ...(record.verified !== undefined && record.verified !== null && { verified: record.verified }),
                    ...(record.date_created !== undefined && record.date_created !== null && { date_created: record.date_created }),
                    ...(record.date_created_gmt !== undefined && record.date_created_gmt !== null && { date_created_gmt: record.date_created_gmt })
                })
            );

            if (reviews.length === 0) {
                continue;
            }

            await nango.batchSave(reviews, 'ProductReview');
        }

        await nango.trackDeletesEnd('ProductReview');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
