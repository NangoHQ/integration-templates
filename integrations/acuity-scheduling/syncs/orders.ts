import { createSync } from 'nango';
import { z } from 'zod';

const OrderSchema = z.object({
    id: z.string(),
    total: z.string().optional(),
    status: z.string().optional(),
    time: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    notes: z.string().optional()
});

const ProviderOrderSchema = z.object({
    id: z.number(),
    total: z.union([z.string(), z.number()]).nullable().optional(),
    status: z.string().nullable().optional(),
    time: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    notes: z.string().nullable().optional()
});

const sync = createSync({
    description: 'Sync orders.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        // https://developers.acuityscheduling.com/reference/get-orders
        {
            path: '/syncs/orders',
            method: 'GET'
        }
    ],
    models: {
        Order: OrderSchema
    },
    exec: async (nango) => {
        // The API documents a small full snapshot for /orders with no cursor or offset.
        const response = await nango.get({
            endpoint: '/orders',
            retries: 3
        });

        const parsedOrders = z.array(ProviderOrderSchema).safeParse(response.data);
        if (!parsedOrders.success) {
            throw new Error('Failed to parse orders response: ' + parsedOrders.error.message);
        }

        await nango.trackDeletesStart('Order');

        const orders = parsedOrders.data.map((record) => ({
            id: String(record.id),
            ...(record.total != null && { total: String(record.total) }),
            ...(record.status != null && { status: record.status }),
            ...(record.time != null && { time: record.time }),
            ...(record.firstName != null && { firstName: record.firstName }),
            ...(record.lastName != null && { lastName: record.lastName }),
            ...(record.phone != null && { phone: record.phone }),
            ...(record.email != null && { email: record.email }),
            ...(record.title != null && { title: record.title }),
            ...(record.notes != null && { notes: record.notes })
        }));

        if (orders.length > 0) {
            await nango.batchSave(orders, 'Order');
        }

        await nango.trackDeletesEnd('Order');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
