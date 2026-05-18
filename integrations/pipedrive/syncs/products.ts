import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

// https://developers.pipedrive.com/docs/api/v1/Products
const PipedriveProductOwnerSchema = z.object({
    id: z.number()
});

const PipedriveProductPriceSchema = z.object({
    currency: z.string(),
    price: z.number(),
    cost: z.number().nullable().optional(),
    overhead_cost: z.number().nullable().optional()
});

const PipedriveProductSchema = z.object({
    id: z.number(),
    name: z.string(),
    code: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    unit: z.string().nullable().optional(),
    tax: z.number().nullable().optional(),
    category: z.number().nullable().optional(),
    owner_id: z.union([z.number(), PipedriveProductOwnerSchema]).nullable().optional(),
    is_linkable: z.boolean().optional(),
    visible_to: z.union([z.number(), z.string()]).nullable().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    prices: z.array(PipedriveProductPriceSchema).optional(),
    custom_fields: z.record(z.string(), z.unknown()).optional()
});

const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    code: z.string().optional(),
    description: z.string().optional(),
    unit: z.string().optional(),
    tax: z.number().optional(),
    category: z.number().optional(),
    owner_id: z.number().optional(),
    is_linkable: z.boolean().optional(),
    visible_to: z.number().optional(),
    add_time: z.string().optional(),
    update_time: z.string().optional(),
    prices: z
        .array(
            z.object({
                currency: z.string(),
                price: z.number(),
                cost: z.number().optional(),
                direct_cost: z.number().optional()
            })
        )
        .optional()
});

const sync = createSync({
    description: 'Sync products from Pipedrive.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Product: ProductSchema
    },

    endpoints: [
        {
            method: 'POST',
            path: '/syncs/products'
        }
    ],

    exec: async (nango) => {
        // Delete tracking requires full enumeration — always start from offset 0
        await nango.trackDeletesStart('Product');

        const proxyConfig: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Products
            endpoint: '/v1/products',
            params: {
                sort_by: 'update_time',
                sort_direction: 'asc'
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'start',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const products: z.infer<typeof ProductSchema>[] = [];

            for (const record of page) {
                const parsed = PipedriveProductSchema.safeParse(record);
                if (!parsed.success) {
                    continue;
                }
                const product = parsed.data;
                const ownerId = typeof product.owner_id === 'number' ? product.owner_id : product.owner_id?.id;
                const visibleTo = typeof product.visible_to === 'string' ? Number(product.visible_to) : product.visible_to;

                products.push({
                    id: String(product.id),
                    name: product.name,
                    ...(product.code != null && { code: product.code }),
                    ...(product.description != null && { description: product.description }),
                    ...(product.unit != null && { unit: product.unit }),
                    ...(product.tax != null && { tax: product.tax }),
                    ...(product.category != null && { category: product.category }),
                    ...(ownerId != null && { owner_id: ownerId }),
                    ...(product.is_linkable != null && { is_linkable: product.is_linkable }),
                    ...(visibleTo != null && !Number.isNaN(visibleTo) && { visible_to: visibleTo }),
                    ...(product.add_time != null && { add_time: product.add_time }),
                    ...(product.update_time != null && { update_time: product.update_time }),
                    ...(product.prices != null && {
                        prices: product.prices.map((price) => ({
                            currency: price.currency,
                            price: price.price,
                            ...(price.cost != null && { cost: price.cost }),
                            ...(price.overhead_cost != null && { direct_cost: price.overhead_cost })
                        }))
                    })
                });
            }

            if (products.length > 0) {
                await nango.batchSave(products, 'Product');
            }
        }

        await nango.trackDeletesEnd('Product');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
