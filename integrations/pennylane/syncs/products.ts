import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderProductSchema = z.object({
    id: z.union([z.string(), z.number()]),
    label: z.string(),
    description: z.union([z.string(), z.null()]).optional(),
    unit: z.string(),
    price_before_tax: z.union([z.string(), z.null()]).optional(),
    price: z.string(),
    vat_rate: z.string(),
    currency: z.string(),
    reference: z.union([z.string(), z.null()]).optional(),
    substance: z.union([z.string(), z.null()]).optional()
});

const PennylaneProduct = z.object({
    id: z.string(),
    source_id: z.string(),
    label: z.string(),
    description: z.string().optional(),
    unit: z.string(),
    price_before_tax: z.number().optional(),
    price: z.number(),
    vat_rate: z.string(),
    currency: z.string(),
    reference: z.string().optional(),
    substance: z.string().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

function toProduct(product: unknown) {
    const parsed = ProviderProductSchema.parse(product);
    return {
        id: String(parsed.id),
        source_id: String(parsed.id),
        label: parsed.label,
        description: parsed.description ?? '',
        unit: parsed.unit,
        price_before_tax: parsed.price_before_tax != null ? Number(parsed.price_before_tax) : Number(parsed.price),
        price: Number(parsed.price),
        vat_rate: parsed.vat_rate,
        currency: parsed.currency,
        reference: parsed.reference ?? '',
        substance: parsed.substance ?? ''
    };
}

const sync = createSync({
    description: 'Fetches a list products from pennylane',
    version: '3.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    scopes: ['products:readonly'],
    checkpoint: CheckpointSchema,
    models: {
        PennylaneProduct: PennylaneProduct
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        let cursor = checkpoint ? checkpoint.cursor : undefined;

        await nango.trackDeletesStart('PennylaneProduct');

        const config: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getproducts
            endpoint: '/api/external/v2/products',
            retries: 3,
            params: {
                ...(cursor ? { cursor } : {})
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100,
                on_page: async ({ nextPageParam }) => {
                    cursor = typeof nextPageParam === 'string' ? nextPageParam : undefined;
                }
            }
        };

        for await (const page of nango.paginate(config)) {
            const products = page.map(toProduct);
            if (products.length > 0) {
                await nango.batchSave(products, 'PennylaneProduct');
            }

            if (cursor !== undefined) {
                await nango.saveCheckpoint({ cursor });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('PennylaneProduct');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
