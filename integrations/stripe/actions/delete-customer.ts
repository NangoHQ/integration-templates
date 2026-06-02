import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Stripe Customer ID. Example: "cus_123"')
});

const ProviderResponseSchema = z.object({
    id: z.string(),
    object: z.string().optional(),
    deleted: z.boolean().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean().optional()
});

const action = createAction({
    description: 'Delete or archive a customer in Stripe.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-customer',
        group: 'Customers'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.stripe.com/api/customers/delete
            endpoint: `/v1/customers/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id,
            ...(providerResponse.deleted !== undefined && { deleted: providerResponse.deleted })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
