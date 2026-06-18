import { createSync } from 'nango';
import { z } from 'zod';

const BrandSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    page_title: z.string().optional(),
    meta_keywords: z.array(z.string()).optional(),
    meta_description: z.string().optional(),
    image_url: z.string().optional(),
    search_keywords: z.string().optional(),
    custom_url: z
        .object({
            url: z.string().optional(),
            is_customized: z.boolean().optional()
        })
        .optional()
});

const RecordSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    page_title: z.string().optional(),
    meta_keywords: z.array(z.string()).optional(),
    meta_description: z.string().optional(),
    image_url: z.string().optional(),
    search_keywords: z.string().optional(),
    custom_url: z
        .object({
            url: z.string().optional(),
            is_customized: z.boolean().optional()
        })
        .optional()
});

const CheckpointSchema = z.object({
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync brands.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Brand: RecordSchema
    },
    scopes: ['store_v2_products_read_only'],
    endpoints: [{ method: 'GET', path: '/syncs/brands' }],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { page: 1 });
        let page: number | undefined = checkpoint.page;

        await nango.trackDeletesStart('Brand');

        // https://developer.bigcommerce.com/docs/rest-management/catalog/brands
        for await (const batch of nango.paginate<z.infer<typeof BrandSchema>>({
            endpoint: '/v3/catalog/brands',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: page,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 50,
                response_path: 'data',
                on_page: async (state) => {
                    page = typeof state.nextPageParam === 'number' ? state.nextPageParam : undefined;
                }
            },
            retries: 3
        })) {
            const brands = batch.map((brand) => {
                const parsed = BrandSchema.safeParse(brand);
                if (!parsed.success) {
                    throw new Error(`Failed to parse brand: ${parsed.error.message}`);
                }
                const data = parsed.data;
                return {
                    id: String(data.id),
                    ...(data.name !== undefined && { name: data.name }),
                    ...(data.page_title !== undefined && { page_title: data.page_title }),
                    ...(data.meta_keywords !== undefined && { meta_keywords: data.meta_keywords }),
                    ...(data.meta_description !== undefined && { meta_description: data.meta_description }),
                    ...(data.image_url !== undefined && { image_url: data.image_url }),
                    ...(data.search_keywords !== undefined && { search_keywords: data.search_keywords }),
                    ...(data.custom_url !== undefined && { custom_url: data.custom_url })
                };
            });

            if (brands.length > 0) {
                await nango.batchSave(brands, 'Brand');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.trackDeletesEnd('Brand');
        await nango.saveCheckpoint({ page: 1 });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
