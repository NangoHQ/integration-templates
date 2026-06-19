import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Customer ID to delete. Example: "AzqOd0VMyVlxMaL6"')
});

const ProviderCustomerSchema = z.object({
    id: z.string(),
    deleted: z.boolean().optional(),
    first_name: z.string().optional().nullable(),
    last_name: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    company: z.string().optional().nullable()
});

const OutputSchema = z.object({
    id: z.string(),
    deleted: z.boolean(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    company: z.string().optional()
});

const action = createAction({
    description: 'Delete (soft-delete/archive) a customer. Customer must have no active subscriptions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const deleteResponse = await nango.post({
            // https://apidocs.chargebee.com/docs/api/customers/delete-a-customer
            endpoint: `/api/v2/customers/${encodeURIComponent(input.id)}/delete`,
            retries: 3
        });

        const deleteWrapper = z.object({ customer: ProviderCustomerSchema }).parse(deleteResponse.data);
        const customer = deleteWrapper.customer;

        let verifiedDeleted = false;
        // @allowTryCatch Chargebee returns 404 for deleted customers, which confirms deletion.
        try {
            const getResponse = await nango.get({
                // https://apidocs.chargebee.com/docs/api/customers
                endpoint: `/api/v2/customers/${encodeURIComponent(input.id)}`,
                retries: 3
            });

            const getWrapper = z.object({ customer: ProviderCustomerSchema }).parse(getResponse.data);
            verifiedDeleted = getWrapper.customer.deleted === true;
        } catch (_error) {
            verifiedDeleted = true;
        }

        return {
            id: customer.id,
            deleted: verifiedDeleted,
            ...(customer.first_name != null && { first_name: customer.first_name }),
            ...(customer.last_name != null && { last_name: customer.last_name }),
            ...(customer.email != null && { email: customer.email }),
            ...(customer.company != null && { company: customer.company })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
