import { z } from 'zod';
import { createAction } from 'nango';

const MailingAddressInputSchema = z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    company: z.string().optional(),
    countryCode: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
    provinceCode: z.string().optional(),
    zip: z.string().optional()
});

const AttributeInputSchema = z.object({
    key: z.string(),
    value: z.string()
});

const InputSchema = z.object({
    id: z.string().describe('The ID of the order to update. Example: "gid://shopify/Order/123456789"'),
    email: z.string().optional().describe('A new customer email address for the order. Overwrites the existing email address.'),
    note: z.string().optional().describe('The new contents for the note associated with the order. Overwrites the existing note.'),
    poNumber: z.string().optional().describe('The new purchase order number for the order.'),
    tags: z.array(z.string()).optional().describe('A new list of tags for the order. Overwrites the existing tags.'),
    shippingAddress: MailingAddressInputSchema.optional().describe('The new shipping address for the order. Overwrites the existing shipping address.'),
    customAttributes: z
        .array(AttributeInputSchema)
        .optional()
        .describe('A new list of custom attributes for the order. Overwrites the existing custom attributes.')
});

const UserErrorSchema = z.object({
    field: z.array(z.string()).optional(),
    message: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Update editable Shopify order fields.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-order',
        group: 'Orders'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_orders'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const query = `
            mutation OrderUpdate($input: OrderInput!) {
                orderUpdate(input: $input) {
                    userErrors {
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            input: {
                id: input.id,
                ...(input.email !== undefined && { email: input.email }),
                ...(input.note !== undefined && { note: input.note }),
                ...(input.poNumber !== undefined && { poNumber: input.poNumber }),
                ...(input.tags !== undefined && { tags: input.tags }),
                ...(input.shippingAddress !== undefined && { shippingAddress: input.shippingAddress }),
                ...(input.customAttributes !== undefined && { customAttributes: input.customAttributes })
            }
        };

        // https://shopify.dev/docs/api/admin-graphql/2025-07/mutations/orderUpdate
        const response = await nango.post({
            endpoint: '/admin/api/2025-07/graphql.json',
            data: {
                query,
                variables
            },
            headers: {
                'Content-Type': 'application/json'
            },
            retries: 3
        });

        const responseData = z
            .object({
                data: z.object({
                    orderUpdate: z.object({
                        userErrors: z.array(UserErrorSchema)
                    })
                })
            })
            .parse(response.data);

        const orderUpdate = responseData.data.orderUpdate;

        if (orderUpdate.userErrors.length > 0) {
            throw new nango.ActionError({
                type: 'shopify_user_error',
                message: 'Shopify returned user errors when updating the order',
                userErrors: orderUpdate.userErrors
            });
        }

        return {
            id: input.id,
            userErrors: orderUpdate.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
