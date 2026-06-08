import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderProductSchema = z.object({
    id: z.union([z.number(), z.string()]),
    name: z.string().nullish(),
    list_price: z.number().nullish(),
    type: z.string().nullish(),
    write_date: z.string().nullish()
});

const ProductSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    list_price: z.number().optional(),
    type: z.string().optional(),
    write_date: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync Odoo products',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    // https://www.odoo.com/documentation/master/developer/reference/external_api.html
    endpoints: [{ method: 'GET', path: '/syncs/products' }],
    checkpoint: CheckpointSchema,
    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const proxyConfig: ProxyConfiguration = {
            // https://www.odoo.com/documentation/master/developer/reference/external_api.html
            endpoint: '/1.0/product.product',
            params: {
                fields: "['id','name','list_price','type','write_date']",
                order: 'write_date asc,id asc',
                ...(checkpoint ? { write_date: checkpoint.updated_after } : {})
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                offset_start_value: 0,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'records'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected page to be an array');
            }

            const products = [];
            for (const record of page) {
                const parsed = ProviderProductSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Invalid product record: ${parsed.error.message}`);
                }

                const product = parsed.data;
                products.push({
                    id: String(product.id),
                    ...(product.name != null && { name: product.name }),
                    ...(product.list_price != null && { list_price: product.list_price }),
                    ...(product.type != null && { type: product.type }),
                    ...(product.write_date != null && { write_date: product.write_date })
                });
            }

            if (products.length === 0) {
                continue;
            }

            await nango.batchSave(products, 'Product');

            const lastProduct = products.at(-1);
            const lastWriteDate = lastProduct?.write_date;
            if (lastWriteDate) {
                await nango.saveCheckpoint({ updated_after: lastWriteDate });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
