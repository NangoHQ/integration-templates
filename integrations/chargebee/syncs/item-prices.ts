import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.number()
});

const ItemPriceSchema = z.object({
    id: z.string(),
    name: z.string(),
    item_id: z.string(),
    item_family_id: z.string().optional(),
    item_type: z.string(),
    status: z.string(),
    currency_code: z.string(),
    price: z.number().optional(),
    updated_at: z.number(),
    created_at: z.number(),
    resource_version: z.number().optional(),
    period: z.number().optional(),
    period_unit: z.string().optional(),
    pricing_model: z.string().optional(),
    channel: z.string().optional(),
    trial_period: z.number().optional(),
    trial_period_unit: z.string().optional(),
    free_quantity: z.number().optional(),
    free_quantity_in_decimal: z.string().optional(),
    external_name: z.string().optional(),
    invoice_notes: z.string().optional(),
    is_taxable: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    price_variant_id: z.string().optional()
});

const ListEntrySchema = z.object({
    item_price: z.unknown()
});

const sync = createSync({
    description: 'Sync item prices incrementally using updated_at filter (Product Catalog 2.0).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        ItemPrice: ItemPriceSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;

        const proxyConfig: ProxyConfiguration = {
            // https://apidocs.chargebee.com/docs/api/item_prices
            endpoint: '/api/v2/item_prices',
            params: {
                ...(updatedAfter !== undefined && { 'updated_at[gt]': updatedAfter }),
                'sort_by[asc]': 'updated_at'
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'offset',
                cursor_path_in_response: 'next_offset',
                response_path: 'list',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        let lastUpdatedAt: number | undefined;

        for await (const entries of nango.paginate(proxyConfig)) {
            const itemPrices: Array<z.infer<typeof ItemPriceSchema>> = [];
            for (const entry of entries) {
                const parsedEntry = ListEntrySchema.safeParse(entry);
                if (!parsedEntry.success) {
                    throw new Error(`Invalid list entry format: ${JSON.stringify(entry)}`);
                }
                const itemPrice = ItemPriceSchema.safeParse(parsedEntry.data.item_price);
                if (!itemPrice.success) {
                    throw new Error(`Invalid item_price format: ${JSON.stringify(parsedEntry.data.item_price)}`);
                }
                itemPrices.push(itemPrice.data);
            }

            if (itemPrices.length === 0) {
                continue;
            }

            await nango.batchSave(itemPrices, 'ItemPrice');

            const lastItem = itemPrices.at(-1);
            if (lastItem !== undefined && lastItem.updated_at !== undefined) {
                lastUpdatedAt = lastItem.updated_at;
            }
        }

        if (lastUpdatedAt !== undefined) {
            await nango.saveCheckpoint({ updated_after: lastUpdatedAt });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
