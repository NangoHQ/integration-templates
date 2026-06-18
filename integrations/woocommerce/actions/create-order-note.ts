import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    order_id: z.number().describe('Order ID. Example: 18'),
    note: z.string().describe('Order note content.'),
    customer_note: z.boolean().optional().describe('If true, the note will be shown to customers and they will be notified. Default is false.'),
    added_by_user: z.boolean().optional().describe('If true, this note will be attributed to the current user. Default is false.')
});

const ProviderOrderNoteSchema = z.object({
    id: z.number(),
    author: z.string().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    note: z.string(),
    customer_note: z.boolean().optional(),
    added_by_user: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    author: z.string().optional(),
    date_created: z.string().optional(),
    date_created_gmt: z.string().optional(),
    note: z.string(),
    customer_note: z.boolean().optional(),
    added_by_user: z.boolean().optional()
});

const action = createAction({
    description: 'Create a note on a WooCommerce order.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#order-notes
            endpoint: `/wp-json/wc/v3/orders/${encodeURIComponent(String(input.order_id))}/notes`,
            data: {
                note: input.note,
                ...(input.customer_note !== undefined && { customer_note: input.customer_note }),
                ...(input.added_by_user !== undefined && { added_by_user: input.added_by_user })
            },
            retries: 10
        });

        const providerNote = ProviderOrderNoteSchema.parse(response.data);

        return {
            id: providerNote.id,
            ...(providerNote.author !== undefined && { author: providerNote.author }),
            ...(providerNote.date_created !== undefined && { date_created: providerNote.date_created }),
            ...(providerNote.date_created_gmt !== undefined && { date_created_gmt: providerNote.date_created_gmt }),
            note: providerNote.note,
            ...(providerNote.customer_note !== undefined && { customer_note: providerNote.customer_note }),
            ...(providerNote.added_by_user !== undefined && { added_by_user: providerNote.added_by_user })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
