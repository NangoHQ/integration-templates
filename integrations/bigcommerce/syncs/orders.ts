import { createSync } from 'nango';
import { z } from 'zod';

const ProviderOrderSchema = z
    .object({
        id: z.number(),
        customer_id: z.number().optional(),
        status_id: z.number().optional(),
        status: z.string().optional(),
        subtotal_ex_tax: z.string().optional(),
        subtotal_inc_tax: z.string().optional(),
        total_ex_tax: z.string().optional(),
        total_inc_tax: z.string().optional(),
        coupon_discount: z.string().optional(),
        date_created: z.string().optional(),
        date_modified: z.string().optional()
    })
    .passthrough();

const OrderSchema = z.object({
    id: z.string(),
    customer_id: z.number().optional(),
    status_id: z.number().optional(),
    status: z.string().optional(),
    subtotal_ex_tax: z.string().optional(),
    subtotal_inc_tax: z.string().optional(),
    total_ex_tax: z.string().optional(),
    total_inc_tax: z.string().optional(),
    coupon_discount: z.string().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    max_date_modified: z.string(),
    page: z.number().int().positive()
});

const sync = createSync({
    description: 'Sync orders.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Order: OrderSchema
    },
    endpoints: [
        {
            path: '/syncs/orders',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        const checkpoint = CheckpointSchema.parse((await nango.getCheckpoint()) ?? { updated_after: '', max_date_modified: '', page: 1 });
        const minDateModified = checkpoint.updated_after || '1970-01-01T00:00:00Z';
        const maxDateModified = checkpoint.max_date_modified || new Date().toISOString();
        let page = checkpoint.page;
        let requestMaxDateModified = checkpoint.max_date_modified;

        // The V2 orders endpoint returns HTTP 204 with no body when no orders match,
        // so we use a manual loop to check status before parsing the response.
        while (true) {
            // https://developer.bigcommerce.com/docs/rest-management/orders
            const response = await nango.get({
                endpoint: '/v2/orders',
                params: {
                    min_date_modified: minDateModified,
                    ...(requestMaxDateModified && { max_date_modified: requestMaxDateModified }),
                    page: String(page),
                    limit: '50',
                    sort: 'date_modified:asc'
                },
                retries: 3
            });

            if (response.status === 204) {
                break;
            }

            const rawOrders = z.array(ProviderOrderSchema).safeParse(response.data);
            if (!rawOrders.success) {
                throw new Error(`Failed to parse orders: ${rawOrders.error.message}`);
            }

            const orders = rawOrders.data.map((order) => ({
                id: String(order.id),
                ...(order.customer_id !== undefined && { customer_id: order.customer_id }),
                ...(order.status_id !== undefined && { status_id: order.status_id }),
                ...(order.status !== undefined && { status: order.status }),
                ...(order.subtotal_ex_tax !== undefined && { subtotal_ex_tax: order.subtotal_ex_tax }),
                ...(order.subtotal_inc_tax !== undefined && { subtotal_inc_tax: order.subtotal_inc_tax }),
                ...(order.total_ex_tax !== undefined && { total_ex_tax: order.total_ex_tax }),
                ...(order.total_inc_tax !== undefined && { total_inc_tax: order.total_inc_tax }),
                ...(order.coupon_discount !== undefined && { coupon_discount: order.coupon_discount }),
                ...(order.date_created !== undefined && { date_created: order.date_created }),
                ...(order.date_modified !== undefined && { date_modified: order.date_modified })
            }));

            if (orders.length === 0) {
                break;
            }

            await nango.batchSave(orders, 'Order');

            if (orders.length < 50) {
                break;
            }

            page += 1;
            requestMaxDateModified = requestMaxDateModified || maxDateModified;
            await nango.saveCheckpoint({
                updated_after: minDateModified,
                max_date_modified: requestMaxDateModified,
                page
            });
        }

        await nango.saveCheckpoint({
            updated_after: maxDateModified,
            max_date_modified: '',
            page: 1
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
