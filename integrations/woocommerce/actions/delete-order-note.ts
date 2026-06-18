import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.number().describe('Order ID. Example: 18'),
    id: z.number().describe('Order note ID. Example: 4')
});

const ProviderOrderNoteSchema = z.object({
    id: z.number(),
    order_id: z.number().optional(),
    note: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    order_id: z.number(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete a note from a WooCommerce order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read', 'write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const orderId = input.order_id;
        const noteId = input.id;

        // https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-an-order-note
        const response = await nango.delete({
            endpoint: `/wp-json/wc/v3/orders/${encodeURIComponent(String(orderId))}/notes/${encodeURIComponent(String(noteId))}`,
            params: {
                force: 'true'
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Order note ${noteId} not found on order ${orderId}.`
            });
        }

        const providerNote = ProviderOrderNoteSchema.parse(response.data);

        return {
            id: providerNote.id,
            order_id: providerNote.order_id ?? orderId,
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
