import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        start_date: z
            .string()
            .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'start_date must be in dd/mm/yyyy format.')
            .optional()
            .describe('Start of the date range to filter orders, in dd/mm/yyyy format. Example: "01/01/2024".'),
        end_date: z
            .string()
            .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'end_date must be in dd/mm/yyyy format.')
            .optional()
            .describe('End of the date range to filter orders, in dd/mm/yyyy format. Example: "31/01/2024".'),
        cursor: z.string().optional().describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        per_page: z.number().int().min(1).max(100).optional().describe('Number of orders per page. Maximum 100, default 10.')
    })
    .describe('Input for listing orders from Judge.me.');

const OrderSchema = z
    .object({
        id: z.number().describe('Order ID.'),
        name: z.string().nullable().optional().describe('Order name.'),
        external_id: z.union([z.string(), z.number()]).nullable().optional().describe('External order ID from the shop platform.'),
        fulfilled_at: z.string().nullable().optional().describe('Date when the order was fulfilled.'),
        fulfillment_status: z.string().nullable().optional().describe('Fulfillment status of the order.'),
        cancelled_at: z.string().nullable().optional().describe('Date when the order was cancelled.'),
        country: z.string().nullable().optional().describe('Country of the order.'),
        reviewer_id: z.number().nullable().optional().describe('Reviewer ID associated with the order.'),
        created_at: z.string().optional().describe('Date when the order was created.'),
        updated_at: z.string().optional().describe('Date when the order was last updated.')
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    start_date: z.string(),
    end_date: z.string(),
    current_page: z.number(),
    per_page: z.number(),
    orders: z.array(z.unknown())
});

const OutputSchema = z
    .object({
        start_date: z.string().describe('Start of the date range covered by this response.'),
        end_date: z.string().describe('End of the date range covered by this response.'),
        current_page: z.number().describe('Current page number returned.'),
        per_page: z.number().describe('Number of orders returned per page.'),
        orders: z.array(OrderSchema).describe('Array of orders known to Judge.me for this shop.'),
        next_cursor: z.string().optional().describe('Pagination cursor for the next page if more orders are available.')
    })
    .describe('Output for listing orders from Judge.me.');

/**
 * @tags: [read]
 * @tagReason: Reads order data from Judge.me via the Public API.
 * @pitfalls: Response dates are formatted as dd/mm/yyyy instead of ISO 8601, and omitting start_date and end_date causes the API to use a default rolling 30-day window.
 */
const action = createAction({
    description: 'List orders known to Judge.me for this shop within a date range.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const page = input.cursor !== undefined ? Number(input.cursor) : 1;
        if (!Number.isInteger(page) || page < 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'cursor must be a positive integer string.'
            });
        }

        const config: ProxyConfiguration = {
            // https://judge.me/api/docs
            endpoint: '/api/v1/orders',
            params: {
                ...(input.start_date !== undefined && { start_date: input.start_date }),
                ...(input.end_date !== undefined && { end_date: input.end_date }),
                page: String(page),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        };

        const response = await nango.get(config);

        const rawData = ProviderResponseSchema.parse(response.data);

        const orders = rawData.orders.map((order: unknown) => OrderSchema.parse(order));

        return {
            start_date: rawData.start_date,
            end_date: rawData.end_date,
            current_page: rawData.current_page,
            per_page: rawData.per_page,
            orders,
            ...(orders.length === rawData.per_page && { next_cursor: String(rawData.current_page + 1) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
