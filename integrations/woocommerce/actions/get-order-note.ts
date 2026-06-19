import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.number().describe('Order ID. Example: 18'),
    id: z.number().describe('Order note ID. Example: 2')
});

const ProviderOrderNoteSchema = z.object({
    id: z.number(),
    author: z.string().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    note: z.string().optional(),
    customer_note: z.boolean().optional(),
    added_by_user: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    author: z.string().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    note: z.string().optional(),
    customer_note: z.boolean().optional(),
    added_by_user: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single order note from WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#retrieve-an-order-note
            endpoint: `/wp-json/wc/v3/orders/${encodeURIComponent(String(input.order_id))}/notes/${encodeURIComponent(String(input.id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Order note not found',
                order_id: input.order_id,
                id: input.id
            });
        }

        const providerNote = ProviderOrderNoteSchema.parse(response.data);

        return {
            id: providerNote.id,
            ...(providerNote.author !== undefined && { author: providerNote.author }),
            ...(providerNote.date_created !== undefined && { date_created: providerNote.date_created }),
            ...(providerNote.date_created_gmt !== undefined && { date_created_gmt: providerNote.date_created_gmt }),
            ...(providerNote.note !== undefined && { note: providerNote.note }),
            ...(providerNote.customer_note !== undefined && { customer_note: providerNote.customer_note }),
            ...(providerNote.added_by_user !== undefined && { added_by_user: providerNote.added_by_user })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
