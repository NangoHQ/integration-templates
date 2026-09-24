import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const OrderSchema = z.object({
    id: z.string(),
    order_id: z.string(),
    status: z.string().optional(),
    buyer: z.record(z.string(), z.unknown()).optional(),
    seller: z.record(z.string(), z.unknown()).optional(),
    total: z.union([z.number(), z.object({ value: z.number(), currency: z.string() })]).optional(),
    items: z.array(z.record(z.string(), z.unknown())).optional(),
    created: z.string().optional(),
    last_activity: z.string().optional()
});

const ProviderOrderSchema = z
    .object({
        id: z.string(),
        status: z.string().nullish(),
        buyer: z.record(z.string(), z.unknown()).optional(),
        seller: z.record(z.string(), z.unknown()).optional(),
        total: z.union([z.number(), z.object({ value: z.number(), currency: z.string() })]).nullish(),
        items: z.array(z.record(z.string(), z.unknown())).optional(),
        created: z.string().nullish(),
        last_activity: z.string().nullish()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync marketplace orders for the authenticated user.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    syncType: 'full',
    endpoints: [{ method: 'GET', path: '/orders', group: 'Orders' }],
    models: { Order: OrderSchema },
    metadata: z.object({}),

    exec: async (nango) => {
        await nango.trackDeletesStart('Order');

        const proxyConfig: ProxyConfiguration = {
            // https://www.discogs.com/developers#page:marketplace,header-marketplace-list-orders
            endpoint: '/marketplace/orders',
            retries: 3,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                response_path: 'orders',
                limit_name_in_request: 'per_page',
                limit: 100
            }
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const orders = z.array(ProviderOrderSchema).parse(page);
            const records = orders.map((order) => ({
                id: order.id,
                order_id: order.id,
                ...(order.status != null && { status: order.status }),
                ...(order.buyer !== undefined && { buyer: order.buyer }),
                ...(order.seller !== undefined && { seller: order.seller }),
                ...(order.total != null && { total: order.total }),
                ...(order.items !== undefined && { items: order.items }),
                ...(order.created != null && { created: order.created }),
                ...(order.last_activity != null && { last_activity: order.last_activity })
            }));

            if (records.length > 0) {
                await nango.batchSave(records, 'Order');
            }
        }
        await nango.trackDeletesEnd('Order');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
