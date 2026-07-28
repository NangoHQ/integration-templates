import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const RawCurrencySchema = z
    .object({
        id: z.number(),
        code: z.string().optional()
    })
    .optional()
    .nullable();

const RawCustomerSchema = z
    .object({
        id: z.number()
    })
    .optional()
    .nullable();

const RawProjectSchema = z
    .object({
        id: z.number()
    })
    .optional()
    .nullable();

const RawDepartmentSchema = z
    .object({
        id: z.number()
    })
    .optional()
    .nullable();

const RawOrderSchema = z.object({
    id: z.number(),
    number: z.string().optional().nullable(),
    orderDate: z.string(),
    customer: RawCustomerSchema,
    customerName: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    isClosed: z.boolean().optional().nullable(),
    deliveryDate: z.string().optional().nullable(),
    reference: z.string().optional().nullable(),
    currency: RawCurrencySchema,
    project: RawProjectSchema,
    department: RawDepartmentSchema,
    totalInvoicedOnAccountAmountAbsoluteCurrency: z.number().optional().nullable()
});

const OrderSchema = z.object({
    id: z.string(),
    number: z.string().optional(),
    orderDate: z.string(),
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    status: z.string().optional(),
    isClosed: z.boolean().optional(),
    deliveryDate: z.string().optional(),
    reference: z.string().optional(),
    currency: z.string().optional(),
    projectId: z.string().optional(),
    departmentId: z.string().optional(),
    totalInvoicedOnAccountAmountAbsoluteCurrency: z.number().optional()
});

const CheckpointSchema = z.object({
    order_date_from: z.string(),
    runs_since_full: z.number().int()
});

const FULL_WINDOW_INTERVAL = 10;

const sync = createSync({
    description: 'Sync orders.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Order: OrderSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        const isFullWindow = checkpoint == null || checkpoint.runs_since_full >= FULL_WINDOW_INTERVAL;

        const today = formatDate(new Date());
        let orderDateFrom: string;
        let nextRunsSinceFull: number;

        if (isFullWindow) {
            orderDateFrom = '2000-01-01';
            nextRunsSinceFull = 0;
        } else {
            orderDateFrom = checkpoint.order_date_from;
            nextRunsSinceFull = checkpoint.runs_since_full + 1;
        }

        const orderDateTo = today;

        if (isFullWindow) {
            await nango.trackDeletesStart('Order');
        }

        const proxyConfig: ProxyConfiguration = {
            // https://developer.tripletex.no/docs/documentation/topic-3/openapi/
            // https://api-test.tripletex.tech/v2/swagger.json
            endpoint: 'v2/order',
            params: {
                orderDateFrom,
                orderDateTo
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'from',
                limit_name_in_request: 'count',
                limit: 100,
                response_path: 'values'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            if (!Array.isArray(page)) {
                throw new Error('Expected paginate page to be an array');
            }

            const orders = [];
            for (const raw of page) {
                const parsed = RawOrderSchema.safeParse(raw);
                if (!parsed.success) {
                    throw new Error(`Failed to parse order: ${parsed.error.message}`);
                }
                const order = parsed.data;
                orders.push({
                    id: String(order.id),
                    ...(order.number != null && { number: order.number }),
                    orderDate: order.orderDate,
                    ...(order.customerName != null && { customerName: order.customerName }),
                    ...(order.customer?.id != null && { customerId: String(order.customer.id) }),
                    ...(order.status != null && { status: order.status }),
                    ...(order.isClosed != null && { isClosed: order.isClosed }),
                    ...(order.deliveryDate != null && { deliveryDate: order.deliveryDate }),
                    ...(order.reference != null && { reference: order.reference }),
                    ...(order.currency?.code != null && { currency: order.currency.code }),
                    ...(order.project?.id != null && { projectId: String(order.project.id) }),
                    ...(order.department?.id != null && { departmentId: String(order.department.id) }),
                    ...(order.totalInvoicedOnAccountAmountAbsoluteCurrency != null && {
                        totalInvoicedOnAccountAmountAbsoluteCurrency: order.totalInvoicedOnAccountAmountAbsoluteCurrency
                    })
                });
            }

            if (orders.length > 0) {
                await nango.batchSave(orders, 'Order');
            }
        }

        if (isFullWindow) {
            await nango.trackDeletesEnd('Order');
        }

        await nango.saveCheckpoint({
            order_date_from: orderDateTo,
            runs_since_full: nextRunsSinceFull
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
