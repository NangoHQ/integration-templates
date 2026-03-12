import { createSync } from 'nango';
import { z } from 'zod';

const ProductSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    sku: z.union([z.string(), z.null()]),
    price: z.union([z.number(), z.null()]),
    cost_of_goods_sold: z.union([z.number(), z.null()]),
    billing_frequency: z.union([z.string(), z.null()]),
    recurring_billing_period: z.union([z.string(), z.null()]),
    created_at: z.union([z.string(), z.null()]),
    updated_at: z.union([z.string(), z.null()])
});

const CheckpointSchema = z.object({
    after: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync product records with pricing, SKU, quantity, and billing details',
    version: '1.0.0',
    endpoints: [{ method: 'POST', path: '/syncs/sync-products', group: 'Products' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Product: ProductSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        let after = checkpoint?.after || undefined;

        while (true) {
            const response = await nango.get<{
                results?: any[];
                paging?: { next?: { after?: string } };
            }>({
                // https://developers.hubspot.com/docs/api-reference/crm-api/objects/products
                endpoint: '/crm/v3/objects/products',
                params: {
                    properties:
                        'name,description,hs_sku,price,hs_cost_of_goods_sold,recurringbillingfrequency,hs_recurring_billing_period,createdate,hs_lastmodifieddate',
                    limit: '100',
                    ...(after && { after })
                },
                retries: 3
            });

            const records = (response.data.results ?? []).map((product) => ({
                id: product.id,
                name: product.properties?.['name'] ?? null,
                description: product.properties?.['description'] ?? null,
                sku: product.properties?.['hs_sku'] ?? null,
                price: product.properties?.['price'] ? parseFloat(product.properties['price']) : null,
                cost_of_goods_sold: product.properties?.['hs_cost_of_goods_sold'] ? parseFloat(product.properties['hs_cost_of_goods_sold']) : null,
                billing_frequency: product.properties?.['recurringbillingfrequency'] ?? null,
                recurring_billing_period: product.properties?.['hs_recurring_billing_period'] ?? null,
                created_at: product.properties?.['createdate'] ?? null,
                updated_at: product.properties?.['hs_lastmodifieddate'] ?? null
            }));

            if (records.length === 0) {
                break;
            }

            await nango.batchSave(records, 'Product');

            const nextAfter = response.data.paging?.next?.after;
            if (nextAfter) {
                after = nextAfter;
                await nango.saveCheckpoint({
                    after
                });
                continue;
            }

            break;
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
