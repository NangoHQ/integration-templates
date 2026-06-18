import { createSync } from 'nango';
import { z } from 'zod';

const ProviderProductSchema = z
    .object({
        id: z.number(),
        name: z.string().nullish(),
        type: z.string().nullish(),
        sku: z.string().nullish(),
        description: z.string().nullish(),
        price: z.number().nullish(),
        cost_price: z.number().nullish(),
        retail_price: z.number().nullish(),
        sale_price: z.number().nullish(),
        weight: z.number().nullish(),
        width: z.number().nullish(),
        height: z.number().nullish(),
        depth: z.number().nullish(),
        brand_id: z.number().nullish(),
        categories: z.array(z.number()).nullish(),
        inventory_level: z.number().nullish(),
        inventory_warning_level: z.number().nullish(),
        is_visible: z.boolean().nullish(),
        is_featured: z.boolean().nullish(),
        is_free_shipping: z.boolean().nullish(),
        availability: z.string().nullish(),
        condition: z.string().nullish(),
        status: z.string().nullish(),
        tax_class_id: z.number().nullish(),
        sort_order: z.number().nullish(),
        custom_url: z
            .object({
                url: z.string().nullish(),
                is_customized: z.boolean().nullish()
            })
            .nullish(),
        date_created: z.string().nullish(),
        date_modified: z.string().nullish()
    })
    .passthrough();

const ProductSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string().optional(),
    sku: z.string().optional(),
    description: z.string().optional(),
    price: z.number().optional(),
    cost_price: z.number().optional(),
    retail_price: z.number().optional(),
    sale_price: z.number().optional(),
    weight: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    depth: z.number().optional(),
    brand_id: z.number().optional(),
    categories: z.array(z.number()).optional(),
    inventory_level: z.number().optional(),
    inventory_warning_level: z.number().optional(),
    is_visible: z.boolean().optional(),
    is_featured: z.boolean().optional(),
    is_free_shipping: z.boolean().optional(),
    availability: z.string().optional(),
    condition: z.string().optional(),
    status: z.string().optional(),
    tax_class_id: z.number().optional(),
    sort_order: z.number().optional(),
    custom_url: z
        .object({
            url: z.string().optional(),
            is_customized: z.boolean().optional()
        })
        .optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync products.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/products'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', page: 1 });
        const updatedAfter = checkpoint.updated_after;
        let page: number | undefined = checkpoint.page;
        const isFullRefresh = !updatedAfter;
        const syncStartedAt = new Date().toISOString();

        if (isFullRefresh) {
            await nango.trackDeletesStart('Product');
        }

        for await (const batch of nango.paginate<z.infer<typeof ProviderProductSchema>>({
            // https://developer.bigcommerce.com/docs/rest-management/catalog/products#get-all-products
            endpoint: '/v3/catalog/products',
            params: {
                ...(updatedAfter && { 'date_modified:min': updatedAfter })
            },
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
            const products: Array<z.infer<typeof ProductSchema>> = [];

            for (const raw of batch) {
                const parsedProduct = ProviderProductSchema.safeParse(raw);
                if (!parsedProduct.success) {
                    throw new Error(`Failed to parse product record: ${parsedProduct.error.message}`);
                }

                const product = parsedProduct.data;
                products.push({
                    id: String(product.id),
                    ...(product.name != null && { name: product.name }),
                    ...(product.type != null && { type: product.type }),
                    ...(product.sku != null && { sku: product.sku }),
                    ...(product.description != null && { description: product.description }),
                    ...(product.price != null && { price: product.price }),
                    ...(product.cost_price != null && { cost_price: product.cost_price }),
                    ...(product.retail_price != null && { retail_price: product.retail_price }),
                    ...(product.sale_price != null && { sale_price: product.sale_price }),
                    ...(product.weight != null && { weight: product.weight }),
                    ...(product.width != null && { width: product.width }),
                    ...(product.height != null && { height: product.height }),
                    ...(product.depth != null && { depth: product.depth }),
                    ...(product.brand_id != null && { brand_id: product.brand_id }),
                    ...(product.categories != null && { categories: product.categories }),
                    ...(product.inventory_level != null && { inventory_level: product.inventory_level }),
                    ...(product.inventory_warning_level != null && { inventory_warning_level: product.inventory_warning_level }),
                    ...(product.is_visible != null && { is_visible: product.is_visible }),
                    ...(product.is_featured != null && { is_featured: product.is_featured }),
                    ...(product.is_free_shipping != null && { is_free_shipping: product.is_free_shipping }),
                    ...(product.availability != null && { availability: product.availability }),
                    ...(product.condition != null && { condition: product.condition }),
                    ...(product.status != null && { status: product.status }),
                    ...(product.tax_class_id != null && { tax_class_id: product.tax_class_id }),
                    ...(product.sort_order != null && { sort_order: product.sort_order }),
                    ...(product.custom_url != null && {
                        custom_url: {
                            ...(product.custom_url.url != null && { url: product.custom_url.url }),
                            ...(product.custom_url.is_customized != null && { is_customized: product.custom_url.is_customized })
                        }
                    }),
                    ...(product.date_created != null && { date_created: product.date_created }),
                    ...(product.date_modified != null && { date_modified: product.date_modified })
                });
            }

            if (products.length > 0) {
                await nango.batchSave(products, 'Product');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({
                    updated_after: updatedAfter || '',
                    page
                });
            }
        }

        if (isFullRefresh) {
            await nango.trackDeletesEnd('Product');
        }

        await nango.saveCheckpoint({
            updated_after: syncStartedAt,
            page: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
