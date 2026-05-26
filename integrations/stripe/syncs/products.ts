import { createSync } from 'nango';
import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';

const ProductSchema = z.object({
    id: z.string(),
    object: z.string().optional(),
    active: z.boolean().optional(),
    created: z.number().optional(),
    default_price: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    images: z.array(z.string()).optional(),
    livemode: z.boolean().optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    name: z.string().optional(),
    shippable: z.boolean().nullable().optional(),
    statement_descriptor: z.string().nullable().optional(),
    tax_code: z.string().nullable().optional(),
    unit_label: z.string().nullable().optional(),
    updated: z.number().optional(),
    url: z.string().nullable().optional()
});

const CheckpointSchema = z.object({
    cursor: z.string()
});

const sync = createSync({
    description: 'Sync products from Stripe.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
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
        const checkpointResult = await nango.getCheckpoint();
        const checkpoint = checkpointResult ? CheckpointSchema.safeParse(checkpointResult) : null;
        if (checkpoint && !checkpoint.success) {
            throw new Error(`Invalid checkpoint: ${checkpoint.error.message}`);
        }

        let startingAfter = checkpoint?.data.cursor ?? '';
        let hasMore = true;

        while (hasMore) {
            const params: Record<string, string | number> = {
                limit: 2
            };

            if (startingAfter) {
                params['starting_after'] = startingAfter;
            }

            const config: ProxyConfiguration = {
                // https://docs.stripe.com/api/products/list
                endpoint: '/v1/products',
                params,
                retries: 3
            };

            const response = await nango.get(config);

            const parsedEnvelope = z
                .object({
                    object: z.literal('list'),
                    data: z.array(z.unknown()),
                    has_more: z.boolean()
                })
                .safeParse(response.data);

            if (!parsedEnvelope.success) {
                throw new Error(`Unexpected Stripe products list response: ${parsedEnvelope.error.message}`);
            }

            const { data: pageData, has_more: pageHasMore } = parsedEnvelope.data;
            hasMore = pageHasMore;

            if (pageData.length === 0) {
                break;
            }

            const products: z.infer<typeof ProductSchema>[] = [];
            for (const item of pageData) {
                const parsedItem = ProductSchema.safeParse(item);
                if (!parsedItem.success) {
                    throw new Error(`Failed to parse product: ${parsedItem.error.message}`);
                }
                products.push(parsedItem.data);
            }

            if (products.length > 0) {
                await nango.batchSave(products, 'Product');
            }

            if (!hasMore) {
                break;
            }

            const lastProduct = products[products.length - 1];
            if (!lastProduct) {
                break;
            }

            startingAfter = lastProduct.id;
            await nango.saveCheckpoint({ cursor: startingAfter });
        }

        await nango.saveCheckpoint({ cursor: '' });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
