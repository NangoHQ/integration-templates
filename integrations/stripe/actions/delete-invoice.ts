import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the draft invoice to delete. Example: "in_1TbSq0EZpD6kXraeoLevMdFv"')
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
    description: 'Delete or archive a invoice in Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-invoice',
        group: 'Invoices'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://docs.stripe.com/api/invoices/delete
            endpoint: `/v1/invoices/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.delete(config);

        const providerData = ProviderResponseSchema.parse(response.data);

        return {
            id: providerData.id,
            deleted: providerData.deleted
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
