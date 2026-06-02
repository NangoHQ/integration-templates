import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoice_item_id: z.string().describe('The ID of the invoice item to delete. Example: ii_xxx')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    object: z.string(),
    deleted: z.boolean()
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete an invoice item from Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-invoice-item',
        group: 'Invoice Items'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.stripe.com/api/invoiceitems/delete
        const response = await nango.delete({
            endpoint: `/v1/invoiceitems/${encodeURIComponent(input.invoice_item_id)}`,
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            deleted: providerResponse.deleted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
