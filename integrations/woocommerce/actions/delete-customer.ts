import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.number().describe('Customer ID to delete. Example: 3')
});

const ProviderCustomerSchema = z
    .object({
        id: z.number(),
        email: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.number(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    deleted: z.boolean()
});

const action = createAction({
    description: 'Delete or archive a customer in WooCommerce.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-customer',
        group: 'Customers'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read_customers', 'write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://woocommerce.github.io/woocommerce-rest-api-docs/#delete-a-customer
        const response = await nango.delete({
            endpoint: `/wp-json/wc/v3/customers/${encodeURIComponent(String(input.id))}`,
            params: {
                force: 'true'
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Customer with id ${input.id} not found or could not be deleted.`,
                id: input.id
            });
        }

        const providerCustomer = ProviderCustomerSchema.parse(response.data);

        return {
            id: providerCustomer.id,
            ...(providerCustomer.email != null && { email: providerCustomer.email }),
            ...(providerCustomer.first_name != null && { first_name: providerCustomer.first_name }),
            ...(providerCustomer.last_name != null && { last_name: providerCustomer.last_name }),
            deleted: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
