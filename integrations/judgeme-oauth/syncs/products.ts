import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const JudgeMeProductSchema = z
    .object({
        id: z.number(),
        external_id: z.union([z.string(), z.number()]).nullish(),
        title: z.string().nullish(),
        handle: z.string().nullish(),
        in_store: z.boolean().optional(),
        product_type: z.string().nullish(),
        description: z.string().nullish(),
        vendor: z.string().nullish(),
        excluded: z.boolean().optional(),
        tags: z.array(z.string()).nullish(),
        lowest_price: z.union([z.string(), z.number()]).nullish(),
        highest_price: z.union([z.string(), z.number()]).nullish(),
        image_url: z.string().nullish(),
        medium_image_url: z.string().nullish(),
        small_image_url: z.string().nullish()
    })
    .passthrough();

const ProductSchema = z
    .object({
        id: z.string().describe('The unique identifier of the product in Judge.me.'),
        external_id: z.string().optional().describe('The external platform identifier for the product, such as the Shopify product ID.'),
        title: z.string().optional().describe('The title of the product.'),
        handle: z.string().optional().describe('The URL-friendly handle of the product.'),
        in_store: z.boolean().optional().describe('Whether the product is available in the store.'),
        product_type: z.string().optional().describe('The type or category of the product.'),
        description: z.string().optional().describe('The description of the product.'),
        vendor: z.string().optional().describe('The vendor or brand of the product.'),
        excluded: z.boolean().optional().describe('Whether the product is excluded from Judge.me features.'),
        tags: z.array(z.string()).optional().describe('Tags associated with the product.'),
        price_min: z.number().optional().describe('The minimum price of the product across variants.'),
        price_max: z.number().optional().describe('The maximum price of the product across variants.'),
        images: z.array(z.string()).optional().describe('URLs of product images.')
    })
    .describe('A product known to Judge.me for the shop.');

const CheckpointSchema = z.object({
    page: z.number().describe('The next page number to resume pagination from if the sync exceeds its execution window.')
});

const sync = createSync({
    description: 'Sync all products known to Judge.me for the shop.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let currentPage: number = checkpoint?.page ?? 1;

        await nango.trackDeletesStart('Product');

        const proxyConfig: ProxyConfiguration = {
            // https://judge.me/api/docs
            endpoint: '/api/v1/products',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: currentPage,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'products',
                on_page: async ({ nextPageParam }) => {
                    currentPage = typeof nextPageParam === 'number' ? nextPageParam : currentPage;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const validated = JudgeMeProductSchema.array().safeParse(pageResults);
            if (!validated.success) {
                throw new Error(`Failed to parse products page: ${validated.error.message}`);
            }

            const products = validated.data.map((record) => {
                if (typeof record.id !== 'number') {
                    throw new Error(`Unexpected product id type: ${typeof record.id}`);
                }

                const images: string[] = [];
                if (record.image_url != null) {
                    images.push(record.image_url);
                }
                if (record.medium_image_url != null) {
                    images.push(record.medium_image_url);
                }
                if (record.small_image_url != null) {
                    images.push(record.small_image_url);
                }

                let priceMin: number | undefined;
                if (record.lowest_price != null) {
                    const parsed = typeof record.lowest_price === 'number' ? record.lowest_price : Number(record.lowest_price);
                    if (!Number.isNaN(parsed)) {
                        priceMin = parsed;
                    }
                }

                let priceMax: number | undefined;
                if (record.highest_price != null) {
                    const parsed = typeof record.highest_price === 'number' ? record.highest_price : Number(record.highest_price);
                    if (!Number.isNaN(parsed)) {
                        priceMax = parsed;
                    }
                }

                return {
                    id: String(record.id),
                    ...(record.external_id != null && { external_id: String(record.external_id) }),
                    ...(record.title != null && { title: record.title }),
                    ...(record.handle != null && { handle: record.handle }),
                    ...(record.in_store != null && { in_store: record.in_store }),
                    ...(record.product_type != null && { product_type: record.product_type }),
                    ...(record.description != null && { description: record.description }),
                    ...(record.vendor != null && { vendor: record.vendor }),
                    ...(record.excluded != null && { excluded: record.excluded }),
                    ...(record.tags != null && { tags: record.tags }),
                    ...(priceMin !== undefined && { price_min: priceMin }),
                    ...(priceMax !== undefined && { price_max: priceMax }),
                    ...(images.length > 0 && { images })
                };
            });

            if (products.length > 0) {
                await nango.batchSave(products, 'Product');
            }

            await nango.saveCheckpoint({ page: currentPage });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Product');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
