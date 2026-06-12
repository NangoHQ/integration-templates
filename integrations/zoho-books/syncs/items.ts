import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    organization_id: z.string()
});

const ZohoItemSchema = z.object({
    item_id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    rate: z.number().optional(),
    unit: z.string().optional(),
    description: z.string().optional(),
    item_type: z.string().optional(),
    product_type: z.string().optional(),
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.number().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    purchase_rate: z.number().optional(),
    purchase_account_id: z.string().optional(),
    purchase_account_name: z.string().optional(),
    can_be_sold: z.boolean().optional(),
    can_be_purchased: z.boolean().optional(),
    track_inventory: z.boolean().optional(),
    sku: z.string().optional(),
    source: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const ItemSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    status: z.string().optional(),
    rate: z.number().optional(),
    unit: z.string().optional(),
    description: z.string().optional(),
    item_type: z.string().optional(),
    product_type: z.string().optional(),
    tax_id: z.string().optional(),
    tax_name: z.string().optional(),
    tax_percentage: z.number().optional(),
    account_id: z.string().optional(),
    account_name: z.string().optional(),
    purchase_rate: z.number().optional(),
    purchase_account_id: z.string().optional(),
    purchase_account_name: z.string().optional(),
    can_be_sold: z.boolean().optional(),
    can_be_purchased: z.boolean().optional(),
    track_inventory: z.boolean().optional(),
    sku: z.string().optional(),
    source: z.string().optional(),
    created_time: z.string().optional(),
    last_modified_time: z.string().optional()
});

const sync = createSync({
    description: 'Sync items from Zoho Books.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Item: ItemSchema
    },
    // https://www.zoho.com/books/api/v3/items/#list-items
    endpoints: [
        {
            path: '/syncs/items',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const metadata = MetadataSchema.parse(await nango.getMetadata());

        // Blocker: the Zoho Books items API does not expose a changed-since filter,
        // a deleted-record endpoint, or a cursor for incremental syncs.
        await nango.trackDeletesStart('Item');

        const proxyConfig: ProxyConfiguration = {
            // https://www.zoho.com/books/api/v3/items/#list-items
            endpoint: '/books/v3/items',
            params: {
                organization_id: metadata.organization_id
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100,
                response_path: 'items'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const parsedItems = page.map((item: unknown) => {
                const parsed = ZohoItemSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse item: ${parsed.error.message}`);
                }
                return parsed.data;
            });

            const mappedItems = parsedItems.map((record) => ({
                id: record.item_id,
                name: record.name,
                status: record.status,
                rate: record.rate,
                unit: record.unit,
                description: record.description,
                item_type: record.item_type,
                product_type: record.product_type,
                tax_id: record.tax_id,
                tax_name: record.tax_name,
                tax_percentage: record.tax_percentage,
                account_id: record.account_id,
                account_name: record.account_name,
                purchase_rate: record.purchase_rate,
                purchase_account_id: record.purchase_account_id,
                purchase_account_name: record.purchase_account_name,
                can_be_sold: record.can_be_sold,
                can_be_purchased: record.can_be_purchased,
                track_inventory: record.track_inventory,
                sku: record.sku,
                source: record.source,
                created_time: record.created_time,
                last_modified_time: record.last_modified_time
            }));

            if (mappedItems.length > 0) {
                await nango.batchSave(mappedItems, 'Item');
            }
        }

        await nango.trackDeletesEnd('Item');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
