import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customer_id: z.string().describe('The Shopify customer GID. Example: "gid://shopify/Customer/1234567890"'),
    address_id: z.string().describe('The Shopify mailing address GID to delete. Example: "gid://shopify/MailingAddress/1234567890"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        customerAddressDelete: z
            .object({
                deletedAddressId: z.string().nullable().optional(),
                userErrors: z.array(
                    z.object({
                        field: z.array(z.string()).optional(),
                        message: z.string()
                    })
                )
            })
            .nullable()
            .optional()
    }),
    errors: z
        .array(
            z.object({
                message: z.string()
            })
        )
        .optional()
});

const OutputSchema = z.object({
    deleted_address_id: z.string().optional()
});

const action = createAction({
    description: 'Delete an address from a Shopify customer.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-customer-address',
        group: 'Customers'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_customers'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/2025-07/mutations/customerAddressDelete
            endpoint: '/admin/api/2025-07/graphql.json',
            data: {
                query: `mutation customerAddressDelete($customerId: ID!, $addressId: ID!) {
                    customerAddressDelete(customerId: $customerId, addressId: $addressId) {
                        deletedAddressId
                        userErrors {
                            field
                            message
                        }
                    }
                }`,
                variables: {
                    customerId: input.customer_id,
                    addressId: input.address_id
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.errors && providerResponse.errors.length > 0) {
            throw new nango.ActionError({
                type: 'graphql_error',
                message: providerResponse.errors.map((error) => error.message).join('; ')
            });
        }

        const payload = providerResponse.data.customerAddressDelete;

        if (!payload) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Customer or address not found. The customerAddressDelete mutation returned null.'
            });
        }

        if (payload.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: payload.userErrors.map((error) => error.message).join('; ')
            });
        }

        return {
            ...(payload.deletedAddressId != null && { deleted_address_id: payload.deletedAddressId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
