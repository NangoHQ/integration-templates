import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.number().describe('WooCommerce order ID. Example: 18'),
    type: z.enum(['any', 'customer', 'internal']).optional().describe('Limit result to customers or internal notes. Default is any.'),
    context: z.enum(['view', 'edit']).optional().describe('Scope under which the request is made. Default is view.')
});

const OrderNoteSchema = z.object({
    id: z.number(),
    author: z.string().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    note: z.string().optional(),
    customer_note: z.boolean().optional(),
    added_by_user: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(OrderNoteSchema)
});

const action = createAction({
    description: 'List notes for a WooCommerce order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://woocommerce.github.io/woocommerce-rest-api-docs/#list-all-order-notes
        const response = await nango.get({
            endpoint: `wp-json/wc/v3/orders/${encodeURIComponent(String(input.order_id))}/notes`,
            params: {
                ...(input.type !== undefined && { type: input.type }),
                ...(input.context !== undefined && { context: input.context })
            },
            retries: 3
        });

        if (!Array.isArray(response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Expected an array of order notes from the WooCommerce API.'
            });
        }

        const items = response.data.map((note: unknown) => {
            const parsed = OrderNoteSchema.safeParse(note);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Order note did not match expected schema.',
                    details: parsed.error.format()
                });
            }
            return parsed.data;
        });

        return { items };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
