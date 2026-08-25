import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProductSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    number: z.string().optional(),
    description: z.string().optional(),
    salesPrice: z.number().optional(),
    priceExcludingVatCurrency: z.number().optional(),
    costExcludingVatCurrency: z.number().optional(),
    isInactive: z.boolean().optional()
});

const ProviderProductSchema = z.object({
    id: z.number(),
    version: z.number().optional(),
    url: z.string().optional(),
    name: z.string().optional(),
    number: z.string().optional(),
    description: z.string().optional(),
    salesPrice: z.number().optional(),
    priceExcludingVatCurrency: z.number().optional(),
    costExcludingVatCurrency: z.number().optional(),
    isInactive: z.boolean().optional()
});

const CheckpointSchema = z.object({
    from: z.number().int().nonnegative()
});

const DEFAULT_CHECKPOINT = {
    from: 0
};

const sync = createSync({
    description: 'Sync products.',
    version: '1.0.1',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        // Blocker: Tripletex product list endpoint (GET v2/product) does not expose a
        // modified-timestamp or changes-since filter, and no deleted-record endpoint
        // or resumable cursor was confirmed in this pass.
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.parse({
            ...DEFAULT_CHECKPOINT,
            ...(checkpoint ?? {})
        });
        let from = parsedCheckpoint.from;

        await nango.trackDeletesStart('Product');

        const proxyConfig: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            endpoint: 'v2/product',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                offset_start_value: from,
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'values'
            },
            retries: 3
        };

        for await (const rawPage of nango.paginate(proxyConfig)) {
            const page = z.array(z.unknown()).parse(rawPage);
            const products = page.map((record) => {
                const parsed = ProviderProductSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse product: ${parsed.error.message}`);
                }
                const p = parsed.data;
                return {
                    id: String(p.id),
                    ...(p.name != null && { name: p.name }),
                    ...(p.number != null && { number: p.number }),
                    ...(p.description != null && { description: p.description }),
                    ...(p.salesPrice != null && { salesPrice: p.salesPrice }),
                    ...(p.priceExcludingVatCurrency != null && { priceExcludingVatCurrency: p.priceExcludingVatCurrency }),
                    ...(p.costExcludingVatCurrency != null && { costExcludingVatCurrency: p.costExcludingVatCurrency }),
                    ...(p.isInactive != null && { isInactive: p.isInactive })
                };
            });

            if (products.length > 0) {
                await nango.batchSave(products, 'Product');
            }

            from += page.length;
            await nango.saveCheckpoint({ from });
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Product');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
