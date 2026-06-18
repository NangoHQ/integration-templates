import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.number().describe('ID of the order to update. Example: 123'),
    status_id: z.number().optional().describe('New status ID for the order. See GET /v2/order_statuses for valid values.'),
    staff_notes: z.string().nullable().optional().describe('Staff notes to set on the order.'),
    customer_message: z.string().nullable().optional().describe('Customer message to set on the order.')
});

const ProviderOrderSchema = z.object({
    id: z.number(),
    status_id: z.number().optional(),
    status: z.string().optional(),
    customer_message: z.string().nullable().optional(),
    staff_notes: z.string().nullable().optional(),
    total_inc_tax: z.string().optional(),
    total_ex_tax: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    status_id: z.number().optional(),
    status: z.string().optional(),
    customer_message: z.string().optional(),
    staff_notes: z.string().optional(),
    total_inc_tax: z.string().optional(),
    total_ex_tax: z.string().optional()
});

const action = createAction({
    description: 'Update an order.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['store_v2_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const data: {
            status_id?: number;
            staff_notes?: string | null;
            customer_message?: string | null;
        } = {};
        if (input.status_id !== undefined) {
            data.status_id = input.status_id;
        }
        if (input.staff_notes !== undefined) {
            data.staff_notes = input.staff_notes;
        }
        if (input.customer_message !== undefined) {
            data.customer_message = input.customer_message;
        }

        const response = await nango.put({
            // https://developer.bigcommerce.com/docs/rest-management/orders
            endpoint: `/v2/orders/${encodeURIComponent(input.order_id)}`,
            data,
            retries: 10
        });

        const providerOrder = ProviderOrderSchema.parse(response.data);

        return {
            id: providerOrder.id,
            ...(providerOrder.status_id !== undefined && { status_id: providerOrder.status_id }),
            ...(providerOrder.status !== undefined && { status: providerOrder.status }),
            ...(providerOrder.customer_message != null && { customer_message: providerOrder.customer_message }),
            ...(providerOrder.staff_notes != null && { staff_notes: providerOrder.staff_notes }),
            ...(providerOrder.total_inc_tax !== undefined && { total_inc_tax: providerOrder.total_inc_tax }),
            ...(providerOrder.total_ex_tax !== undefined && { total_ex_tax: providerOrder.total_ex_tax })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
