import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Order ID. Example: 24'),
    force: z.boolean().optional().describe('Whether to permanently delete the order. Defaults to false (trash/archive).')
});

const ProviderOrderSchema = z.object({
    id: z.number(),
    status: z.string(),
    number: z.string().optional(),
    total: z.string().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    status: z.string(),
    number: z.string().optional(),
    total: z.string().optional(),
    date_created: z.string().optional(),
    date_modified: z.string().optional()
});

const action = createAction({
    description: 'Delete or archive a order in WooCommerce.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-an-order
            endpoint: `/wp-json/wc/v3/orders/${encodeURIComponent(String(input.id))}`,
            params: {
                ...(input.force !== undefined && { force: String(input.force) })
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Order not found or could not be deleted',
                id: input.id
            });
        }

        const providerOrder = ProviderOrderSchema.parse(response.data);

        return {
            id: providerOrder.id,
            status: providerOrder.status,
            ...(providerOrder.number !== undefined && { number: providerOrder.number }),
            ...(providerOrder.total !== undefined && { total: providerOrder.total }),
            ...(providerOrder.date_created !== undefined && { date_created: providerOrder.date_created }),
            ...(providerOrder.date_modified !== undefined && { date_modified: providerOrder.date_modified })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
